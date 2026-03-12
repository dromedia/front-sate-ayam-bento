"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getApiData, postApiData } from "../../lib/api";
import styles from "./page.module.css";

type VariantRecord = {
  id: number;
  variant_name: string;
  extra_price: number | string;
};

type ProductRecord = {
  id: number;
  name: string;
  description: string;
  category: string;
  base_price: number | string;
  image_url?: string | null;
  variants?: VariantRecord[];
};

type PaymentMethodRecord = {
  id: number;
  name: string;
  type: string;
};

type MenuPayload = {
  data: {
    brand: {
      name: string;
      tagline: string;
    };
    categories: string[];
    products: ProductRecord[];
    payment_methods: PaymentMethodRecord[];
  };
};

type PreviewPayload = {
  data: {
    summary: {
      total: number;
    };
  };
};

type OrderRecord = {
  id: number;
  status: string;
  order_date: string | null;
  order_type: string;
  total: number;
  items_count: number;
  items_preview: string[];
  customer_name: string;
  customer_phone_number: string | null;
};

type OrdersPayload = {
  data: {
    orders: OrderRecord[];
  };
};

type SubmitPayload = {
  data: {
    whatsapp_url: string;
  };
};

type CartLine = {
  key: string;
  product_id: number;
  product_name: string;
  description: string;
  image_url?: string | null;
  variant_id: number | null;
  variant_name: string | null;
  unit_price: number;
  extra_price: number;
  quantity: number;
};

type ViewMode = "menu" | "orders" | "favorites" | "profile" | "cart" | "review";

type OrderType = "delivery" | "takeaway";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80";
const CART_STORAGE_KEY = "sate-ayam-bento:online-order-cart:v1";
const FAVORITES_STORAGE_KEY = "sate-ayam-bento:online-order-favorites:v1";
const GUEST_SESSION_STORAGE_KEY =
  "sate-ayam-bento:online-order-guest-session:v1";

function toNumber(value: number | string): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function cartKey(productId: number, variantId: number | null): string {
  return `${productId}:${variantId ?? "base"}`;
}

function getOrCreateGuestSessionId(): string {
  try {
    const current = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    if (current && /^[A-Za-z0-9-]+$/.test(current)) {
      return current;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to read guest session id", error);
    }
  }

  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `guest-${Date.now()}`;

  try {
    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, generated);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to persist guest session id", error);
    }
  }

  return generated;
}

function normalizeCartLines(input: unknown): CartLine[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const restored: CartLine[] = [];

  for (const entry of input) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const productId = Number(record.product_id);
    const quantity = Math.max(1, Math.floor(Number(record.quantity)));
    const variantIdRaw = record.variant_id;
    const variantId =
      variantIdRaw === null || variantIdRaw === undefined
        ? null
        : Number(variantIdRaw);
    const unitPrice = Number(record.unit_price);
    const extraPrice = Number(record.extra_price);

    if (!Number.isFinite(productId) || !Number.isFinite(quantity)) {
      continue;
    }

    if (!Number.isFinite(unitPrice) || !Number.isFinite(extraPrice)) {
      continue;
    }

    if (variantId !== null && !Number.isFinite(variantId)) {
      continue;
    }

    const productName =
      typeof record.product_name === "string" ? record.product_name : "Produk";
    const description =
      typeof record.description === "string" ? record.description : "";
    const variantName =
      typeof record.variant_name === "string" ? record.variant_name : null;
    const imageUrl =
      typeof record.image_url === "string" || record.image_url === null
        ? (record.image_url as string | null)
        : null;

    restored.push({
      key:
        typeof record.key === "string"
          ? record.key
          : cartKey(productId, variantId),
      product_id: productId,
      product_name: productName,
      description,
      image_url: imageUrl,
      variant_id: variantId,
      variant_name: variantName,
      unit_price: unitPrice,
      extra_price: extraPrice,
      quantity,
    });
  }

  return restored;
}

function normalizeFavoriteProductIds(input: unknown): number[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const ids = input
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);

  return Array.from(new Set(ids));
}

function categoryEmoji(category: string): string {
  const value = category.toLowerCase();

  if (value.includes("burger") || value.includes("sandwich")) {
    return "🍔";
  }

  if (
    value.includes("minum") ||
    value.includes("drink") ||
    value.includes("kopi") ||
    value.includes("tea")
  ) {
    return "🥤";
  }

  if (value.includes("ayam") || value.includes("chicken")) {
    return "🍗";
  }

  if (value.includes("snack") || value.includes("cemilan")) {
    return "🥟";
  }

  if (
    value.includes("dessert") ||
    value.includes("cake") ||
    value.includes("manis")
  ) {
    return "🍰";
  }

  return "🍽️";
}

function isOnlinePaymentMethod(method: PaymentMethodRecord): boolean {
  const type = method.type.toLowerCase();
  const name = method.name.toLowerCase();

  if (type === "cash" || type === "card") {
    return false;
  }

  return (
    !name.includes("tunai") &&
    !name.includes("debit") &&
    !name.includes("kredit")
  );
}

function formatOrderDate(value: string | null): string {
  if (!value) {
    return "Waktu belum tersedia";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export default function OrderOnlinePage(): JSX.Element {
  const [view, setView] = useState<ViewMode>("menu");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<MenuPayload["data"] | null>(null);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [detailProduct, setDetailProduct] = useState<ProductRecord | null>(
    null,
  );
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null,
  );
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    number | null
  >(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState("");
  const [ordersPhoneNumber, setOrdersPhoneNumber] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [previewSummary, setPreviewSummary] = useState<
    PreviewPayload["data"]["summary"] | null
  >(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const persisted = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!persisted) {
        const persistedFavorites = window.localStorage.getItem(
          FAVORITES_STORAGE_KEY,
        );
        if (!persistedFavorites) {
          return;
        }

        const parsedFavorites = JSON.parse(persistedFavorites) as unknown;
        setFavoriteProductIds(normalizeFavoriteProductIds(parsedFavorites));

        return;
      }

      const parsed = JSON.parse(persisted) as unknown;
      const restored = normalizeCartLines(parsed);
      if (restored.length > 0) {
        setCartLines(restored);
      }

      const persistedFavorites = window.localStorage.getItem(
        FAVORITES_STORAGE_KEY,
      );
      if (persistedFavorites) {
        const parsedFavorites = JSON.parse(persistedFavorites) as unknown;
        setFavoriteProductIds(normalizeFavoriteProductIds(parsedFavorites));
      }
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      if (cartLines.length === 0) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartLines));
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to persist online-order cart", error);
      }
    }
  }, [cartLines]);

  useEffect(() => {
    try {
      if (favoriteProductIds.length === 0) {
        window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(favoriteProductIds),
      );
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to persist online-order favorites", error);
      }
    }
  }, [favoriteProductIds]);

  useEffect(() => {
    async function fetchMenu(): Promise<void> {
      try {
        setLoading(true);
        const response = await getApiData<MenuPayload>("/online-order/menu");
        setMenuData(response.data);
        const availableMethods = response.data.payment_methods.filter(
          isOnlinePaymentMethod,
        );
        setSelectedPaymentMethodId(availableMethods[0]?.id ?? null);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memuat menu online.",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchMenu();
  }, []);

  useEffect(() => {
    if (!menuData) {
      return;
    }

    const availableCategories = ["Semua", ...menuData.categories];
    if (!availableCategories.includes(activeCategory)) {
      setActiveCategory("Semua");
    }
  }, [menuData, activeCategory]);

  const onlinePaymentMethods = useMemo(
    () => (menuData?.payment_methods ?? []).filter(isOnlinePaymentMethod),
    [menuData?.payment_methods],
  );

  useEffect(() => {
    if (onlinePaymentMethods.length === 0) {
      setSelectedPaymentMethodId(null);
      return;
    }

    const isStillAvailable = onlinePaymentMethods.some(
      (method) => method.id === selectedPaymentMethodId,
    );

    if (!isStillAvailable) {
      setSelectedPaymentMethodId(onlinePaymentMethods[0].id);
    }
  }, [onlinePaymentMethods, selectedPaymentMethodId]);

  useEffect(() => {
    if (cartLines.length === 0) {
      setPreviewSummary(null);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const response = await postApiData<PreviewPayload>(
            "/online-order/preview",
            {
              items: cartLines.map((line) => ({
                product_id: line.product_id,
                variant_id: line.variant_id,
                quantity: line.quantity,
              })),
            },
          );

          if (!isCancelled) {
            setPreviewSummary(response.data.summary);
          }
        } catch {
          if (!isCancelled) {
            setPreviewSummary(null);
          }
        }
      })();
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [cartLines]);

  const filteredProducts = useMemo(() => {
    if (!menuData) {
      return [];
    }

    return menuData.products.filter((product) => {
      const categoryMatch =
        activeCategory === "Semua" || product.category === activeCategory;
      const query = searchQuery.trim().toLowerCase();
      const queryMatch =
        query === "" ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);

      return categoryMatch && queryMatch;
    });
  }, [menuData, activeCategory, searchQuery]);

  const favoriteProducts = useMemo(() => {
    if (!menuData) {
      return [];
    }

    const favoriteIdSet = new Set(favoriteProductIds);
    return menuData.products.filter((product) => favoriteIdSet.has(product.id));
  }, [menuData, favoriteProductIds]);

  const itemCount = useMemo(
    () => cartLines.reduce((total, line) => total + line.quantity, 0),
    [cartLines],
  );

  const localSubtotal = useMemo(
    () =>
      cartLines.reduce(
        (total, line) =>
          total + (line.unit_price + line.extra_price) * line.quantity,
        0,
      ),
    [cartLines],
  );

  const totalAmount = previewSummary?.total ?? localSubtotal;

  const categories = useMemo(
    () => ["Semua", ...(menuData?.categories ?? [])],
    [menuData?.categories],
  );

  const selectedVariant = useMemo(() => {
    if (!detailProduct) {
      return null;
    }

    return (
      detailProduct.variants?.find(
        (variant) => variant.id === selectedVariantId,
      ) ?? null
    );
  }, [detailProduct, selectedVariantId]);

  function openDetail(product: ProductRecord): void {
    setDetailProduct(product);
    setSelectedVariantId(product.variants?.[0]?.id ?? null);
  }

  function closeDetail(): void {
    setDetailProduct(null);
    setSelectedVariantId(null);
  }

  function isFavorite(productId: number): boolean {
    return favoriteProductIds.includes(productId);
  }

  function toggleFavorite(productId: number): void {
    setFavoriteProductIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }

      return [...current, productId];
    });
  }

  function openFavoritesView(): void {
    setView("favorites");
  }

  function openProfileView(): void {
    setView("profile");
  }

  function addToCart(product: ProductRecord, variantId: number | null): void {
    const variant =
      product.variants?.find((entry) => entry.id === variantId) ?? null;
    const key = cartKey(product.id, variant?.id ?? null);

    setCartLines((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }

      return [
        ...current,
        {
          key,
          product_id: product.id,
          product_name: product.name,
          description: product.description,
          image_url: product.image_url,
          variant_id: variant?.id ?? null,
          variant_name: variant?.variant_name ?? null,
          unit_price: toNumber(product.base_price),
          extra_price: toNumber(variant?.extra_price ?? 0),
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(key: string, nextQuantity: number): void {
    if (nextQuantity <= 0) {
      setCartLines((current) => current.filter((line) => line.key !== key));
      return;
    }

    setCartLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, quantity: nextQuantity } : line,
      ),
    );
  }

  async function submitOrderViaWhatsApp(): Promise<void> {
    if (!customerName.trim() || !customerPhoneNumber.trim()) {
      setErrorMessage("Nama dan nomor HP wajib diisi sebelum checkout.");
      return;
    }

    if (cartLines.length === 0) {
      setErrorMessage("Keranjang masih kosong.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await postApiData<SubmitPayload>(
        "/online-order/submit",
        {
          customer_name: customerName.trim(),
          customer_phone_number: customerPhoneNumber.trim(),
          guest_session_id: getOrCreateGuestSessionId(),
          customer_address: customerAddress.trim() || null,
          payment_method_id: selectedPaymentMethodId,
          order_type: orderType,
          notes: specialInstructions.trim() || null,
          items: cartLines.map((line) => ({
            product_id: line.product_id,
            variant_id: line.variant_id,
            quantity: line.quantity,
          })),
        },
      );

      if (!response.data.whatsapp_url) {
        throw new Error("Tautan WhatsApp tidak tersedia.");
      }

      setCartLines([]);
      setSpecialInstructions("");
      try {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to clear online-order cart", error);
        }
      }

      window.location.assign(response.data.whatsapp_url);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Checkout gagal diproses.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function loadOrders(): Promise<void> {
    const phoneNumber = (ordersPhoneNumber || customerPhoneNumber).trim();
    if (!phoneNumber) {
      setOrderHistory([]);
      setErrorMessage("Masukkan nomor WhatsApp untuk melihat order Anda.");
      return;
    }

    setOrdersLoading(true);
    setErrorMessage(null);

    try {
      const guestSessionId = getOrCreateGuestSessionId();
      const query = `?phone_number=${encodeURIComponent(phoneNumber)}`;

      const response = await getApiData<OrdersPayload>(
        `/online-order/orders${query}&guest_session_id=${encodeURIComponent(guestSessionId)}`,
      );

      setOrderHistory(response.data.orders);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal memuat riwayat order.",
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  function openOrdersView(): void {
    const candidatePhone = (ordersPhoneNumber || customerPhoneNumber).trim();
    if (!ordersPhoneNumber && customerPhoneNumber.trim()) {
      setOrdersPhoneNumber(customerPhoneNumber.trim());
    }

    setView("orders");

    if (candidatePhone) {
      void loadOrders();
      return;
    }

    setOrderHistory([]);
    setErrorMessage("Masukkan nomor WhatsApp untuk melihat order Anda.");
  }

  if (loading) {
    return (
      <main className={`${styles.page} ${styles.pageLoading}`}>
        <div className={styles.loadingState}>
          <div className={styles.loadingLogoWrap}>
            <Image
              src="/assets/logo.png"
              alt="Sate Ayam Bento"
              width={720}
              height={720}
              className={styles.loadingLogo}
              priority
            />
          </div>
          <p className={styles.loadingCaption}>Loading...</p>
        </div>
      </main>
    );
  }

  if (!menuData) {
    return (
      <main className={styles.page}>
        <div className={styles.centerNotice}>
          {errorMessage ?? "Data menu tidak tersedia."}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        {view === "menu" && (
          <>
            <header className={styles.topBar}>
              <div className={styles.profileChip}>
                <div className={styles.avatarBubble}>
                  <Image
                    src="/assets/logo.png"
                    alt="Sate Ayam Bento"
                    width={40}
                    height={40}
                    className={styles.avatarLogo}
                  />
                </div>
                <div>
                  <p className={styles.welcomeText}>Welcome Back</p>
                  <h1 className={styles.brandTitle}>
                    {customerName.trim() || "Guest"}
                  </h1>
                </div>
              </div>
              <button
                type="button"
                className={styles.iconCircle}
                aria-label="Notifikasi"
              >
                <span>🔔</span>
              </button>
            </header>

            <section className={styles.searchRow}>
              <div className={styles.searchBarWrap}>
                <input
                  type="search"
                  className={styles.searchField}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search any foods"
                />
              </div>
            </section>

            <section className={styles.promoBanner}>
              <div>
                <p className={styles.promoOverline}>
                  Khusus Area GRV, Tanjung Bunga
                </p>
                <h2>Free Delivery</h2>
                <button type="button" className={styles.promoButton}>
                  Shop Now
                </button>
              </div>
              <div className={styles.promoArt}>🍟</div>
            </section>

            <div className={styles.sectionHeadRow}>
              <h2 className={styles.sectionTitle}>Categories</h2>
              <button type="button" className={styles.seeAllButton}>
                See all
              </button>
            </div>

            <nav className={styles.categoryTabs}>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={
                    activeCategory === category
                      ? `${styles.tabButton} ${styles.tabButtonActive}`
                      : styles.tabButton
                  }
                  onClick={() => setActiveCategory(category)}
                >
                  <span>{categoryEmoji(category)}</span>
                  <span>{category}</span>
                </button>
              ))}
            </nav>

            <div className={styles.sectionHead}>
              <h2>
                {activeCategory === "Semua" ? "Popular Foods" : activeCategory}
              </h2>
              <span>{filteredProducts.length} items</span>
            </div>

            <div className={styles.productGrid}>
              {filteredProducts.map((product, index) => (
                <article key={product.id} className={styles.productCard}>
                  <div className={styles.cardHead}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    <button
                      type="button"
                      className={
                        isFavorite(product.id)
                          ? `${styles.favoriteButton} ${styles.favoriteButtonActive}`
                          : styles.favoriteButton
                      }
                      onClick={() => toggleFavorite(product.id)}
                      aria-label={
                        isFavorite(product.id)
                          ? "Hapus dari favorit"
                          : "Tambah favorit"
                      }
                    >
                      {isFavorite(product.id) ? "❤" : "♡"}
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.productImageWrap}
                    onClick={() => openDetail(product)}
                  >
                    <img
                      src={product.image_url || FALLBACK_IMAGE}
                      alt={product.name}
                      className={styles.productImage}
                    />
                    {(index < 2 || (product.variants?.length ?? 0) > 1) && (
                      <span className={styles.badge}>
                        {index === 0 ? "HOT" : "NEW"}
                      </span>
                    )}
                  </button>

                  <div className={styles.cardMeta}>
                    <span className={styles.metaText}>
                      🔥{" "}
                      {Math.max(
                        120,
                        Math.round(toNumber(product.base_price) / 180),
                      )}{" "}
                      Kal
                    </span>
                    <p className={styles.productPrice}>
                      {formatCurrency(toNumber(product.base_price))}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={styles.addInlineButton}
                    onClick={() =>
                      addToCart(product, product.variants?.[0]?.id ?? null)
                    }
                  >
                    + Add
                  </button>
                </article>
              ))}
            </div>

            <footer className={styles.bottomNav}>
              <button
                type="button"
                className={`${styles.navItem} ${styles.navItemActive}`}
                onClick={() => setView("menu")}
              >
                Menu
              </button>
              <button
                type="button"
                className={styles.navItem}
                onClick={openOrdersView}
              >
                Orders
              </button>
              <button
                type="button"
                className={styles.floatingCart}
                onClick={() => setView("cart")}
                aria-label="Buka keranjang"
              >
                <span className={styles.cartBadge}>{itemCount}</span>
                <span className={styles.floatingCartIcon} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.navItem}
                onClick={openFavoritesView}
              >
                Favorite
              </button>
              <button
                type="button"
                className={styles.navItem}
                onClick={openProfileView}
              >
                Profile
              </button>
            </footer>
          </>
        )}

        {view === "orders" && (
          <>
            <header className={styles.simpleHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setView("menu")}
              >
                Back
              </button>
              <h2>Orders</h2>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => void loadOrders()}
              >
                Refresh
              </button>
            </header>

            <section className={styles.ordersFilter}>
              <label htmlFor="orders-phone">No. WhatsApp</label>
              <div className={styles.ordersFilterRow}>
                <input
                  id="orders-phone"
                  type="tel"
                  value={ordersPhoneNumber}
                  onChange={(event) => setOrdersPhoneNumber(event.target.value)}
                  placeholder="Masukkan no HP untuk lihat order"
                />
                <button type="button" onClick={() => void loadOrders()}>
                  Cari
                </button>
              </div>
            </section>

            <section className={styles.ordersList}>
              {ordersLoading ? (
                <p className={styles.emptyState}>Memuat order...</p>
              ) : orderHistory.length === 0 ? (
                <p className={styles.emptyState}>
                  Belum ada order ditemukan untuk filter saat ini.
                </p>
              ) : (
                orderHistory.map((order) => {
                  const normalizedStatus = order.status.toLowerCase();
                  const statusClassName =
                    normalizedStatus === "completed"
                      ? styles.statusCompleted
                      : normalizedStatus === "processing"
                        ? styles.statusProcessing
                        : normalizedStatus === "cancelled"
                          ? styles.statusCancelled
                          : styles.statusPending;

                  return (
                    <article key={order.id} className={styles.orderCard}>
                      <div className={styles.orderCardHead}>
                        <div>
                          <h3>Order #{order.id}</h3>
                          <p>{formatOrderDate(order.order_date)}</p>
                        </div>
                        <span
                          className={`${styles.orderStatus} ${statusClassName}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      <p className={styles.orderMeta}>
                        {order.customer_name} • {order.items_count} item •{" "}
                        {order.order_type}
                      </p>
                      {order.items_preview.length > 0 && (
                        <p className={styles.orderItemsPreview}>
                          {order.items_preview.join(", ")}
                        </p>
                      )}
                      <strong className={styles.orderTotal}>
                        {formatCurrency(order.total)}
                      </strong>
                    </article>
                  );
                })
              )}
            </section>

            <footer className={styles.bottomNav}>
              <button
                type="button"
                className={styles.navItem}
                onClick={() => setView("menu")}
              >
                Menu
              </button>
              <button
                type="button"
                className={`${styles.navItem} ${styles.navItemActive}`}
                onClick={openOrdersView}
              >
                Orders
              </button>
              <button
                type="button"
                className={styles.floatingCart}
                onClick={() => setView("cart")}
                aria-label="Buka keranjang"
              >
                <span className={styles.cartBadge}>{itemCount}</span>
                <span className={styles.floatingCartIcon} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.navItem}
                onClick={openFavoritesView}
              >
                Favorite
              </button>
              <button
                type="button"
                className={styles.navItem}
                onClick={openProfileView}
              >
                Profile
              </button>
            </footer>
          </>
        )}

        {view === "favorites" && (
          <>
            <header className={styles.simpleHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setView("menu")}
              >
                Back
              </button>
              <h2>Favorites</h2>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => setFavoriteProductIds([])}
              >
                Clear
              </button>
            </header>

            <section className={styles.favoritesIntro}>
              <p>Menu yang Anda like akan tampil di sini.</p>
              <strong>{favoriteProducts.length} produk favorit</strong>
            </section>

            <section className={styles.favoritesGrid}>
              {favoriteProducts.length === 0 ? (
                <p className={styles.emptyState}>
                  Belum ada produk favorit. Klik ikon hati di menu untuk
                  menyimpan.
                </p>
              ) : (
                favoriteProducts.map((product) => (
                  <article key={product.id} className={styles.productCard}>
                    <div className={styles.cardHead}>
                      <h3 className={styles.productName}>{product.name}</h3>
                      <button
                        type="button"
                        className={`${styles.favoriteButton} ${styles.favoriteButtonActive}`}
                        onClick={() => toggleFavorite(product.id)}
                        aria-label="Hapus dari favorit"
                      >
                        ❤
                      </button>
                    </div>
                    <button
                      type="button"
                      className={styles.productImageWrap}
                      onClick={() => openDetail(product)}
                    >
                      <img
                        src={product.image_url || FALLBACK_IMAGE}
                        alt={product.name}
                        className={styles.productImage}
                      />
                    </button>

                    <div className={styles.cardMeta}>
                      <span className={styles.metaText}>
                        🔥{" "}
                        {Math.max(
                          120,
                          Math.round(toNumber(product.base_price) / 180),
                        )}{" "}
                        Kal
                      </span>
                      <p className={styles.productPrice}>
                        {formatCurrency(toNumber(product.base_price))}
                      </p>
                    </div>

                    <button
                      type="button"
                      className={styles.addInlineButton}
                      onClick={() =>
                        addToCart(product, product.variants?.[0]?.id ?? null)
                      }
                    >
                      + Add
                    </button>
                  </article>
                ))
              )}
            </section>

            <footer className={styles.bottomNav}>
              <button
                type="button"
                className={styles.navItem}
                onClick={() => setView("menu")}
              >
                Menu
              </button>
              <button
                type="button"
                className={styles.navItem}
                onClick={openOrdersView}
              >
                Orders
              </button>
              <button
                type="button"
                className={styles.floatingCart}
                onClick={() => setView("cart")}
                aria-label="Buka keranjang"
              >
                <span className={styles.cartBadge}>{itemCount}</span>
                <span className={styles.floatingCartIcon} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.navItem} ${styles.navItemActive}`}
                onClick={openFavoritesView}
              >
                Favorite
              </button>
              <button
                type="button"
                className={styles.navItem}
                onClick={openProfileView}
              >
                Profile
              </button>
            </footer>
          </>
        )}

        {view === "profile" && (
          <>
            <header className={styles.simpleHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setView("menu")}
              >
                Back
              </button>
              <h2>Profile</h2>
              <span />
            </header>

            <section className={styles.profileComingSoon}>
              <div className={styles.profileComingSoonIcon}>👤</div>
              <h3>Coming Soon</h3>
              <p>
                Halaman profile sedang disiapkan. Fitur ini akan segera tersedia
                di update berikutnya.
              </p>
            </section>

            <footer className={styles.bottomNav}>
              <button
                type="button"
                className={styles.navItem}
                onClick={() => setView("menu")}
              >
                Menu
              </button>
              <button
                type="button"
                className={styles.navItem}
                onClick={openOrdersView}
              >
                Orders
              </button>
              <button
                type="button"
                className={styles.floatingCart}
                onClick={() => setView("cart")}
                aria-label="Buka keranjang"
              >
                <span className={styles.cartBadge}>{itemCount}</span>
                <span className={styles.floatingCartIcon} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.navItem}
                onClick={openFavoritesView}
              >
                Favorite
              </button>
              <button
                type="button"
                className={`${styles.navItem} ${styles.navItemActive}`}
                onClick={openProfileView}
              >
                Profile
              </button>
            </footer>
          </>
        )}

        {view === "cart" && (
          <>
            <header className={styles.simpleHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setView("menu")}
              >
                Back
              </button>
              <h2>Your Cart</h2>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => setCartLines([])}
              >
                Clear
              </button>
            </header>

            <section className={styles.cartList}>
              {cartLines.length === 0 ? (
                <p className={styles.emptyState}>
                  Keranjang masih kosong. Tambahkan menu dulu.
                </p>
              ) : (
                cartLines.map((line) => (
                  <article key={line.key} className={styles.cartItem}>
                    <img
                      src={line.image_url || FALLBACK_IMAGE}
                      alt={line.product_name}
                      className={styles.cartImage}
                    />
                    <div className={styles.cartInfo}>
                      <h3>{line.product_name}</h3>
                      <p>{line.variant_name ?? line.description}</p>
                      <strong>
                        {formatCurrency(
                          (line.unit_price + line.extra_price) * line.quantity,
                        )}
                      </strong>
                    </div>
                    <div className={styles.stepper}>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(line.key, line.quantity - 1)
                        }
                        aria-label="Kurangi jumlah"
                      >
                        -
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(line.key, line.quantity + 1)
                        }
                        aria-label="Tambah jumlah"
                      >
                        +
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className={styles.instructions}>
              <h3>Special Instructions</h3>
              <textarea
                className={styles.textArea}
                value={specialInstructions}
                onChange={(event) => setSpecialInstructions(event.target.value)}
                placeholder="Contoh: tanpa bawang, sambal dipisah, es batu sedikit"
              />
            </section>

            <section className={styles.summaryBox}>
              <div className={styles.totalRow}>
                <span>Total</span>
                <strong>{formatCurrency(totalAmount)}</strong>
              </div>
            </section>

            <button
              type="button"
              className={styles.primaryCta}
              onClick={() => setView("review")}
              disabled={cartLines.length === 0}
            >
              Proceed to Checkout ({itemCount} items)
            </button>
          </>
        )}

        {view === "review" && (
          <>
            <header className={styles.simpleHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setView("cart")}
              >
                Back
              </button>
              <h2>Review Order</h2>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => setView("menu")}
              >
                Add more
              </button>
            </header>

            <section className={styles.reviewItems}>
              <h3>Your Items</h3>
              {cartLines.map((line) => (
                <article key={line.key} className={styles.reviewItem}>
                  <img
                    src={line.image_url || FALLBACK_IMAGE}
                    alt={line.product_name}
                    className={styles.reviewImage}
                  />
                  <div>
                    <h4>{line.product_name}</h4>
                    <p>
                      Qty: {line.quantity}
                      {line.variant_name ? ` - ${line.variant_name}` : ""}
                    </p>
                    <strong>
                      {formatCurrency(
                        (line.unit_price + line.extra_price) * line.quantity,
                      )}
                    </strong>
                  </div>
                </article>
              ))}
            </section>

            <section className={styles.customerForm}>
              <h3>Customer Details</h3>
              <label>
                Nama
                <input
                  type="text"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Masukkan nama pemesan"
                />
              </label>
              <label>
                No. WhatsApp
                <input
                  type="tel"
                  value={customerPhoneNumber}
                  onChange={(event) =>
                    setCustomerPhoneNumber(event.target.value)
                  }
                  placeholder="08xxxxxxxxxx"
                />
              </label>
              <label>
                Jenis Pesanan
                <select
                  value={orderType}
                  onChange={(event) =>
                    setOrderType(event.target.value as OrderType)
                  }
                >
                  <option value="delivery">Delivery</option>
                  <option value="takeaway">Take Away</option>
                </select>
              </label>
              <label>
                Alamat Pengantaran
                <textarea
                  className={styles.textArea}
                  value={customerAddress}
                  onChange={(event) => setCustomerAddress(event.target.value)}
                  placeholder="Isi alamat lengkap jika delivery"
                />
              </label>
            </section>

            <section className={styles.paymentList}>
              <h3>Payment Method</h3>
              {onlinePaymentMethods.length === 0 ? (
                <p className={styles.emptyState}>
                  Belum ada metode pembayaran online aktif.
                </p>
              ) : (
                onlinePaymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    className={
                      selectedPaymentMethodId === method.id
                        ? `${styles.paymentItem} ${styles.paymentItemActive}`
                        : styles.paymentItem
                    }
                    onClick={() => setSelectedPaymentMethodId(method.id)}
                  >
                    <span>{method.name}</span>
                    <span>
                      {selectedPaymentMethodId === method.id
                        ? "Selected"
                        : "Choose"}
                    </span>
                  </button>
                ))
              )}
            </section>

            <section className={styles.summaryBox}>
              <div className={styles.totalRow}>
                <span>Total Amount</span>
                <strong>{formatCurrency(totalAmount)}</strong>
              </div>
            </section>

            {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

            <button
              type="button"
              className={styles.whatsappButton}
              onClick={() => void submitOrderViaWhatsApp()}
              disabled={submitting || cartLines.length === 0}
            >
              {submitting
                ? "Menghubungkan ke WhatsApp..."
                : "Order via WhatsApp"}
            </button>
          </>
        )}
      </section>

      {detailProduct && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <button
            type="button"
            className={styles.modalOverlayButton}
            onClick={closeDetail}
          />
          <article className={styles.detailSheet}>
            <img
              src={detailProduct.image_url || FALLBACK_IMAGE}
              alt={detailProduct.name}
              className={styles.detailImage}
            />
            <div className={styles.detailBody}>
              <h3>{detailProduct.name}</h3>
              <p className={styles.detailPrice}>
                {formatCurrency(
                  toNumber(detailProduct.base_price) +
                    toNumber(selectedVariant?.extra_price ?? 0),
                )}
              </p>
              <p className={styles.detailDescription}>
                {detailProduct.description}
              </p>

              {(detailProduct.variants?.length ?? 0) > 0 && (
                <div className={styles.variantList}>
                  <h4>Pilih Varian</h4>
                  {detailProduct.variants?.map((variant) => (
                    <label key={variant.id} className={styles.variantRow}>
                      <input
                        type="radio"
                        checked={selectedVariantId === variant.id}
                        onChange={() => setSelectedVariantId(variant.id)}
                      />
                      <span>{variant.variant_name}</span>
                      <strong>
                        {toNumber(variant.extra_price) > 0
                          ? `+ ${formatCurrency(toNumber(variant.extra_price))}`
                          : "Gratis"}
                      </strong>
                    </label>
                  ))}
                </div>
              )}

              <div className={styles.detailActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={closeDetail}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={() => {
                    addToCart(detailProduct, selectedVariantId);
                    closeDetail();
                  }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
