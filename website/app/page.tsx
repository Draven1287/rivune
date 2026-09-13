import ProductDemo from "./product-demo";
import MobileNav from "./mobile-nav";

const sourceRelease = {
  repository: "https://github.com/Draven1287/rivune",
  page: "https://github.com/Draven1287/rivune/releases/tag/v0.2.0-source-preview.4",
  archive: "https://github.com/Draven1287/rivune/releases/download/v0.2.0-source-preview.4/Rivune-0.2-source-preview-4.zip",
  checksum: "https://github.com/Draven1287/rivune/releases/download/v0.2.0-source-preview.4/Rivune-0.2-source-preview-4.zip.sha256",
  sha256: "c2c816c818aa3150c3f0f47634fa599626f735e1879fc38815d34dec021aadb1",
};

const workflow = [
  ["01", "Plan", "Turn the request into one shared definition of done."],
  ["02", "Challenge", "Have the second model test the plan for gaps and weak handoffs."],
  ["03", "Divide", "Give the connected models complementary responsibilities that fit together."],
  ["04", "Build", "Run both contributions with the complete plan and task split in view."],
  ["05", "Cross-review", "Let each model challenge the partner work and its own decisions."],
  ["06", "Resolve", "Integrate one finished result while keeping the source work inspectable."],
];

const capabilities = [
  ["Compatible CLI discovery", "Available", "Supported provider tool installed", "Found locally and shown in Rivune Settings"],
  ["Included adapters", "Available", "Provider-managed sign-in", "Codex CLI and Claude Code CLI in this preview"],
  ["iPhone companion", "Preview", "Paired Mac must remain awake", "Sends requests through the encrypted Mac bridge"],
  ["Additional providers", "Open source", "A reviewed Rivune adapter", "Can join the same provider-neutral interface and workflow"],
  ["API connectors", "Preview", "Provider API key and model access", "OpenAI and Anthropic transports and compatible-endpoint foundations are included in the source; live access requires separate setup and verification"],
];

const releaseUpdates = [
  {
    title: "A quieter review experience",
    body: "The final answer stays primary. Plans, contributions, disagreements, and checks remain available in one collapsible decision record.",
  },
  {
    title: "Connections that explain themselves",
    body: "Settings separates compatible tools, connection health, model choices, privacy, and conversation context without assuming every installation uses the same providers.",
  },
  {
    title: "A release that fails closed",
    body: "The source preview is available now. The Mac installer stays offline until its Developer ID signature, Apple notarization ticket, and Gatekeeper checks all pass.",
  },
];

function Mark({ compact = false }: { compact?: boolean }) {
  return <span className={`mark ${compact ? "mark--compact" : ""}`} aria-hidden="true" />;
}

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Rivune home">
          <Mark compact />
          <span className="rivune-wordmark" role="img" aria-label="Rivune">Rivune</span>
        </a>
        <div className="nav__links">
          <a href="#product-tour">Product</a>
          <a href="#how-it-works">Workflow</a>
          <a href="#connect">Availability</a>
          <a href="#updates">Updates</a>
          <a href="#open-source">Open source</a>
        </div>
        <MobileNav />
        <a className="nav__action" href="#download">Get Rivune for Mac <span aria-hidden="true"> ↗</span></a>
      </nav>

      <section className="hero shell" id="top">
        <div className="eyebrow"><span className="status-dot" /> Native multi-AI workspace for macOS</div>
        <h1>Your AI tools.<br /><span>One reviewed result.</span></h1>
        <p className="hero__lede">
          Rivune finds compatible AI command-line tools on your Mac and brings them into one native workspace. Ask directly, or let multiple models divide the work, challenge the result, and resolve one final answer.
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href={sourceRelease.archive}>Get the source preview <span aria-hidden="true">↓</span></a>
          <a className="button button--quiet" href="#product-tour">See the workflow <span aria-hidden="true">→</span></a>
        </div>
        <div className="proof-row" aria-label="Current product facts">
          <span>Compatible CLI discovery</span>
          <span>Local chat history</span>
          <span>Inspectable review trail</span>
        </div>

        <ProductDemo />
      </section>

      <section className="section shell workflow-section" id="how-it-works">
        <div className="section-heading">
          <p className="kicker">A coordinated run</p>
          <h2>The job is divided before the answers are written.</h2>
          <p>Rivune mode is reserved for work that benefits from separate responsibilities and a genuine review. Simple requests stay simple.</p>
        </div>

        <div className="workflow-layout">
          <ol className="workflow-list">
            {workflow.map(([number, title, body]) => (
              <li key={number}>
                <span>{number}</span>
                <div><h3>{title}</h3><p>{body}</p></div>
              </li>
            ))}
          </ol>

          <aside className="decision-record" aria-label="Example collaboration decision">
            <div className="record-heading"><span>Example decision record</span><i>Complete</i></div>
            <div className="record-question">
              <small>REQUEST</small>
              <p>Build a launch page for a native multi-AI workspace.</p>
            </div>
            <div className="record-row"><span>Builder</span><p>Own information architecture and implementation.</p></div>
            <div className="record-row"><span>Reviewer</span><p>Challenge product claims, hierarchy, and accessibility.</p></div>
            <div className="record-conflict">
              <small>RESOLVED DISAGREEMENT</small>
              <p>Lead with the working product rather than a large marketing claim.</p>
            </div>
            <div className="record-result"><small>DELIVERED</small><b>One tested page with honest capability boundaries.</b></div>
          </aside>
        </div>
      </section>

      <section className="section shell" id="connect">
        <div className="section-heading section-heading--split">
          <div><p className="kicker">What works today</p><h2>Clear boundaries, not feature theater.</h2></div>
          <p>Rivune can safely discover tools only when it has a compatible adapter that understands their arguments, authentication, output, cancellation, and permission model. It never guesses how to run an arbitrary terminal command.</p>
        </div>

        <div className="capability-table" role="table" aria-label="Current provider availability">
          <div className="capability-head" role="row">
            <span role="columnheader">Connection</span><span role="columnheader">Status</span><span role="columnheader">Requirement</span><span role="columnheader">Current role</span>
          </div>
          {capabilities.map(([name, status, requirement, role]) => (
            <div className="capability-row" role="row" key={name}>
              <b role="cell">{name}</b>
              <span role="cell" className={`status-label status-label--${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>
              <span role="cell">{requirement}</span>
              <span role="cell">{role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section shell release" id="updates">
        <div className="release__heading">
          <div>
            <p className="kicker">Rivune 0.2 · Source preview 4</p>
            <h2>Inspect the downloadable source preview.</h2>
            <p className="release__description">A public source prerelease for developers, tagged v0.2.0-source-preview.4. The native project is build 2026090607; the archive includes a revision-bound source manifest. Build it with Xcode; it is not a Mac installer.</p>
            <a className="text-link" href={sourceRelease.page}>View prerelease on GitHub <span aria-hidden="true">→</span></a>
          </div>
          <dl className="release__meta" aria-label="Current Rivune release">
            <div><dt>Status</dt><dd>Public source prerelease</dd></div>
            <div><dt>Archive</dt><dd>11,064,421 bytes · <a href={sourceRelease.checksum} title={sourceRelease.sha256}>SHA-256 {sourceRelease.sha256.slice(0, 12)}…{sourceRelease.sha256.slice(-8)}</a></dd></div>
            <div><dt>Platform</dt><dd>Universal macOS 26+</dd></div>
            <div><dt>Engines</dt><dd>Locally discovered compatible CLI adapters</dd></div>
            <div><dt>Installer</dt><dd>Unavailable: signing required</dd></div>
          </dl>
        </div>

        <div className="release__notes">
          {releaseUpdates.map((update, index) => (
            <article key={update.title}>
              <span aria-hidden="true">0{index + 1}</span>
              <h3>{update.title}</h3>
              <p>{update.body}</p>
            </article>
          ))}
        </div>

        <div className="release__boundary">
          <strong>Release boundary</strong>
          <p>No Developer ID certificate is configured, so the Mac DMG is unavailable. An installer can be offered only after Developer ID signing, Apple notarization, stapling, and Gatekeeper acceptance all succeed.</p>
        </div>
      </section>

      <section className="section shell open-source" id="open-source">
        <div className="open-source__intro">
          <p className="kicker">Open source by default</p>
          <h2>Inspect the workflow before you trust it.</h2>
          <p>The public repository includes native Mac and iPhone source, provider connections, orchestration prompts, tests, dependency notices, and build instructions. Download the prerelease archive with its source manifest and SHA-256 checksum.</p>
          <a className="button button--quiet source-download" href={sourceRelease.archive}>Download source archive <span aria-hidden="true">↓</span></a>
          <a className="text-link source-checksum" href={sourceRelease.checksum}>Verify source checksum <span aria-hidden="true">→</span></a>
          <a className="text-link source-checksum" href={sourceRelease.repository}>Browse source on GitHub <span aria-hidden="true">→</span></a>
        </div>
        <div className="source-facts">
          <div><span>License</span><b>Apache-2.0</b></div>
          <div><span>Execution</span><b>Compatible provider adapters on your Mac</b></div>
          <div><span>Cloud</span><b>Future managed service, separate from the local app</b></div>
          <div><span>Credentials</span><b>Provider sign-ins or your own API keys</b></div>
          <div><span>History</span><b>Stored locally by default</b></div>
          <div><span>Integrity</span><b>SHA-256 published with the archive</b></div>
          <div><span>Extending</span><b>Provider-neutral catalog and adapter boundary</b></div>
          <div><span>Build</span><b>Xcode project and deterministic tests included</b></div>
        </div>
      </section>

      <section className="section shell data-flow" id="data-sharing" aria-labelledby="data-sharing-title">
        <p className="kicker">Before you download</p>
        <h2 id="data-sharing-title">Where your request goes.</h2>
        <p>The offered source preview stores conversation history locally. Local storage does not mean AI requests stay on your Mac: connected providers process the material you send to them.</p>
        <p>Rivune mode shares prompt-derived plans, contributions, independent reviews, and the integration request with OpenAI and Anthropic. A direct-provider mode sends the request to the selected provider. Review your prompt, included conversation context, and attached text before sending; use a single-provider mode when material must not be shared with both providers.</p>
        <p>You need the appropriate provider account and access for the connection you use. Provider usage terms, limits, and charges apply. Rivune account sign-in is separate from those provider connections and does not provide model access or cloud conversation sync. Account providers are disabled in this public source export until an operator configures their own supported backend.</p>
        <p>This website’s tour is prewritten and sends no model request. The source archive lets you inspect the app’s behavior before building it. Provider processing and retention follow the applicable provider terms; Rivune does not promise that remote processing is local or retention-free.</p>
      </section>

      <section className="download shell" id="download">
        <div>
          <p className="kicker">Mac release status</p>
          <h2>Source today. A trusted Mac installer next.</h2>
          <p>Download source preview 0.2, preview 4, from the GitHub prerelease. It must be built with Xcode. The drag-to-Applications DMG remains unavailable until Developer ID signing, notarization, stapling, and Gatekeeper checks pass.</p>
        </div>
        <div className="download__actions">
          <a className="button button--primary" href={sourceRelease.archive}>Download source preview <span aria-hidden="true">↓</span></a>
          <a className="text-link" href={sourceRelease.checksum}>Verify source checksum <span aria-hidden="true">→</span></a>
          <a className="text-link" href={sourceRelease.page}>Read prerelease notes <span aria-hidden="true">→</span></a>
          <a className="text-link" href="#data-sharing">Read how requests and data are shared <span aria-hidden="true">↑</span></a>
          <span className="release-status"><i aria-hidden="true" /> Mac installer unavailable: signing required</span>
          <small>The app discovers compatible CLIs after it is installed; a web page cannot inspect commands on your Mac.</small>
        </div>
      </section>

      <footer className="footer shell">
        <a className="brand" href="#top" aria-label="Rivune home"><Mark compact /><span className="rivune-wordmark" role="img" aria-label="Rivune">Rivune</span></a>
        <div className="footer__legal"><a href="#data-sharing">Privacy &amp; data sharing</a><p>Independent open-source software. Not affiliated with OpenAI, Anthropic, Apple, Tesla, or their products.</p></div>
        <span>Rivune 0.2 source preview 4 · © 2026 contributors</span>
      </footer>
    </main>
  );
}
