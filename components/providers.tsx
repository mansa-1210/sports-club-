"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "The request could not be completed.");
  }
  return response.json() as Promise<T>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, shouldRetryOnError: false, revalidateOnFocus: true }}>
      {children}
    </SWRConfig>
  );
}
