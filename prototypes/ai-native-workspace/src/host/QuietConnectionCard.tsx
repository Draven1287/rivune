import type { ModelCatalog } from '../hooks/workspaceAdapter';
import { connectionGuidance, connectionStateLabels } from './connectionGuidance';

/** Presentation only: installation, authentication and response remain separate host facts. */
export function QuietConnectionCard({ provider }: { provider: ModelCatalog['providers'][number] }) {
  const facts = [
    { label: 'Installation', state: provider.installation },
    { label: 'Sign-in', state: provider.authentication },
    { label: 'Response test', state: provider.responseTest },
  ];
  return <section className="quiet-connection-card" aria-label={`${provider.label} connection`}>
    <h4>{provider.label}</h4>
    <dl>{facts.map(fact => <div key={fact.label} data-state={fact.state}>
      <dt>{fact.label}</dt><dd>{connectionStateLabels[fact.state]}</dd>
    </div>)}</dl>
    <details><summary>Connection details</summary><p><strong>Next step: </strong>{connectionGuidance(provider)}</p></details>
  </section>;
}
