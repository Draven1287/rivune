import { useRef, useState } from 'react';
import { createSetupAdapter, type SetupResult } from '../../hooks/workspaceAdapter';

function desktopBridge(): unknown {
  return (globalThis as typeof globalThis & { __RIVUNE_DESKTOP_HOST__?: unknown }).__RIVUNE_DESKTOP_HOST__;
}

/** Read-only host inspection. This component never configures or runs a provider. */
export function ConnectionSetup() {
  const [result, setResult] = useState<SetupResult | null>(null);
  const [checking, setChecking] = useState(false);
  const pending = useRef(false);
  const available = createSetupAdapter(desktopBridge()).available;
  async function inspect() {
    if (pending.current) return;
    pending.current = true;
    setChecking(true);
    setResult(null);
    try { setResult(await createSetupAdapter(desktopBridge()).readSetup()); }
    finally { pending.current = false; setChecking(false); }
  }
  return <section className="connection-setup" aria-labelledby="connection-setup-title">
    <h3 id="connection-setup-title">Connections</h3>
    <p>Inspect desktop setup without signing in, changing settings, or sending an AI request.</p>
    <p role="status">{checking ? 'Checking desktop setup…' : !available ? 'Desktop connection unavailable in this browser preview.' : result === null ? 'Desktop bridge detected. Provider readiness has not been checked.' : result.status === 'error' ? 'Desktop setup could not be checked. Try again; no provider changes were made.' : result.status === 'unavailable' ? 'The desktop setup bridge is unavailable.' : 'Desktop setup returned. These are host-reported states, not a new connection test.'}</p>
    <button className="artifact-toggle" type="button" onClick={inspect} disabled={checking}>{checking ? 'Checking…' : result ? 'Check again' : 'Check desktop setup'}</button>
    {result?.status === 'available' && <div className="connection-results">
      {result.providers.length === 0 && <p>No supported providers were reported by this host.</p>}
      {result.providers.map(provider => <article key={provider.id} className="connection-provider"><h4>{provider.label}</h4><dl>
        <div><dt>Installation</dt><dd>{provider.installed === true ? 'Installed' : provider.installed === false ? 'Not installed' : 'Unknown'}</dd></div>
        <div><dt>Configuration</dt><dd>{provider.configured ? 'Configured' : 'Not configured'}</dd></div>
        <div><dt>Sign-in</dt><dd>{provider.authentication === 'authenticated' ? 'Host reports signed in' : provider.authentication === 'authNeeded' ? 'Sign-in required' : 'Not verified'}</dd></div>
        <div><dt>Response test</dt><dd>{provider.responseTest === 'passed' ? 'Previously passed, per host' : provider.responseTest === 'failed' ? 'Host reports failure' : 'Not tested'}</dd></div>
        <div><dt>Readiness</dt><dd>{provider.readiness === 'hostReportedReady' ? 'Host reports ready; not tested here' : 'Not verified ready'}</dd></div>
      </dl></article>)}
    </div>}
    <h3 className="connection-constellation">Constellation</h3><p>This conversation uses a fixed local demonstration. Desktop setup inspection does not connect its lead or members. Live Constellation configuration and execution are not integrated into this preview.</p>
  </section>;
}
