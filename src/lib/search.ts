import type { AppState } from '@/store/AppStore';
import { NAV_ITEMS } from './navigation';

export type SearchKind = 'Page' | 'Project' | 'Client' | 'Brief' | 'Campaign' | 'Prompt' | 'Design';

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  to: string;
}

function matches(q: string, ...fields: Array<string | undefined>): boolean {
  const hay = fields.filter(Boolean).join(' ').toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

export function search(state: AppState, query: string): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const clientName = (id: string | null) => state.clients.find((c) => c.id === id)?.company ?? '';
  const out: SearchResult[] = [];

  for (const n of NAV_ITEMS) {
    if (matches(q, n.label, n.keywords)) out.push({ kind: 'Page', id: n.to, title: n.label, subtitle: 'Go to page', to: n.to });
  }
  for (const p of state.projects) {
    if (matches(q, p.name, p.description, p.category, p.status, clientName(p.clientId)))
      out.push({ kind: 'Project', id: p.id, title: p.name, subtitle: [clientName(p.clientId), p.category, p.status].filter(Boolean).join(' · '), to: `/projects?focus=${p.id}` });
  }
  for (const c of state.clients) {
    if (matches(q, c.name, c.company, c.industry, c.notes, c.email))
      out.push({ kind: 'Client', id: c.id, title: c.company, subtitle: `${c.name} · ${c.industry}`, to: `/clients?focus=${c.id}` });
  }
  for (const b of state.briefs) {
    if (matches(q, b.input.projectName, b.input.client, b.input.projectType, b.input.keyMessage, b.output.headline))
      out.push({ kind: 'Brief', id: b.id, title: b.input.projectName, subtitle: `Brief · ${b.input.client}`, to: `/brief?id=${b.id}` });
  }
  for (const c of state.campaigns) {
    if (matches(q, c.input.brand, c.input.product, c.input.occasion, c.output.bigIdea, c.output.taglines.join(' ')))
      out.push({ kind: 'Campaign', id: c.id, title: `${c.input.brand} — ${c.output.bigIdea}`, subtitle: `Campaign · ${c.input.product}`, to: `/campaign?id=${c.id}` });
  }
  for (const d of state.designs) {
    if (matches(q, d.name, d.campaign, d.content.headline, d.content.brief, clientName(d.clientId)))
      out.push({ kind: 'Design', id: d.id, title: d.name, subtitle: `Design · ${d.width} × ${d.height}`, to: `/studio/${d.id}` });
  }
  for (const s of state.promptSets) {
    if (matches(q, s.input.idea, s.input.style))
      out.push({ kind: 'Prompt', id: s.id, title: s.input.idea, subtitle: `${s.prompts.length} prompts`, to: `/prompts?id=${s.id}` });
  }
  return out;
}
