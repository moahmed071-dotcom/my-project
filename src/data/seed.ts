import type { Brief, Campaign, Client, Project, PromptSet, Settings } from '@/types';
import { buildBrief } from '@/services/ai/engines/briefEngine';
import { buildCampaign } from '@/services/ai/engines/campaignEngine';
import { buildPrompts } from '@/services/ai/engines/promptEngine';

const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86_400_000 - h * 3_600_000).toISOString();

export const DEFAULT_SETTINGS: Settings = {
  userName: 'Mohamed',
  role: 'Senior Graphic Designer / Art Director',
  studio: 'Independent Studio',
  defaultMarket: 'UAE',
  defaultAspectRatio: 'Auto',
  aiProvider: 'local',
  remoteEndpoint: '',
  remoteModel: 'claude-sonnet-5-5',
  simulateLatency: true,
  compactSidebar: false,
};

export function seedClients(): Client[] {
  return [
    { id: 'cl_azure', name: 'Layla Haddad', company: 'Azure Shores Developments', industry: 'Real Estate', email: 'layla@azureshores.ae', notes: 'Prefers warm, sunlit imagery. Bilingual deliverables mandatory. Approvals via weekly Thursday call.', createdAt: daysAgo(120) },
    { id: 'cl_noor', name: 'Omar Khalil', company: 'Noor Oud & Fragrances', industry: 'Luxury / Fragrance', email: 'omar@noor-oud.com', notes: 'Heritage brand modernising for a younger audience. Gold must never look brassy.', createdAt: daysAgo(96) },
    { id: 'cl_pulse', name: 'Sara Mansour', company: 'Pulse Fintech', industry: 'Technology', email: 'sara@pulsepay.io', notes: 'Fast turnarounds, data-heavy. Brand book v2 shared in drive.', createdAt: daysAgo(64) },
    { id: 'cl_harvest', name: 'Youssef Adel', company: 'Harvest Kitchen', industry: 'Food & Beverage', email: 'youssef@harvestkitchen.co', notes: 'Three branches in Dubai, opening a fourth in Riyadh.', createdAt: daysAgo(41) },
    { id: 'cl_vela', name: 'Nadia Farouk', company: 'Vela Resorts', industry: 'Hospitality', email: 'nadia@velaresorts.com', notes: 'Summer campaign priority. Loves film-look grading.', createdAt: daysAgo(18) },
  ];
}

export function seedProjects(): Project[] {
  return [
    { id: 'pr_marina', name: 'Marina Crest Launch', clientId: 'cl_azure', category: 'Real Estate', status: 'In Progress', description: 'Full launch campaign for a 42-storey waterfront tower — key visual, brochure, hoardings, social and launch film.', createdAt: daysAgo(14), updatedAt: daysAgo(0, 3) },
    { id: 'pr_noor_rebrand', name: 'Noor Identity Refresh', clientId: 'cl_noor', category: 'Branding', status: 'Review', description: 'Modernising the logo, packaging system and retail guidelines while protecting heritage equity.', createdAt: daysAgo(30), updatedAt: daysAgo(1) },
    { id: 'pr_ramadan', name: 'Ramadan Gifting Collection', clientId: 'cl_noor', category: 'Campaign', status: 'Planning', description: 'Seasonal gifting campaign with AI-assisted still-life visuals and a 30s hero film.', createdAt: daysAgo(6), updatedAt: daysAgo(2) },
    { id: 'pr_pulse_app', name: 'Pulse App Store Creatives', clientId: 'cl_pulse', category: 'Social Media', status: 'In Progress', description: 'App store screenshots, paid social suite and onboarding illustrations.', createdAt: daysAgo(10), updatedAt: daysAgo(0, 20) },
    { id: 'pr_harvest_menu', name: 'Harvest Seasonal Menu Shoot', clientId: 'cl_harvest', category: 'Advertising', status: 'Delivered', description: 'Food photography art direction and in-store POS for the autumn menu.', createdAt: daysAgo(40), updatedAt: daysAgo(12) },
    { id: 'pr_vela_film', name: 'Vela Summer Film', clientId: 'cl_vela', category: 'Video Production', status: 'Planning', description: 'Cinematic 60s resort film plus vertical cut-downs, shot over two days.', createdAt: daysAgo(4), updatedAt: daysAgo(4) },
    { id: 'pr_ai_lookbook', name: 'AI Interiors Lookbook', clientId: 'cl_azure', category: 'AI Imagery', status: 'On Hold', description: 'Exploratory AI-generated interior moodboards for three unit typologies.', createdAt: daysAgo(22), updatedAt: daysAgo(9) },
  ];
}

export function seedBriefs(): Brief[] {
  const a = {
    client: 'Azure Shores Developments',
    projectName: 'Marina Crest Launch',
    projectType: 'Real estate launch campaign',
    objective: 'Generate 1,200 qualified leads in the first eight weeks of launch',
    targetAudience: 'Affluent professionals and investors aged 32–55 in the UAE and GCC',
    market: 'UAE',
    platform: 'Instagram, Meta Ads, YouTube, OOH, Brochure',
    toneOfVoice: 'Premium, confident, warm',
    keyMessage: 'Waterfront living designed around the way you actually live',
    deliverables: 'Key visual, Bilingual brochure, Social suite, 30s launch film, Site hoardings',
    additionalNotes: 'Payment plan 60/40 must appear on all performance assets.',
  };
  const b = {
    client: 'Pulse Fintech',
    projectName: 'Pulse Card Launch',
    projectType: 'Fintech app launch',
    objective: 'Drive 50,000 app downloads in Q4',
    targetAudience: 'Digitally native young professionals aged 22–35',
    market: 'KSA',
    platform: 'TikTok, Instagram, Snapchat',
    toneOfVoice: 'Bold, energetic, clear',
    keyMessage: 'Your money, finally moving at your speed',
    deliverables: 'Social video suite, App store screenshots, Influencer kit',
    additionalNotes: '',
  };
  return [
    { id: 'br_seed_1', input: a, output: buildBrief(a), createdAt: daysAgo(2, 4) },
    { id: 'br_seed_2', input: b, output: buildBrief(b), createdAt: daysAgo(8) },
  ];
}

export function seedCampaigns(): Campaign[] {
  const a = {
    brand: 'Noor Oud',
    product: 'Ramadan Gifting Collection',
    objective: 'Drive gifting sales in-store and online',
    targetAudience: 'Gift-givers aged 28–50 across the GCC',
    market: 'UAE & KSA',
    occasion: 'Ramadan',
    tone: 'Luxury, warm, heartfelt',
    keyMessage: 'The most meaningful gifts are the ones that linger',
  };
  const b = {
    brand: 'Vela Resorts',
    product: 'Summer Escape Package',
    objective: 'Increase direct bookings for July and August',
    targetAudience: 'Couples and young families in the GCC',
    market: 'GCC',
    occasion: 'Summer',
    tone: 'Cinematic, calm, aspirational',
    keyMessage: 'Slow down and let summer find you',
  };
  return [
    { id: 'cp_seed_1', input: a, output: buildCampaign(a), createdAt: daysAgo(1, 6) },
    { id: 'cp_seed_2', input: b, output: buildCampaign(b), createdAt: daysAgo(5) },
  ];
}

export function seedPromptSets(): PromptSet[] {
  const input = {
    idea: 'A sunset penthouse terrace overlooking Dubai Marina with an infinity pool and a couple enjoying the view',
    style: 'Auto',
    aspectRatio: 'Auto',
    types: ['image', 'realEstate', 'cinematic'] as PromptSet['input']['types'],
  };
  return [{ id: 'ps_seed_1', input, prompts: buildPrompts(input), createdAt: daysAgo(3) }];
}
