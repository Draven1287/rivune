/** Authored local fixture. These contributions never claim to come from live providers. */
export interface CouncilDemo {
  title: string;
  summary: string;
  contributions: { perspective: string; summary: string; detail: string }[];
}
export const councilDemoPrompt = 'Would a neighborhood café with evening workshops be a good idea?';
export const councilDemo: CouncilDemo = {
  title: 'Build the community first.',
  summary: 'Start with three evening workshops in a borrowed space. Use repeat attendance and customer feedback to decide whether a permanent café makes sense.',
  contributions: [
    { perspective: 'Demand', summary: 'Test whether people return', detail: 'Invite a small local audience to three different workshops. Track repeat attendance and ask what people would pay to attend again. Interest in one event is not yet evidence of a sustainable café.' },
    { perspective: 'Operations', summary: 'Keep overhead flexible', detail: 'Partner with an existing venue and offer a small menu. Record preparation, hosting, and cleanup time so the next experiment reflects the actual workload.' },
    { perspective: 'Risks', summary: 'Validate before signing a lease', detail: 'Set a limited experiment budget. Compare event income with venue, materials, and staffing costs before making a long-term commitment.' },
  ],
};
export function parseCouncilDemo(value: unknown): CouncilDemo | undefined {
  if (!value || typeof value !== 'object') return;
  const v = value as CouncilDemo;
  const valid = (s: unknown, max: number) => typeof s === 'string' && s.length > 0 && s.length <= max;
  if (!valid(v.title, 200) || !valid(v.summary, 2000) || !Array.isArray(v.contributions) || v.contributions.length < 2 || v.contributions.length > 4) return;
  if (!v.contributions.every(c => c && valid(c.perspective, 100) && valid(c.summary, 300) && valid(c.detail, 3000))) return;
  return {title:v.title,summary:v.summary,contributions:v.contributions.map(c=>({perspective:c.perspective,summary:c.summary,detail:c.detail}))};
}
