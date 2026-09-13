import type { CatalogProvider } from '../hooks/workspaceAdapter';

/** Guidance only. Never infers readiness or initiates setup/authentication. */
export function connectionGuidance(provider: CatalogProvider): string {
  if (provider.adapterState !== 'supported') return 'This connection is not supported or is unavailable in this host. Use another configured connection.';
  if (provider.installation === 'missing') return 'Install the provider’s command-line app using its official instructions, then configure its executable in the desktop host. Installation is not available from this panel.';
  if (provider.installation === 'unknown') return 'The host has not confirmed installation. Check the provider’s local setup before attempting a conversation.';
  if (provider.authentication === 'authNeeded') return 'Sign in through the provider’s own app or command-line tool. Rivune does not start sign-in from this panel.';
  if (provider.authentication === 'unknown') return 'Sign-in is unverified. Check the provider’s own account status; an installed tool or a previous response does not confirm current access.';
  if (provider.responseTest === 'failed') return 'The host reports a failed response. Check the provider’s connection and account status before explicitly trying again; your draft remains available.';
  if (provider.catalogState !== 'available') return 'The host’s model catalog is unavailable, unverified, or out of date. Current model access must be confirmed before sending.';
  if (!provider.supportsProviderDefault) return 'This connection does not admit the provider default. Choose another supported connection; model overrides are not available here.';
  if (provider.responseTest === 'notTested') return 'No successful response is recorded. When you are ready, return to the conversation and explicitly send a short message. This panel does not send a test.';
  return 'The host records a previous successful response. Return to your conversation to continue; this is not a new connection check.';
}
export const connectionStateLabels = {
  installed: 'Installed', missing: 'Not installed', notApplicable: 'Not required', unknown: 'Not verified',
  authenticated: 'Host reports signed in', authNeeded: 'Sign-in required',
  passed: 'Previously passed', failed: 'Failed', notTested: 'Not tested',
} as const;
