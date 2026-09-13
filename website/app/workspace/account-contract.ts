export class AccountFlowError extends Error {}

export type AccountMethod = "google" | "apple" | "email";

export type AccountConfiguration = {
  url: string;
  publishableKey: string;
  methods: AccountMethod[];
};

export type PublicAccountEnvironment = {
  enabled?: string;
  url?: string;
  publishableKey?: string;
  google?: string;
  apple?: string;
  email?: string;
};

const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Scope account storage to one configured project and one browser tab identity.
 * A newly opened tab can begin with a cloned sessionStorage snapshot, so the
 * stored owner must match the current browsing context before its SDK key is reused.
 */
export function accountStorageKey(
  storage: Pick<Storage, "getItem" | "setItem">,
  projectURL: string,
  tabID: string,
  newID: () => string,
): string {
  if (!/^[A-Za-z0-9-]{20,80}$/.test(tabID)) throw new AccountFlowError("This browser tab could not create a safe account scope.");
  const scopeKey = `rivune-account-tab:${encodeURIComponent(projectURL)}`;
  const ownerKey = `${scopeKey}:owner`;
  let id = storage.getItem(scopeKey);
  if (storage.getItem(ownerKey) !== tabID || !id || !/^[A-Za-z0-9-]{20,80}$/.test(id)) {
    id = newID();
    if (!/^[A-Za-z0-9-]{20,80}$/.test(id)) throw new AccountFlowError("This browser tab could not create a safe account scope.");
    storage.setItem(scopeKey, id);
    storage.setItem(ownerKey, tabID);
  }
  return `${scopeKey}:${id}`;
}

/** window.name survives reloads and redirects in one tab but is separate in a new tab. */
export function accountTabIdentity(currentName: string, setName: (value: string) => void, newID: () => string): string {
  const match = /^rivune-account-tab-owner:([A-Za-z0-9-]{20,80})$/.exec(currentName);
  if (match) return match[1];
  const id = newID();
  if (!/^[A-Za-z0-9-]{20,80}$/.test(id)) throw new AccountFlowError("This browser tab could not create a safe account scope.");
  setName(`rivune-account-tab-owner:${id}`);
  return id;
}

/** These are public build settings, never an OAuth secret or a service-role key. */
export function accountConfiguration(input: PublicAccountEnvironment): AccountConfiguration | null {
  if (input.enabled !== "true") return null;
  const key = input.publishableKey?.trim() ?? "";
  if (!/^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(key)) return null;
  let url: URL;
  try { url = new URL(input.url?.trim() ?? ""); } catch { return null; }
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHosts.has(url.hostname))) return null;
  const methods: AccountMethod[] = [];
  if (input.google === "true") methods.push("google");
  if (input.apple === "true") methods.push("apple");
  if (input.email === "true") methods.push("email");
  if (!methods.length) return null;
  return { url: url.origin, publishableKey: key, methods };
}

/** No returnTo/next parameter or remotely supplied origin is accepted. */
export function accountRedirectURL(currentURL: string): string {
  const current = new URL(currentURL);
  if (current.username || current.password ||
    (current.protocol !== "https:" && !(current.protocol === "http:" && localHosts.has(current.hostname)))) {
    throw new AccountFlowError("Account sign-in requires HTTPS or a local development address.");
  }
  return `${current.origin}/workspace?account_callback=1`;
}

export function accountCallback(currentURL: string): { code: string | null; failed: boolean; cleanURL: string } | null {
  const current = new URL(currentURL);
  accountRedirectURL(currentURL);
  if (current.pathname !== "/workspace" || current.searchParams.get("account_callback") !== "1") return null;
  const code = current.searchParams.get("code");
  return {
    code: code && code.length <= 4096 ? code : null,
    failed: current.searchParams.has("error") || current.searchParams.has("error_code") || !code || code.length > 4096,
    cleanURL: `${current.origin}/workspace`,
  };
}

/** The SDK returns the configured Auth server's authorize URL; reject unexpected redirects. */
export function accountAuthorizationURL(value: string | null, config: AccountConfiguration, method: AccountMethod, currentURL: string): string {
  const url = new URL(value ?? "");
  if (method === "email" || url.origin !== config.url || url.pathname !== "/auth/v1/authorize" ||
    url.username || url.password || url.hash || url.searchParams.get("provider") !== method ||
    url.searchParams.get("redirect_to") !== accountRedirectURL(currentURL)) {
    throw new AccountFlowError("The account service returned an unexpected sign-in address.");
  }
  return url.href;
}

export function normalizedAccountEmail(value: string | undefined): string {
  const email = value?.trim() ?? "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AccountFlowError("Enter a valid email address.");
  }
  return email;
}

export function normalizedAccountCode(value: string): string {
  const code = value.trim();
  if (!/^\d{6,8}$/.test(code)) throw new AccountFlowError("Enter the 6–8 digit code from your email.");
  return code;
}

export type VerifiedAccount = { id: string; name?: string; email?: string };
export type AccountUser = { id: string; email?: string; is_anonymous?: boolean; user_metadata?: Record<string, unknown> };

/** Call only on the user returned by auth.getUser(), not a locally cached session.user. */
export function verifiedAccount(user: AccountUser | null): VerifiedAccount | null {
  if (!user?.id || user.is_anonymous) return null;
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return { id: user.id, ...(user.email ? { email: user.email } : {}),
    ...(typeof name === "string" && name.trim() ? { name: name.trim().slice(0, 120) } : {}) };
}
