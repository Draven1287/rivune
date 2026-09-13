import {
  AccountFlowError, accountAuthorizationURL, accountCallback, accountRedirectURL, normalizedAccountCode,
  normalizedAccountEmail, verifiedAccount,
} from "./account-contract.ts";
import type { AccountConfiguration, AccountMethod, AccountUser, VerifiedAccount } from "./account-contract.ts";

type Session = { expires_at?: number };
type AuthResult<T> = { data: T; error: unknown };
type Subscription = { unsubscribe: () => void };

/** A narrow SDK boundary also permits deterministic tests without contacting an Auth server. */
export type AccountAuthPort = {
  getSession: () => Promise<AuthResult<{ session: Session | null }>>;
  getUser: () => Promise<AuthResult<{ user: AccountUser | null }>>;
  signInWithOtp: (input: { email: string; options: { shouldCreateUser: boolean; emailRedirectTo?: string } }) => Promise<{ error: unknown }>;
  verifyOtp: (input: { email: string; token: string; type: "email" }) => Promise<{ error: unknown }>;
  signInWithOAuth: (input: { provider: "google" | "apple"; options: { redirectTo: string; skipBrowserRedirect: true } }) => Promise<AuthResult<{ url: string | null }>>;
  exchangeCodeForSession: (code: string) => Promise<{ error: unknown }>;
  signOut: (input: { scope: "local" }) => Promise<{ error: unknown }>;
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => { data: { subscription: Subscription } };
};

export type AccountState = {
  methods: AccountMethod[];
  account: VerifiedAccount | null;
  loading: boolean;
  busy: boolean;
  signOutPending: boolean;
  error: string | null;
  notice: string | null;
  emailChallenge: { email: string } | null;
};

type AccountNavigation = { currentURL: () => string; replace: (url: string) => void; assign: (url: string) => void };
const expiredNotice = "Your account session ended. Sign in again to continue with your account.";

export class AccountController {
  private state: AccountState;
  private listeners = new Set<() => void>();
  private started = false;
  private disposed = false;
  private authSubscription: Subscription | null = null;
  private verificationRevision = 0;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private verificationTimer: ReturnType<typeof setTimeout> | null = null;
  private initialTask: Promise<void> | null = null;
  private authenticationSuspended = false;

  private config: AccountConfiguration;
  private auth: AccountAuthPort;
  private navigation: AccountNavigation;

  constructor(config: AccountConfiguration, auth: AccountAuthPort, navigation: AccountNavigation) {
    this.config = config;
    this.auth = auth;
    this.navigation = navigation;
    this.state = { methods: config.methods, account: null, loading: true, busy: false, signOutPending: false, error: null, notice: null, emailChallenge: null };
  }

  getSnapshot = (): AccountState => this.state;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  private update(changes: Partial<AccountState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...changes };
    for (const listener of this.listeners) listener();
  }

  start = (): Promise<void> => {
    if (this.started) return this.initialTask ?? Promise.resolve();
    this.started = true;
    this.authSubscription = this.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        this.authenticationSuspended = true;
        this.verificationRevision++;
        this.clearExpiry();
        this.update({ account: null, loading: false, emailChallenge: null, notice: expiredNotice });
      } else if (!this.authenticationSuspended && event !== "INITIAL_SESSION" && session) {
        if (event === "SIGNED_IN" || event === "USER_UPDATED") this.update({ account: null, loading: true });
        // Leave the SDK callback before calling another Auth method (the SDK holds a lock here).
        this.scheduleVerification();
      }
    }).data.subscription;
    this.initialTask = this.initialize();
    return this.initialTask;
  };

  private async initialize() {
    try {
      const callback = accountCallback(this.navigation.currentURL());
      if (callback) {
        // Remove OAuth codes/errors immediately; never render or retain them in app state.
        this.navigation.replace(callback.cleanURL);
        if (callback.failed || !callback.code) throw new AccountFlowError("Account sign-in did not finish. Please try again.");
        const result = await this.auth.exchangeCodeForSession(callback.code);
        if (result.error) throw new AccountFlowError("The sign-in link expired or could not be verified. Please try again.");
      }
      await this.verifyCurrentAccount();
    } catch (error) {
      this.update({ account: null, loading: false, error: safeAccountError(error) });
    }
  }

  private scheduleVerification() {
    if (this.authenticationSuspended) return;
    if (this.verificationTimer) clearTimeout(this.verificationTimer);
    this.verificationTimer = setTimeout(() => { this.verificationTimer = null; void this.verifyCurrentAccount(); }, 0);
  }

  private clearExpiry() { if (this.expiryTimer) clearTimeout(this.expiryTimer); this.expiryTimer = null; }

  private async verifyCurrentAccount() {
    if (this.authenticationSuspended) return;
    const revision = ++this.verificationRevision;
    try {
      const { data: { session }, error } = await this.auth.getSession();
      if (revision !== this.verificationRevision || this.disposed || this.authenticationSuspended) return;
      if (error || !session) {
        this.clearExpiry();
        this.update({ account: null, loading: false, ...(this.state.account ? { notice: expiredNotice } : {}) });
        return;
      }
      // Cached session data only supplies expiration. Identity must be verified by the Auth server.
      const result = await this.auth.getUser();
      if (revision !== this.verificationRevision || this.disposed || this.authenticationSuspended) return;
      const account = result.error ? null : verifiedAccount(result.data.user);
      if (!account || !session.expires_at || session.expires_at * 1000 <= Date.now()) {
        this.clearExpiry();
        this.update({ account: null, loading: false, error: "Your account could not be verified. Sign in again." });
        return;
      }
      this.update({ account, loading: false, error: null, notice: null, emailChallenge: null });
      this.clearExpiry();
      this.expiryTimer = setTimeout(() => {
        this.update({ account: null, loading: true });
        void this.verifyCurrentAccount();
      }, Math.min(session.expires_at * 1000 - Date.now(), 2_147_000_000));
    } catch {
      if (revision !== this.verificationRevision || this.disposed || this.authenticationSuspended) return;
      this.clearExpiry();
      this.update({ account: null, loading: false, error: "Account verification is unavailable. Check your connection and sign in again." });
    }
  }

  signIn = async (method: AccountMethod, email?: string): Promise<void> => {
    if (this.state.busy || this.state.loading || this.state.signOutPending) return;
    if (!this.config.methods.includes(method)) { this.update({ error: "This sign-in method is not configured." }); return; }
    this.update({ busy: true, error: null, notice: null });
    try {
      if (method === "email") {
        const address = normalizedAccountEmail(email);
        const { error } = await this.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true, emailRedirectTo: accountRedirectURL(this.navigation.currentURL()) } });
        if (error) throw new AccountFlowError("We couldn't send a sign-in link. Check the address and try again shortly.");
        this.update({ emailChallenge: { email: address }, notice: "Open the sign-in link in your email using this browser." });
      } else {
        const result = await this.auth.signInWithOAuth({ provider: method, options: {
          redirectTo: accountRedirectURL(this.navigation.currentURL()), skipBrowserRedirect: true,
        } });
        if (result.error) throw new AccountFlowError("Account sign-in is unavailable. Please try again.");
        this.navigation.assign(accountAuthorizationURL(result.data.url, this.config, method, this.navigation.currentURL()));
      }
    } catch (error) { this.update({ error: safeAccountError(error) }); }
    finally { this.update({ busy: false }); }
  };

  verifyEmail = async (code: string): Promise<void> => {
    if (this.state.busy || this.state.loading || this.state.signOutPending || !this.state.emailChallenge || !this.config.methods.includes("email")) return;
    this.update({ busy: true, error: null, notice: null });
    try {
      const token = normalizedAccountCode(code);
      const { error } = await this.auth.verifyOtp({ email: this.state.emailChallenge.email, token, type: "email" });
      if (error) throw new AccountFlowError("That code is invalid or expired. Try again or request a new code.");
      this.authenticationSuspended = false;
      await this.verifyCurrentAccount();
    } catch (error) { this.update({ error: safeAccountError(error) }); }
    finally { this.update({ busy: false }); }
  };

  cancelEmail = () => { if (!this.state.busy) this.update({ emailChallenge: null, error: null, notice: null }); };

  signOut = async (): Promise<void> => {
    if (this.state.busy) return;
    this.authenticationSuspended = true;
    this.verificationRevision++;
    this.clearExpiry();
    if (this.verificationTimer) clearTimeout(this.verificationTimer);
    this.verificationTimer = null;
    this.update({ account: null, busy: true, signOutPending: true, loading: false, error: null, notice: null, emailChallenge: null });
    try {
      const { error } = await this.auth.signOut({ scope: "local" });
      if (error) throw new AccountFlowError("Local sign-out could not remove the saved account session in this tab. Your account stays hidden; no remote account or AI-provider access was revoked. Retry to finish.");
      this.update({ signOutPending: false, notice: "Signed out of your Rivune account on this browser." });
    } catch { this.update({ error: "Local sign-out could not remove the saved account session in this tab. Your account stays hidden; no remote account or AI-provider access was revoked. Retry to finish.", notice: null }); }
    finally { this.update({ busy: false }); }
  };

  dispose() {
    this.disposed = true;
    this.verificationRevision++;
    this.clearExpiry();
    if (this.verificationTimer) clearTimeout(this.verificationTimer);
    this.authSubscription?.unsubscribe();
    this.listeners.clear();
  }
}

// Only errors authored here reach UI. SDK errors may contain URLs or other account data.
function safeAccountError(error: unknown): string {
  return error instanceof AccountFlowError ? error.message : "Account sign-in could not finish. Please try again.";
}
