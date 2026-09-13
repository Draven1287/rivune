import test from "node:test";
import assert from "node:assert/strict";
import {
  accountConfiguration, accountRedirectURL, accountAuthorizationURL, accountCallback,
  normalizedAccountEmail, normalizedAccountCode, accountStorageKey, accountTabIdentity,
} from "../app/workspace/account-contract.ts";
import { AccountController } from "../app/workspace/account-controller.ts";

const publicConfig = {
  enabled: "true", url: "https://rivune-fixture.supabase.co", publishableKey: "sb_publishable_fixture_only_123456789",
  google: "true", apple: "true", email: "true",
};
const config = accountConfiguration(publicConfig);
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

function fixture(t, options = {}) {
  const calls = [];
  let callback;
  let session = options.session ?? null;
  let user = options.user ?? { id: "account-1", email: "person@example.com", user_metadata: { full_name: "A Person" } };
  let currentURL = options.url ?? "http://localhost:3187/workspace";
  const auth = {
    getSession: async () => { calls.push(["getSession"]); return { data: { session }, error: null }; },
    getUser: async () => { calls.push(["getUser"]); return { data: { user }, error: null }; },
    signInWithOtp: async (input) => { calls.push(["sendOTP", input]); return { error: null }; },
    verifyOtp: async (input) => { calls.push(["verifyOTP", input]); session = { expires_at: Date.now() / 1000 + 3600 }; return { error: null }; },
    signInWithOAuth: async (input) => {
      calls.push(["oauth", input]);
      const target = new URL(`${config.url}/auth/v1/authorize`);
      target.searchParams.set("provider", input.provider);
      target.searchParams.set("redirect_to", input.options.redirectTo);
      return { data: { url: target.href }, error: null };
    },
    exchangeCodeForSession: async (code) => { calls.push(["exchange", code]); session = { expires_at: Date.now() / 1000 + 3600 }; return { error: null }; },
    signOut: options.signOut ?? (async (input) => { calls.push(["signOut", input]); session = null; callback?.("SIGNED_OUT", null); return { error: null }; }),
    onAuthStateChange: (fn) => { callback = fn; return { data: { subscription: { unsubscribe() {} } } }; },
  };
  const controller = new AccountController(options.config ?? config, auth, {
    currentURL: () => currentURL,
    replace: (value) => { currentURL = value; calls.push(["replace", value]); },
    assign: (value) => { calls.push(["assign", value]); },
  });
  t.after(() => controller.dispose());
  return { controller, auth, calls, event: (event) => callback?.(event, session), setSession: (value) => { session = value; }, setUser: (value) => { user = value; } };
}

test("account configuration stays inactive until project, publishable key, and explicit methods are enabled", () => {
  assert.equal(accountConfiguration({}), null);
  for (const override of [{ enabled: "false" }, { enabled: undefined }, { url: "" }, { publishableKey: "" },
    { publishableKey: "sb_secret_do_not_use_in_browser" }, { publishableKey: "service_role" },
    { google: "false", apple: "false", email: "false" }]) {
    assert.equal(accountConfiguration({ ...publicConfig, ...override }), null);
  }
  assert.deepEqual(config.methods, ["google", "apple", "email"]);
  assert.deepEqual(accountConfiguration({ ...publicConfig, google: "false", apple: "false" }).methods, ["email"]);
});

test("SDK session storage survives reload while isolating projects and cloned tabs", () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const firstTab = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const first = accountStorageKey(storage, config.url, firstTab, () => "11111111-1111-4111-8111-111111111111");
  assert.equal(accountStorageKey(storage, config.url, firstTab, () => { throw new Error("Should reuse browser ID"); }), first);

  // Browser-created tabs can clone sessionStorage. A different tab owner must
  // rotate the SDK key instead of sharing the copied account session.
  const clonedData = new Map(data);
  const clonedStorage = { getItem: key => clonedData.get(key), setItem: (key, value) => clonedData.set(key, value) };
  const second = accountStorageKey(clonedStorage, config.url, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", () => "22222222-2222-4222-8222-222222222222");
  assert.notEqual(second, first);
  assert.equal(accountStorageKey(storage, config.url, firstTab, () => { throw new Error("Original tab should remain stable"); }), first);
  assert.notEqual(accountStorageKey(storage, "http://localhost:54322", firstTab, () => "33333333-3333-4333-8333-333333333333"), first);
  assert.throws(() => accountStorageKey({ getItem() { throw new Error("Storage denied"); }, setItem() {} }, config.url, firstTab, () => "44444444-4444-4444-8444-444444444444"));
});

test("tab identity is stable through reloads and new for another browsing context", () => {
  let name = "";
  const first = accountTabIdentity(name, value => { name = value; }, () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(accountTabIdentity(name, () => { throw new Error("Should not rewrite"); }, () => { throw new Error("Should reuse tab identity"); }), first);
  let secondName = "";
  const second = accountTabIdentity(secondName, value => { secondName = value; }, () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  assert.notEqual(second, first);
});

test("deferred local sign-out failure keeps recovery reachable and blocks new sign-in", async (t) => {
  const gate = deferred();
  let attempts = 0;
  const f = fixture(t, {
    session: { expires_at: Date.now() / 1000 + 3600 },
    signOut: async () => {
      attempts++;
      if (attempts === 1) { await gate.promise; return { error: new Error("offline") }; }
      return { error: null };
    },
  });
  await f.controller.start();
  assert.equal(f.controller.getSnapshot().account.id, "account-1");
  const pending = f.controller.signOut();
  await tick();
  assert.equal(f.controller.getSnapshot().account, null);
  assert.equal(f.controller.getSnapshot().signOutPending, true);
  assert.equal(f.controller.getSnapshot().busy, true);
  await f.controller.signIn("google");
  assert.equal(f.calls.some(([call]) => call === "oauth"), false);
  gate.resolve();
  await pending;
  assert.equal(f.controller.getSnapshot().busy, false);
  assert.equal(f.controller.getSnapshot().signOutPending, true);
  assert.match(f.controller.getSnapshot().error, /Retry to finish/);
  await f.controller.signOut();
  assert.equal(f.controller.getSnapshot().signOutPending, false);
  assert.equal(attempts, 2);
});

test("account project URL rejects insecure remote hosts, credentials, paths and query material", () => {
  for (const url of ["http://remote.example", "https://name:password@example.com", "https://example.com/auth", "https://example.com?key=1", "https://example.com#token", "file:///tmp/project"]) {
    assert.equal(accountConfiguration({ ...publicConfig, url }), null);
  }
  assert.equal(accountConfiguration({ ...publicConfig, url: "http://127.0.0.1:54321" }).url, "http://127.0.0.1:54321");
});

test("redirects always return to the current origin workspace and callback ignores next", () => {
  assert.equal(accountRedirectURL("https://rivune.example/workspace?next=https://evil.example#token"), "https://rivune.example/workspace?account_callback=1");
  assert.equal(accountRedirectURL("http://localhost:3187/other"), "http://localhost:3187/workspace?account_callback=1");
  assert.throws(() => accountRedirectURL("http://untrusted.example/workspace"));
  assert.throws(() => accountRedirectURL("https://username:password@example.com/workspace"));
  assert.equal(accountCallback("https://rivune.example/workspace?code=unrequested"), null);
  assert.equal(accountCallback("https://rivune.example/other?account_callback=1&code=x"), null);
  assert.deepEqual(accountCallback("https://rivune.example/workspace?account_callback=1&code=one-time&next=//evil.example"), {
    code: "one-time", failed: false, cleanURL: "https://rivune.example/workspace",
  });
});

test("authorization URL must match configured Auth endpoint, method and exact callback", () => {
  const redirect = "http://localhost:3187/workspace?account_callback=1";
  const url = new URL(`${config.url}/auth/v1/authorize`);
  url.searchParams.set("provider", "google"); url.searchParams.set("redirect_to", redirect);
  assert.equal(accountAuthorizationURL(url.href, config, "google", redirect), url.href);
  for (const invalid of [url.href.replace(config.url, "https://evil.example"), url.href.replace("authorize", "logout"), url.href.replace("google", "apple"), `${config.url}/auth/v1/authorize?provider=google&redirect_to=https://evil.example`]) {
    assert.throws(() => accountAuthorizationURL(invalid, config, "google", redirect));
  }
});

test("email and OTP validation are bounded without converting an entered email into identity", () => {
  assert.equal(normalizedAccountEmail(" person@example.com "), "person@example.com");
  for (const email of ["", "a@", "a b@example.com", "a".repeat(255) + "@example.com"]) assert.throws(() => normalizedAccountEmail(email));
  assert.equal(normalizedAccountCode(" 123456 "), "123456");
  assert.equal(normalizedAccountCode("12345678"), "12345678");
  for (const code of ["12345", "123456789", "12ab56", "123 456"]) assert.throws(() => normalizedAccountCode(code));
});

test("email send does not authenticate; verified code must be followed by server getUser", async (t) => {
  const f = fixture(t); await f.controller.start();
  await f.controller.signIn("email", "person@example.com");
  assert.equal(f.controller.getSnapshot().account, null);
  assert.deepEqual(f.controller.getSnapshot().emailChallenge, { email: "person@example.com" });
  assert.equal(f.calls.find(([call]) => call === "sendOTP")[1].options.emailRedirectTo, "http://localhost:3187/workspace?account_callback=1");
  assert.equal(f.calls.some(([call]) => call === "getUser"), false);
  await f.controller.verifyEmail("123456");
  assert.deepEqual(f.calls.find(([call]) => call === "verifyOTP")[1], { email: "person@example.com", token: "123456", type: "email" });
  assert.equal(f.controller.getSnapshot().account.id, "account-1");
  assert.equal(f.controller.getSnapshot().emailChallenge, null);
  assert.ok(f.calls.findIndex(([call]) => call === "getUser") > f.calls.findIndex(([call]) => call === "verifyOTP"));
});

test("cached session or successful OTP cannot bypass failed or anonymous getUser verification", async (t) => {
  const f = fixture(t, { session: { expires_at: Date.now() / 1000 + 3600, user: { id: "forged" } } });
  f.auth.getUser = async () => ({ data: { user: null }, error: new Error("verification rejected") });
  await f.controller.start();
  assert.equal(f.controller.getSnapshot().account, null);
  const anonymous = fixture(t, { session: { expires_at: Date.now() / 1000 + 3600 }, user: { id: "anon", is_anonymous: true } });
  await anonymous.controller.start(); assert.equal(anonymous.controller.getSnapshot().account, null);
});

test("configured social methods use SDK PKCE callback, disabled methods make no request", async (t) => {
  for (const provider of ["google", "apple"]) {
    const f = fixture(t, { config: { ...config, methods: [provider] } }); await f.controller.start();
    await f.controller.signIn(provider === "google" ? "apple" : "google");
    assert.equal(f.calls.some(([call]) => call === "oauth"), false);
    await f.controller.signIn(provider);
    const input = f.calls.find(([call]) => call === "oauth")[1];
    assert.equal(input.provider, provider);
    assert.equal(input.options.skipBrowserRedirect, true);
    assert.equal(input.options.redirectTo, "http://localhost:3187/workspace?account_callback=1");
    assert.equal(f.controller.getSnapshot().account, null);
    const destination = new URL(f.calls.find(([call]) => call === "assign")[1]);
    assert.equal(destination.searchParams.get("provider"), provider);
  }
});

test("OAuth callback is cleaned, exchanged once, and verified; remote error details never render", async (t) => {
  const f = fixture(t, { url: "https://rivune.example/workspace?account_callback=1&code=fixture-code" });
  await Promise.all([f.controller.start(), f.controller.start()]);
  assert.equal(f.calls.filter(([call]) => call === "exchange").length, 1);
  assert.ok(f.calls.findIndex(([call]) => call === "replace") < f.calls.findIndex(([call]) => call === "exchange"));
  assert.equal(f.controller.getSnapshot().account.id, "account-1");
  const error = fixture(t, { url: "https://rivune.example/workspace?account_callback=1&error=denied&error_description=private-data" });
  await error.controller.start();
  assert.equal(error.calls.some(([call]) => call === "exchange"), false);
  assert.equal(error.controller.getSnapshot().account, null);
  assert.doesNotMatch(error.controller.getSnapshot().error, /private-data/);
});

test("SDK rejected promises do not expose raw URLs or account details", async (t) => {
  const f = fixture(t); await f.controller.start();
  f.auth.signInWithOtp = async () => { throw new Error("https://secret.example/?token=private-data"); };
  await f.controller.signIn("email", "person@example.com");
  assert.doesNotMatch(f.controller.getSnapshot().error, /secret|token|private-data/);
  assert.equal(f.controller.getSnapshot().busy, false);
});

test("signout latches account closed against delayed verification and refresh events", async (t) => {
  const f = fixture(t, { session: { expires_at: Date.now() / 1000 + 3600 } }); await f.controller.start();
  const userResult = deferred(); const signoutResult = deferred();
  f.auth.getUser = async () => userResult.promise;
  f.auth.signOut = async () => signoutResult.promise;
  f.event("TOKEN_REFRESHED"); await tick();
  const signingOut = f.controller.signOut();
  f.event("TOKEN_REFRESHED");
  userResult.resolve({ data: { user: { id: "stale-account" } }, error: null });
  await tick();
  assert.equal(f.controller.getSnapshot().account, null);
  assert.equal(f.controller.getSnapshot().busy, true);
  signoutResult.resolve({ error: null }); await signingOut;
  f.event("SIGNED_IN"); await tick();
  assert.equal(f.controller.getSnapshot().account, null);
});

test("a changed sign-in cannot keep displaying the previous identity while verification is pending", async (t) => {
  const f = fixture(t, { session: { expires_at: Date.now() / 1000 + 3600 } }); await f.controller.start();
  const userResult = deferred();
  f.auth.getUser = async () => userResult.promise;
  f.event("SIGNED_IN");
  assert.equal(f.controller.getSnapshot().account, null);
  assert.equal(f.controller.getSnapshot().loading, true);
  await tick();
  userResult.resolve({ data: { user: { id: "verified-account-2" } }, error: null });
  await tick();
  assert.equal(f.controller.getSnapshot().account.id, "verified-account-2");
});

test("successful new email verification can sign in again after explicit signout", async (t) => {
  const f = fixture(t, { session: { expires_at: Date.now() / 1000 + 3600 } }); await f.controller.start();
  await f.controller.signOut();
  assert.deepEqual(f.calls.find(([call]) => call === "signOut")[1], { scope: "local" });
  await f.controller.signIn("email", "person@example.com");
  assert.equal(f.controller.getSnapshot().account, null);
  await f.controller.verifyEmail("123456");
  assert.equal(f.controller.getSnapshot().account.id, "account-1");
});

test("failed signout exposes recovery and blocks stale identity until a successful retry", async (t) => {
  for (const rejects of [false, true]) {
    const f = fixture(t, { session: { expires_at: Date.now() / 1000 + 3600 } });
    await f.controller.start();
    const successfulSignOut = f.auth.signOut;
    f.auth.signOut = async () => {
      if (rejects) throw new Error("private-service-details");
      return { error: new Error("private-service-details") };
    };
    await f.controller.signOut();
    assert.equal(f.controller.getSnapshot().signOutPending, true);
    assert.equal(f.controller.getSnapshot().busy, false);
    assert.equal(f.controller.getSnapshot().account, null);
    assert.match(f.controller.getSnapshot().error, /Retry to finish/);
    assert.doesNotMatch(f.controller.getSnapshot().error, /private-service-details/);
    f.event("TOKEN_REFRESHED");
    f.event("SIGNED_IN");
    await tick();
    assert.equal(f.controller.getSnapshot().account, null);
    await f.controller.signIn("email", "person@example.com");
    await f.controller.signIn("google");
    assert.equal(f.calls.some(([call]) => call === "sendOTP" || call === "oauth"), false);
    f.auth.signOut = successfulSignOut;
    await f.controller.signOut();
    assert.equal(f.controller.getSnapshot().signOutPending, false);
    assert.equal(f.controller.getSnapshot().error, null);
    assert.equal(f.controller.getSnapshot().account, null);
    await f.controller.signIn("email", "person@example.com");
    await f.controller.verifyEmail("123456");
    assert.equal(f.controller.getSnapshot().account.id, "account-1");
  }
});

test("expired session is not shown as authenticated even when getUser returns a user", async (t) => {
  const f = fixture(t, { session: { expires_at: Date.now() / 1000 - 10 } }); await f.controller.start();
  assert.equal(f.controller.getSnapshot().account, null);
  assert.equal(f.controller.getSnapshot().loading, false);
});

test("session expiry removes a previously verified identity before rechecking", async (t) => {
  const f = fixture(t, { session: { expires_at: Date.now() / 1000 + 0.025 } }); await f.controller.start();
  assert.equal(f.controller.getSnapshot().account.id, "account-1");
  await new Promise(resolve => setTimeout(resolve, 45));
  assert.equal(f.controller.getSnapshot().account, null);
  assert.equal(f.controller.getSnapshot().loading, false);
});

test("invalid OTP makes no verification request and challenge can be canceled", async (t) => {
  const f = fixture(t); await f.controller.start(); await f.controller.signIn("email", "person@example.com");
  await f.controller.verifyEmail("bad code");
  assert.equal(f.calls.some(([call]) => call === "verifyOTP"), false);
  f.controller.cancelEmail();
  assert.equal(f.controller.getSnapshot().emailChallenge, null);
  assert.equal(f.controller.getSnapshot().account, null);
});
