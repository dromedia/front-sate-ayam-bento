"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { postApiData } from "../../lib/api";
import { getStoredSession, setStoredSession, type AuthSession } from "../../lib/auth";

type LoginResponse = {
  message: string;
  token: string;
  user: AuthSession["user"];
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@admin.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getStoredSession()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await postApiData<LoginResponse>("/auth/login", { email, password });
      setStoredSession({ token: response.token, user: response.user });
      setError(null);
      router.replace("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Login gagal.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="loading-shell auth-shell">
      <section className="section-card form-card auth-card">
        <div className="section-header">
          <h3>Masuk ke POS Admin</h3>
          <p>Gunakan akun admin default untuk mulai mengelola dashboard.</p>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field field--full">
            <span>Email</span>
            <input className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field field--full">
            <span>Password</span>
            <input className="text-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error ? <div className="notice-banner notice-banner--error field--full">{error}</div> : null}
          <div className="detail-sheet field--full auth-hint">
            <strong>Default login</strong>
            <p>admin@admin.com / 12345678</p>
          </div>
          <div className="form-actions field--full">
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Masuk..." : "Masuk"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
