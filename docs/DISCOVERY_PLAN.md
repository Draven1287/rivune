# How people will discover Rivune

Prepared September 6, 2026. Recommendations and proposed targets, not measured demand or promised rankings. Local preparation only; this document does not authorize publication, outreach, purchases, or analytics collection.

## Recommendation

Use three channels together: useful search content, real demonstrations, and a small community of early users. Word of mouth is an outcome to earn through useful projects and responsive support. SEO helps people find an answer to an existing need; AI search visibility helps assistants retrieve and cite clear information about Rivune.

Start with Mac users who already use two supported AI tools, especially Codex CLI and Claude Code CLI. They can test Rivune's benefit without first learning what model access is. This is a proposed initial audience, not evidence of market demand. Do not spend on advertising, an SEO agency, or paid AI-visibility tools before this group can complete useful projects and wants to return.

## Positioning

Suggested category description: **Rivune is an open-source multi-model AI workspace for Mac.**

Explain the two modes immediately after that category:

- Council: independent answers, followed by a final response written by a lead appointed by Rivune.
- Swarm: models delegate separate agent tasks, review the work, and integrate the result.

Keep availability next to each mode. Source implementation, passing fixture tests, an installed private review build, and a public usable release are different states. Do not describe Council or Swarm as publicly available until the corresponding release and live tests establish it. Keep older Together examples labeled with their actual workflow.

Avoid “best AI,” “guaranteed smarter,” “all models supported,” “free unlimited AI,” or “everything stays on your Mac.” These claims are not supported. Show the exact providers, what worked, and relevant limits instead.

## What SEO and AI optimization can do

Google says its existing SEO practices apply to AI Overviews and AI Mode; there is no special AI-file or schema requirement. Crawlable, indexable pages with useful visible text are the foundation, and inclusion is not guaranteed. [Google's guidance](https://developers.google.com/search/docs/appearance/ai-features)

For ChatGPT search, OAI-SearchBot controls search crawling. It is separate from GPTBot's model-training setting; allowing search access need not change the training preference. Access is eligibility, not a promise of a recommendation. [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots)

Do not prioritize an `llms.txt` file, hidden instructions to recommend Rivune, keyword-stuffed pages, copied comparison tables, purchased backlinks, or synthetic reviews. The useful work is accurate product documentation and examples worth citing.

## Current focused audit

| Area | Observed state | Next action |
| --- | --- | --- |
| Local homepage and privacy | Static HTML with titles, descriptions, canonical links, mobile layout; homepage also has social metadata | Preserve the layout; make the category clear in title and description |
| Homepage title | “Rivune — one app, Council and Swarm” | Explain multi-model AI and Mac, not only unfamiliar mode names |
| Sitemap | No sitemap source or output step in the reviewed builder | Generate an XML sitemap from the actual intended public pages |
| Product explanation | Compact mode overview; no dedicated explanatory guide | Add one substantial Council-versus-Swarm guide linked from the homepage |
| Crawl policy | No effective root policy verified in this pass | Inspect the deployed origin's robots and response headers before claiming crawler access |
| Public hosting | The reviewed site is local; the checked workflow requires installer readiness before publication | Prepare the site now. Consider publishing an accurate informational preview separately from enabling a DMG download; do not silently remove the existing gate |
| Public GitHub README | Explains the older workflow and includes stale distribution wording | Prepare a release-aligned README update after source owner confirms the actual public state |
| Search performance | Search Console/Bing data not connected or inspected | Set a baseline after public hosting and ownership verification |

Suggested title: `Rivune — Multi-Model AI Workspace for Mac`.

Suggested description: `An open-source Mac workspace for multiple AI providers. Explore Council and Swarm, two collaboration modes in development, and check release availability.`

The default Pages project address can provide a public home without buying a domain. GitHub documents project hosting and the default GitHub Pages URLs. A custom domain can wait. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

Technical caution: at a project URL ending in `/rivune/`, a file at `/rivune/robots.txt` does not control the origin's crawlers. The effective file belongs at the host root `/robots.txt`. Root-site ownership must be established before editing it, and any existing rules for other projects must be preserved. Absence of a robots file is not itself a crawl block. [Google's robots guidance](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt)

## Content to create

These are query hypotheses based on product relevance. No search volume, keyword difficulty, current position, or backlink authority has been measured. Combine related questions into useful guides rather than creating a page per phrase.

| Reader's question / candidate query | Intent | Useful content | Priority |
| --- | --- | --- | --- |
| What is Rivune? | Product lookup | Clear homepage, exact availability, screenshot, requirements | First |
| Multi-model AI app for Mac | Product discovery | Homepage and real use cases | First |
| Use Codex and Claude together | Practical setup | Tested connection guide, account versus integration explanation | First |
| AI council versus agent swarm | Understanding modes | One guide with examples, limits, and current status | First |
| Can two AI models review each other's work? | Understanding workflow | Recorded Council example once live acceptance passes | Next |
| Do I need API keys for Rivune? | Setup | Current CLI/API requirements and provider-specific limits | Next |
| Where does Rivune store chats and send prompts? | Trust | Existing privacy page plus accurate mode-specific data flow | First |
| Build a website with multiple AI agents | Project help | Reproducible Swarm project only after real agents and checks work | After Swarm acceptance |
| Rivune versus separate Codex and Claude windows | Comparison | Factual workflow tradeoffs with the same task, time, and quality criteria | Later |
| How do I install or update Rivune? | Activation | Three-step DMG guide and verified update behavior when released | At installer release |

The website task owns the immediate metadata, sitemap, and mode guide. Future content should come from actual support questions and finished projects, not a daily quota of generated blog posts.

## Distribution sequence

### Before broad promotion

1. Finish and record one useful Council task and one real Swarm project. Show errors and limitations rather than editing a demo to imply nonexistent steps.
2. Prepare a 45–90 second video: a concrete request, models/agents doing actual work, the usable result, and where to get Rivune. Accompany it with a text explanation and exact tested build.
3. Make the product information page publicly reachable when approved. It can clearly say “in development”; an unavailable installer must stay unavailable.
4. Prepare the GitHub README with a screenshot, who it is for, source versus app-download distinction, current mode status, and links to the real product page and documentation.

### First small pilot

Invite five to ten people who match the initial audience and can use the supported providers. This is a proposed recruiting target. Invitations remain drafts until the user authorizes their actual recipients and channel.

Ask each person to complete a project they already care about. Watch where they get stuck: installation, connections, choosing a mode, understanding the lead, finding files, or saving the result. Ask “Would you use this again for your next project?” and investigate the reason.

Use permission-based quotes and real examples. A participant's honest recommendation is more valuable than manufactured stars or praise.

### Broader discovery after people can use it

Share the demo and source in a small number of relevant developer communities, disclose that you built Rivune, follow each community's posting rules, and answer questions. Do not mass-post the same promotion or ask for coordinated votes. Show HN is an option only when there is something people can actually try; its guidelines exclude a mere landing page or signup page. [Show HN guidelines](https://news.ycombinator.com/showhn.html)

Use each genuinely useful release as another reason to publish a short explanation or demo. Public progress should describe outcomes and known limits, not a stream of unsupported feature announcements.

## Measurement without a paid stack

The practical funnel is: relevant visitor → understands Rivune → obtains the correct build → connects providers → completes a useful task → returns.

- After deployment, verify an appropriate URL-prefix property in Google Search Console and Bing Webmaster Tools, then submit the actual sitemap. Do not claim indexing merely because a sitemap was submitted.
- Track indexed pages, search queries, impressions, and clicks in Search Console. Google's cited guidance includes AI-feature traffic within the Web performance report; do not assume a separate universal AI-ranking report exists.
- Bing's AI Performance preview reports citations and cited pages across supported surfaces. Citations are not ranking positions, visits, downloads, or active users. [Bing's announcement](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)
- Keep a manual pilot sheet for first successful task and voluntary return use. No tracking SDK, advertising pixel, account collection, or consent changes are required for this initial plan.
- If checking AI answers manually, record date, product/version, exact unbranded query, whether web search was used, cited URL, and factual accuracy. Results vary; a single answer is not a stable ranking. Do not ask a leading question containing Rivune's name and call the response organic discovery.
- GitHub stars, source-download counts, AI citations, and repeat file downloads are supporting signals. The main early evidence is that people complete useful projects and choose to return.

Proposed first-pilot success threshold: at least four of five observed testers finish one task without intervention; at least three choose to use Rivune again within a week. These are hypotheses for deciding what to improve, not current results or a launch guarantee.

## Immediate assignments and boundaries

- Root: discovery plan, product proof requirements, truthful status, and review of completed website changes.
- Review and update website daily: local metadata, canonical sitemap, linked mode guide, focused tests, and desktop/mobile review.
- Native and worker tasks: keep building/test-verifying the product. Do not divert them into promotional claims or new marketing integrations.
- Later user action: approved public hosting, search-property ownership verification, and any actual outreach. No purchase, domain registration, public post, analytics installation, or release publication was performed for this plan.
