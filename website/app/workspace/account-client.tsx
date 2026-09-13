"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import { accountConfiguration, accountStorageKey, accountTabIdentity } from "./account-contract";
import { AccountController } from "./account-controller";
import type { AccountState } from "./account-controller";
import type { AccountAccess } from "./setup";

// Direct NEXT_PUBLIC references are replaced at build time. No private environment values are read.
const config = accountConfiguration({
  enabled: process.env.NEXT_PUBLIC_RIVUNE_AUTH_ENABLED,
  url: process.env.NEXT_PUBLIC_RIVUNE_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_RIVUNE_SUPABASE_PUBLISHABLE_KEY,
  google: process.env.NEXT_PUBLIC_RIVUNE_AUTH_GOOGLE_ENABLED,
  apple: process.env.NEXT_PUBLIC_RIVUNE_AUTH_APPLE_ENABLED,
  email: process.env.NEXT_PUBLIC_RIVUNE_AUTH_EMAIL_ENABLED,
});
const serverState: AccountState = {
  methods: config?.methods ?? [], account: null, loading: Boolean(config), busy: false, signOutPending: false,
  error: null, notice: null, emailChallenge: null,
};
let controller: AccountController | null = null;
let unavailableState: AccountState | null = null;

function accountController(): AccountController | null {
  if (!config || typeof window === "undefined") return null;
  if (controller) return controller;
  if (unavailableState) return null;
  try {
    const storage = window.sessionStorage;
    const probe = `rivune-auth-storage-check-${crypto.randomUUID()}`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    const client = createClient(config.url, config.publishableKey, {
      auth: {
        flowType: "pkce", detectSessionInUrl: false, autoRefreshToken: true, persistSession: true,
        // Persist account/PKCE through reloads and OAuth redirects in this tab.
        // A cloned sessionStorage snapshot is rotated against its tab owner.
        storage,
        storageKey: accountStorageKey(
          storage,
          config.url,
          accountTabIdentity(window.name, value => { window.name = value; }, () => crypto.randomUUID()),
          () => crypto.randomUUID(),
        ),
      },
      global: {
        fetch: (input, init) => {
          const abort = new AbortController();
          const timer = setTimeout(() => abort.abort(), 15_000);
          const callerSignal = init?.signal;
          const cancel = () => abort.abort();
          if (callerSignal?.aborted) cancel();
          else callerSignal?.addEventListener("abort", cancel, { once: true });
          return fetch(input, { ...init, signal: abort.signal }).finally(() => {
            clearTimeout(timer);
            callerSignal?.removeEventListener("abort", cancel);
          });
        },
      },
    });
    controller = new AccountController(config, client.auth, {
      currentURL: () => window.location.href,
      replace: (url) => window.history.replaceState(window.history.state, "", url),
      assign: (url) => window.location.assign(url),
    });
    return controller;
  } catch {
    unavailableState = { ...serverState, loading: false,
      error: "Account sign-in needs browser storage. Allow storage for this site, then reload to try again." };
    return null;
  }
}

const subscribe = (listener: () => void) => accountController()?.subscribe(listener) ?? (() => {});
const getSnapshot = () => accountController()?.getSnapshot() ?? unavailableState ?? serverState;
const getServerSnapshot = () => serverState;

/** No client or Auth request is created until the owner explicitly configures and enables it. */
export function AccountClient({ children }: { children: (accountAccess: AccountAccess) => ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { void accountController()?.start(); }, []);
  const access: AccountAccess = {
    ...state,
    ...(config && !unavailableState ? {
      onSignIn: (method, email) => { void accountController()?.signIn(method, email); },
      onVerifyEmail: (code) => { void accountController()?.verifyEmail(code); },
      onCancelEmail: () => accountController()?.cancelEmail(),
      onSignOut: () => { void accountController()?.signOut(); },
    } : {}),
  };
  return children(access);
}
