"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { X } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type AuthModalProps = {
  initialMode: "sign-in" | "sign-up";
  onClose: () => void;
  onSuccess: () => void;
};

export function AuthModal({ initialMode, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const previousFocus = document.activeElement;
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "").trim();

    try {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: fullName });

      if (result.error) throw new Error("auth-failed");
      await mutate("/api/me");
      router.refresh();
      onSuccess();
    } catch {
      setError("We couldn't verify those details. Check them and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        aria-labelledby="auth-title"
        aria-modal="true"
        className="auth-card"
        ref={dialogRef}
        role="dialog"
      >
        <button aria-label="Close sign in dialog" className="auth-close" onClick={onClose} type="button">
          <X aria-hidden="true" size={17} />
        </button>
        <span className="eyebrow">Forge member access</span>
        <h2 id="auth-title">{mode === "sign-in" ? "Welcome back." : "Find your place."}</h2>
        <p>
          {mode === "sign-in"
            ? "Sign in to manage your membership, programmes, and event registrations."
            : "Create your member account to request a membership and book club sessions."}
        </p>
        <form className="auth-form" onSubmit={submit}>
          {mode === "sign-up" && (
            <div className="field">
              <label htmlFor="auth-full-name">Full name</label>
              <input autoComplete="name" id="auth-full-name" maxLength={120} minLength={2} name="fullName" required />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-email">Email address</label>
            <input autoComplete="email" id="auth-email" maxLength={254} name="email" required type="email" />
          </div>
          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <input
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              id="auth-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary" disabled={pending} type="submit">
            {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="auth-switch">
          {mode === "sign-in" ? "New to Forge? " : "Already a member? "}
          <button
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setError("");
            }}
            type="button"
          >
            {mode === "sign-in" ? "Create an account" : "Sign in instead"}
          </button>
        </div>
        <p className="form-help" style={{ marginTop: 14, marginBottom: 0 }}>
          Membership payments are confirmed by the club. This app does not collect or store card details.
        </p>
      </section>
    </div>
  );
}
