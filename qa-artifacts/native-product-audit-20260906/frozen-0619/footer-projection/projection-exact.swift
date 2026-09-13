    private var verifiedAccountIdentity: String? {
        guard !account.busy, !account.signOutPending, !account.verificationFailed,
              let userID = account.verifiedUserID, !userID.isEmpty,
              let identity = account.identity?.trimmingCharacters(in: .whitespacesAndNewlines),
              !identity.isEmpty else { return nil }
        return identity
    }

    private var accountFooterName: String {
        verifiedAccountIdentity ?? "Local workspace"
    }

    private var accountFooterStatus: String {
        if account.signOutPending { return "Account needs attention" }
        if account.busy { return "Checking account…" }
        if account.verificationFailed { return "Account needs attention" }
        if verifiedAccountIdentity != nil { return "Rivune account · Verified" }
        return account.configuration == nil ? "Account settings" : "Signed out · Account settings"
    }

