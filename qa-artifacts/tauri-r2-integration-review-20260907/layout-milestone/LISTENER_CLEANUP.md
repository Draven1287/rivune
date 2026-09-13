# Owned run-event lifecycle

Core subscribeRunUpdates owns the async unsubscribe and pending timer. Disposal is idempotent, clears timer/cache, ignores subsequent events, detaches late-resolving subscriptions once, and suppresses late error notifications. Refresh receives a liveness predicate; app checks it before applying resolved snapshots or errors. App pagehide disposes notification resources only; persisted pageshow reconnects. No draft/save/host shutdown mutation is bound to pagehide.

Six focused tests plus the existing app integration unit test pass: delayed subscription, pending timer, after-dispose events, pre-start disposal, coalescing/reconnect, late rejection, and in-flight refresh liveness. Actual native lifecycle remains unverified. LISTENER_CLEANUP_HASHES binds the three changed files.
