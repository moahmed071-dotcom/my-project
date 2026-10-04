/**
 * Local creative knowledge base used by the offline generation engine.
 * It maps free-text input onto a sector + tone profile so the mock engine
 * can produce output that reads like a considered art-direction response.
 */

// ─── Deterministic randomness ─────────────────────────────────────────────────

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

export function createRng(seed: string | number): Rng {
  let a = typeof seed === 'number' ? seed : hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function pickMany<T>(rng: Rng, arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

export function clean(s: string | undefined | null): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

export function or(s: string | undefined | null, fallback: string): string {
  const c = clean(s);
  return c.length ? c : fallback;
}

export function sentence(s: string): string {
  const c = clean(s);
  if (!c) return c;
  const cap = c[0].toUpperCase() + c.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
}

export function lowerFirst(s: string): string {
  const c = clean(s);
  return c ? c[0].toLowerCase() + c.slice(1) : c;
}

export function stripPeriod(s: string): string {
  return clean(s).replace(/[.!?]+$/, '');
}

export function titleCase(s: string): string {
  return clean(s)
    .split(' ')
    .map((w) => (w.length > 3 || /^[a-z]/.test(w) ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function splitList(s: string): string[] {
  return clean(s)
    .split(/[,;\n]|\s+\+\s+|\s+&\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// ─── Sector profiles ──────────────────────────────────────────────────────────

export type SectorId =
  | 'realEstate'
  | 'luxury'
  | 'tech'
  | 'food'
  | 'fashion'
  | 'automotive'
  | 'hospitality'
  | 'general';

export interface SectorProfile {
  id: SectorId;
  label: string;
  keywords: string[];
  environments: string[];
  materials: string[];
  palettes: string[];
  lighting: string[];
  motifs: string[];
  audienceInsights: string[];
  successMetrics: string[];
  bigIdeas: { name: string; thought: string }[];
  taglines: string[];
  pillars: { name: string; description: string }[];
  subjects: string[];
}

export const SECTORS: SectorProfile[] = [
  {
    id: 'realEstate',
    label: 'Real Estate',
    keywords: [
      'real estate', 'property', 'properties', 'villa', 'apartment', 'residence', 'residences', 'tower',
      'development', 'developer', 'off-plan', 'penthouse', 'community', 'townhouse', 'compound', 'mall',
      'waterfront', 'home', 'homes', 'living', 'estate', 'masterplan',
    ],
    environments: [
      'a sculpted waterfront residence at the edge of a calm marina',
      'a double-height living room opening onto a private terrace above the skyline',
      'a landscaped courtyard framed by warm stone and soft palms',
      'a quiet residential boulevard lined with mature trees at golden hour',
      'a sunlit penthouse lounge with floor-to-ceiling glazing overlooking the sea',
    ],
    materials: [
      'travertine, brushed bronze, oak veneer and fluted glass',
      'honed limestone, matte black steel and linen textiles',
      'polished concrete, walnut joinery and smoked mirror',
      'white marble, champagne metal accents and bouclé upholstery',
    ],
    palettes: [
      'warm sand, ivory and deep bronze with a dusk-blue counterpoint',
      'stone grey, soft oat and muted olive with brass highlights',
      'sun-washed beige, terracotta and evening navy',
      'pearl white, champagne gold and charcoal',
    ],
    lighting: [
      'low golden-hour sun raking across façades with long soft shadows',
      'blue-hour exterior with warm interior glow spilling through the glazing',
      'bright diffused daylight with gentle bounce from pale stone surfaces',
    ],
    motifs: ['architectural lines', 'framed views', 'thresholds and doorways', 'water reflections', 'skyline silhouettes'],
    audienceInsights: [
      'They are not buying square metres — they are buying the next chapter of their life and the status that comes with the address.',
      'Trust is the real currency: they need proof of delivery, quality and long-term value before the emotion can land.',
      'They compare dozens of launches that look identical; the one that feels like a lifestyle, not a floorplan, wins the shortlist.',
    ],
    successMetrics: [
      'Qualified lead volume and cost-per-lead against the launch benchmark',
      'Sales-centre and showroom appointment bookings',
      'Brochure downloads and floorplan enquiries',
      'Unit reservations within the launch window',
    ],
    bigIdeas: [
      { name: 'The Address Is the Statement', thought: 'Position the development as a declaration of who the buyer has become.' },
      { name: 'Room to Become', thought: 'Every space is framed as a stage for the life the buyer is growing into.' },
      { name: 'Life, Composed', thought: 'Treat the community like a carefully composed piece — every detail considered, nothing accidental.' },
      { name: 'Above Everyday', thought: 'Elevate the daily routine into a ritual, from the morning view to the evening return home.' },
    ],
    taglines: [
      'Live above the ordinary.',
      'Where your next chapter begins.',
      'Designed around the way you live.',
      'An address that speaks for itself.',
      'Home, considered.',
      'Space to become.',
      'The view changes everything.',
      'Built for the life ahead.',
    ],
    pillars: [
      { name: 'Lifestyle', description: 'Day-in-the-life moments that sell the feeling of living there.' },
      { name: 'Architecture & Design', description: 'Materials, details and spatial storytelling from the design team.' },
      { name: 'Location & Connectivity', description: 'Maps, drive times and neighbourhood highlights that remove friction.' },
      { name: 'Investment Value', description: 'Payment plans, ROI and developer track record framed with clarity.' },
      { name: 'Progress & Proof', description: 'Construction updates, handovers and resident testimonials.' },
    ],
    subjects: ['a contemporary residential tower', 'a luxury villa façade', 'a modern apartment interior', 'a gated community masterplan'],
  },
  {
    id: 'luxury',
    label: 'Luxury',
    keywords: ['luxury', 'premium', 'jewel', 'jewelry', 'jewellery', 'watch', 'couture', 'perfume', 'fragrance', 'oud', 'gold', 'exclusive', 'bespoke'],
    environments: [
      'a minimal gallery space with a single plinth and soft-washed walls',
      'a dark velvet set with a sculptural stone pedestal',
      'a private salon with lacquered surfaces and a single shaft of light',
    ],
    materials: ['polished gold, black lacquer and silk', 'brushed platinum, onyx and velvet', 'crystal, satin and veined marble'],
    palettes: ['jet black, warm gold and ivory', 'deep oxblood, champagne and smoke', 'midnight navy, pearl and brushed silver'],
    lighting: ['single hard key light with deep controlled shadow', 'soft overhead pool of light with rich falloff', 'rim light tracing the silhouette against black'],
    motifs: ['negative space', 'precise symmetry', 'slow reveals', 'macro texture'],
    audienceInsights: [
      'They value restraint over noise — the less a brand explains, the more confident it feels.',
      'Ownership is about identity and belonging to an inner circle, not about the price tag.',
    ],
    successMetrics: ['Boutique and appointment requests', 'Brand search lift and direct traffic', 'Engagement rate among high-value segments', 'Earned media and press pickup'],
    bigIdeas: [
      { name: 'Quiet Power', thought: 'Let craftsmanship speak in a whisper that carries further than a shout.' },
      { name: 'Made to Be Kept', thought: 'Frame every piece as an heirloom-in-waiting, chosen to outlast trends.' },
      { name: 'The Art of Less', thought: 'Strip everything back until only the essential — and the extraordinary — remains.' },
    ],
    taglines: ['Rare by design.', 'Made to be kept.', 'Nothing more. Nothing less.', 'Crafted for the few.', 'Time, perfected.', 'The quiet signature.'],
    pillars: [
      { name: 'Craft', description: 'Close-ups of making, materials and the hands behind the product.' },
      { name: 'Heritage', description: 'Stories of origin, savoir-faire and legacy.' },
      { name: 'Icons', description: 'Hero products presented as cultural objects.' },
      { name: 'Private World', description: 'Exclusive access, events and client experiences.' },
    ],
    subjects: ['a luxury product hero object', 'a crystal fragrance bottle', 'a fine timepiece', 'a sculptural jewellery piece'],
  },
  {
    id: 'tech',
    label: 'Technology',
    keywords: ['app', 'saas', 'tech', 'software', 'fintech', 'digital', 'platform', 'ai', 'startup', 'device', 'telecom', 'bank', 'banking', 'payment'],
    environments: [
      'a clean studio cyclorama with floating interface panels',
      'a modern city street at night with soft neon reflections',
      'a bright minimalist workspace with glass and plants',
    ],
    materials: ['frosted glass, anodised aluminium and soft-touch polymer', 'glossy acrylic, matte ceramic and light-emitting edges'],
    palettes: ['electric blue, graphite and pure white', 'deep violet, cyan and soft black', 'clean white, signal green and slate'],
    lighting: ['cool soft-box lighting with crisp specular highlights', 'gradient backlight glow with subtle bloom', 'bright high-key daylight'],
    motifs: ['grids and modules', 'data flows', 'glass layers', 'motion trails'],
    audienceInsights: [
      'They want technology to disappear — the less effort it takes, the more valuable it feels.',
      'They have downloaded and deleted a hundred apps; the first five seconds decide everything.',
    ],
    successMetrics: ['Install / sign-up conversion rate', 'Cost per acquisition', 'Day-7 retention', 'Feature adoption after launch'],
    bigIdeas: [
      { name: 'Effortless by Default', thought: 'Show life getting simpler the moment the product shows up.' },
      { name: 'Built for What’s Next', thought: 'Position the brand as the quiet engine behind people’s ambitions.' },
      { name: 'The Invisible Upgrade', thought: 'Celebrate everything users no longer have to think about.' },
    ],
    taglines: ['Less effort. More life.', 'Built for what’s next.', 'Simple, finally.', 'Your world, upgraded.', 'Made to move with you.', 'Smart starts here.'],
    pillars: [
      { name: 'Product in Action', description: 'Short demos showing real outcomes in seconds.' },
      { name: 'User Stories', description: 'Real people, real use cases, measurable results.' },
      { name: 'Education', description: 'Tips, how-tos and myth-busting that build trust.' },
      { name: 'Culture & Vision', description: 'The team, the mission and where the product is heading.' },
    ],
    subjects: ['a sleek smartphone displaying the app', 'a premium tech device', 'a person interacting with a floating interface'],
  },
  {
    id: 'food',
    label: 'Food & Beverage',
    keywords: ['restaurant', 'food', 'coffee', 'cafe', 'café', 'beverage', 'drink', 'bakery', 'burger', 'dessert', 'chocolate', 'juice', 'dining', 'kitchen', 'f&b'],
    environments: [
      'a rustic stone countertop with scattered fresh ingredients',
      'a warm, busy open kitchen with motion in the background',
      'a sunlit café table by a window with soft street bokeh',
    ],
    materials: ['ceramic, linen, raw wood and condensation-beaded glass', 'slate, copper and parchment', 'matte stoneware, brushed steel and fresh herbs'],
    palettes: ['warm caramel, cream and deep espresso', 'tomato red, basil green and off-white', 'citrus yellow, coral and fresh mint'],
    lighting: ['soft directional window light from the side', 'warm practical tungsten glow with gentle haze', 'bright backlight for translucency and steam'],
    motifs: ['steam and pour shots', 'hands sharing food', 'ingredient flat-lays', 'texture macros'],
    audienceInsights: [
      'They eat with their eyes first and share before they taste.',
      'Food is the excuse; the moment with people is the real product.',
    ],
    successMetrics: ['Footfall and reservation uplift', 'Delivery app orders', 'UGC and tagged posts', 'Average order value during campaign'],
    bigIdeas: [
      { name: 'Made for Sharing', thought: 'Every dish is the beginning of a conversation around the table.' },
      { name: 'Taste the Moment', thought: 'Turn everyday cravings into small, memorable rituals.' },
    ],
    taglines: ['Made to be shared.', 'Taste the moment.', 'Real food. Real good.', 'Crafted fresh, every day.', 'Come hungry. Leave happy.'],
    pillars: [
      { name: 'Hero Dishes', description: 'Signature items shot like celebrities.' },
      { name: 'Behind the Pass', description: 'Chefs, sourcing and preparation stories.' },
      { name: 'Community Table', description: 'Guests, UGC and shared moments.' },
      { name: 'Offers & Seasonal', description: 'Limited menus and occasion-led promotions.' },
    ],
    subjects: ['a signature dish plated beautifully', 'a freshly poured specialty coffee', 'an indulgent dessert'],
  },
  {
    id: 'fashion',
    label: 'Fashion & Beauty',
    keywords: ['fashion', 'apparel', 'clothing', 'sneaker', 'beauty', 'cosmetic', 'cosmetics', 'skincare', 'makeup', 'abaya', 'streetwear', 'collection', 'boutique'],
    environments: [
      'a raw concrete studio with a single sculptural set piece',
      'an urban rooftop at sunset with the city behind',
      'a soft pastel set with draped fabric and mirrored surfaces',
    ],
    materials: ['silk, brushed cotton and chrome', 'glossy vinyl, wool and mirror', 'dewy skin textures, glass and satin'],
    palettes: ['butter yellow, chocolate and cream', 'monochrome black with a single acid accent', 'blush, sand and soft chrome'],
    lighting: ['high-contrast flash with crisp shadows', 'soft beauty-dish key with clean falloff', 'natural golden-hour backlight with flare'],
    motifs: ['movement and fabric flow', 'close-up texture', 'confident poses', 'editorial cropping'],
    audienceInsights: [
      'Style is self-expression — they want to be seen, not sold to.',
      'They trust creators and peers more than polished brand claims.',
    ],
    successMetrics: ['Product page traffic and add-to-cart rate', 'Creator content reach and saves', 'Sell-through of the hero collection', 'Follower growth'],
    bigIdeas: [
      { name: 'Wear Your Story', thought: 'Every look is a chapter in the wearer’s personal narrative.' },
      { name: 'Unapologetically You', thought: 'Celebrate individuality over trends.' },
    ],
    taglines: ['Wear your story.', 'Made to be seen.', 'Unapologetically you.', 'Style, unedited.', 'Own the moment.'],
    pillars: [
      { name: 'The Collection', description: 'Lookbooks and hero product drops.' },
      { name: 'Creators & Community', description: 'Styling by real people and creators.' },
      { name: 'Behind the Design', description: 'Process, inspiration and craft.' },
      { name: 'Styling Tips', description: 'How-to-wear and routine content.' },
    ],
    subjects: ['a model wearing the hero look', 'a skincare product with dewy texture', 'a pair of statement sneakers'],
  },
  {
    id: 'automotive',
    label: 'Automotive',
    keywords: ['car', 'cars', 'auto', 'automotive', 'vehicle', 'suv', 'ev', 'electric vehicle', 'motor', 'dealership'],
    environments: [
      'an empty desert highway stretching to the horizon',
      'a dark architectural tunnel with linear light strips',
      'a coastal mountain road with dramatic curves',
    ],
    materials: ['metallic paint, carbon fibre and Nappa leather', 'brushed aluminium, glass and rubber'],
    palettes: ['graphite, silver and a single signal colour', 'desert gold, black and dusk blue'],
    lighting: ['long-exposure light trails at dusk', 'large overhead softbox reflecting along the body lines', 'hard sunset side light'],
    motifs: ['speed lines', 'reflections', 'aerial tracking', 'detail macros'],
    audienceInsights: ['The car is an extension of their identity and ambition.', 'Performance gets attention; trust and ownership costs close the deal.'],
    successMetrics: ['Test-drive bookings', 'Configurator sessions', 'Showroom visits', 'Lead-to-sale conversion'],
    bigIdeas: [
      { name: 'Drive Your Ambition', thought: 'The vehicle becomes the vessel for where the driver is going in life.' },
      { name: 'Every Road, Owned', thought: 'Celebrate confidence on any terrain and in any moment.' },
    ],
    taglines: ['Drive your ambition.', 'Every road, owned.', 'Built to move you.', 'Power, refined.'],
    pillars: [
      { name: 'Performance', description: 'Capability, specs and driving footage.' },
      { name: 'Design', description: 'Details, interiors and craft.' },
      { name: 'Ownership', description: 'Service, offers and peace of mind.' },
      { name: 'Journeys', description: 'Road trips and driver stories.' },
    ],
    subjects: ['a premium SUV in motion', 'a sleek electric sedan', 'a detailed car interior'],
  },
  {
    id: 'hospitality',
    label: 'Hospitality & Travel',
    keywords: ['hotel', 'resort', 'travel', 'tourism', 'spa', 'airline', 'destination', 'staycation', 'beach club'],
    environments: [
      'an infinity pool merging with the ocean at sunrise',
      'a serene spa interior with stone and water',
      'a boutique hotel suite with a balcony view of old-town rooftops',
    ],
    materials: ['natural linen, rattan, stone and water', 'teak, terrazzo and handwoven textiles'],
    palettes: ['sea glass, sand and sun-bleached white', 'terracotta, palm green and warm cream'],
    lighting: ['soft sunrise glow with gentle haze', 'warm candlelit evening ambience', 'bright Mediterranean midday light'],
    motifs: ['slow moments', 'water', 'views from within', 'textural details'],
    audienceInsights: ['They are buying a feeling of escape, not a room.', 'They plan with their eyes — imagery decides the booking.'],
    successMetrics: ['Direct booking revenue', 'Occupancy during campaign window', 'Website booking conversion', 'Average daily rate'],
    bigIdeas: [
      { name: 'Time, Slowed', thought: 'Sell the feeling of time stretching out the moment guests arrive.' },
      { name: 'Somewhere to Feel Something', thought: 'Every stay is framed as an emotional reset.' },
    ],
    taglines: ['Time, slowed.', 'Arrive. Exhale.', 'Stay for the feeling.', 'Your escape, perfected.'],
    pillars: [
      { name: 'The Escape', description: 'Atmospheric destination and property content.' },
      { name: 'Experiences', description: 'Dining, wellness and activities.' },
      { name: 'Guest Stories', description: 'Reviews and real guest moments.' },
      { name: 'Offers', description: 'Packages and seasonal rates.' },
    ],
    subjects: ['a luxury resort pool', 'a boutique hotel suite', 'a guest enjoying a quiet terrace moment'],
  },
  {
    id: 'general',
    label: 'Brand',
    keywords: [],
    environments: [
      'a clean, minimal studio set with sculptural props',
      'a contemporary urban setting with strong architectural lines',
      'a natural outdoor landscape in soft late-afternoon light',
    ],
    materials: ['matte paper, brushed metal and glass', 'soft fabrics, stone and natural wood'],
    palettes: ['off-white, charcoal and a confident brand accent', 'warm neutrals with a single saturated highlight'],
    lighting: ['soft directional key light with gentle shadow', 'natural daylight with clean bounce', 'dramatic side light with rich contrast'],
    motifs: ['bold typography', 'brand colour blocking', 'human moments', 'clean product heroes'],
    audienceInsights: [
      'They are busy and sceptical — they reward brands that are clear, useful and honest.',
      'They choose brands that reflect who they want to be, not just what they need.',
    ],
    successMetrics: ['Reach and frequency within the target segment', 'Engagement rate and saves', 'Click-through and conversion rate', 'Brand recall / awareness lift'],
    bigIdeas: [
      { name: 'Made for Moments Like This', thought: 'Anchor the brand in the real moments where it matters most.' },
      { name: 'The Better Way', thought: 'Show a familiar situation transformed by the brand.' },
      { name: 'Bold by Nature', thought: 'Turn the brand’s confidence into a visible, ownable attitude.' },
    ],
    taglines: ['Made for moments like this.', 'Better starts now.', 'Built around you.', 'Bold by nature.', 'Made to matter.', 'See it differently.'],
    pillars: [
      { name: 'Brand Story', description: 'Purpose, values and the people behind the brand.' },
      { name: 'Product Hero', description: 'Clear, benefit-led product content.' },
      { name: 'Community', description: 'Customers, UGC and social proof.' },
      { name: 'Education & Value', description: 'Helpful content that earns attention.' },
    ],
    subjects: ['a hero product on a minimal set', 'a confident person interacting with the brand', 'a bold brand visual'],
  },
];

export function detectSector(...texts: string[]): SectorProfile {
  const hay = ` ${texts.join(' ').toLowerCase()} `;
  let best: SectorProfile = SECTORS[SECTORS.length - 1];
  let bestScore = 0;
  for (const s of SECTORS) {
    let score = 0;
    for (const k of s.keywords) {
      const re = new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
      if (re.test(hay)) score += k.includes(' ') ? 2 : 1;
    }
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

// ─── Tone profiles ────────────────────────────────────────────────────────────

export interface ToneProfile {
  id: string;
  keywords: string[];
  adjectives: string[];
  typography: string;
  pacing: string;
  copyStyle: string;
  colorTemperature: string;
}

export const TONES: ToneProfile[] = [
  {
    id: 'premium',
    keywords: ['luxury', 'luxurious', 'premium', 'elegant', 'sophisticated', 'refined', 'exclusive', 'prestige'],
    adjectives: ['refined', 'confident', 'understated'],
    typography: 'High-contrast serif display paired with a light, generously tracked sans for body copy',
    pacing: 'slow, deliberate edits with lingering holds',
    copyStyle: 'short, assured lines with plenty of white space — never shouty',
    colorTemperature: 'warm and restrained',
  },
  {
    id: 'bold',
    keywords: ['bold', 'energetic', 'dynamic', 'exciting', 'loud', 'disruptive', 'edgy', 'youthful'],
    adjectives: ['bold', 'energetic', 'unapologetic'],
    typography: 'Heavy condensed grotesk set large, with tight leading and aggressive cropping',
    pacing: 'fast, rhythmic cuts synced to sound design',
    copyStyle: 'punchy imperatives and big statements',
    colorTemperature: 'high-saturation and high-contrast',
  },
  {
    id: 'warm',
    keywords: ['warm', 'friendly', 'family', 'human', 'caring', 'approachable', 'welcoming', 'emotional', 'heartfelt'],
    adjectives: ['warm', 'human', 'reassuring'],
    typography: 'Soft humanist sans with rounded details and comfortable line spacing',
    pacing: 'natural, observational rhythm with real moments',
    copyStyle: 'conversational, first-person and inclusive',
    colorTemperature: 'warm and sunlit',
  },
  {
    id: 'minimal',
    keywords: ['minimal', 'calm', 'clean', 'simple', 'serene', 'modern', 'contemporary'],
    adjectives: ['clean', 'modern', 'calm'],
    typography: 'Neo-grotesk sans in two weights, strict grid, generous margins',
    pacing: 'measured, architectural transitions',
    copyStyle: 'precise, economical and clear',
    colorTemperature: 'neutral and balanced',
  },
  {
    id: 'playful',
    keywords: ['playful', 'fun', 'quirky', 'witty', 'humorous', 'cheerful'],
    adjectives: ['playful', 'witty', 'optimistic'],
    typography: 'Expressive display type with characterful curves, mixed with a friendly sans',
    pacing: 'bouncy, surprising cuts and visual jokes',
    copyStyle: 'witty one-liners and unexpected wordplay',
    colorTemperature: 'bright and saturated',
  },
  {
    id: 'authoritative',
    keywords: ['corporate', 'professional', 'authoritative', 'trustworthy', 'trusted', 'credible', 'institutional', 'informative'],
    adjectives: ['credible', 'clear', 'assured'],
    typography: 'Structured sans with a disciplined typographic hierarchy and clear data styling',
    pacing: 'steady and confident',
    copyStyle: 'fact-led, clear and benefit-focused',
    colorTemperature: 'cool and composed',
  },
  {
    id: 'inspirational',
    keywords: ['inspirational', 'inspiring', 'aspirational', 'cinematic', 'epic', 'visionary', 'ambitious'],
    adjectives: ['aspirational', 'cinematic', 'uplifting'],
    typography: 'Elegant wide display face with dramatic scale shifts',
    pacing: 'building, cinematic crescendo',
    copyStyle: 'evocative and visionary, building to a powerful line',
    colorTemperature: 'golden and atmospheric',
  },
];

export function detectTone(text: string): ToneProfile {
  const hay = text.toLowerCase();
  let best = TONES[3];
  let bestScore = 0;
  for (const t of TONES) {
    const score = t.keywords.reduce((acc, k) => acc + (hay.includes(k) ? 1 : 0), 0);
    if (score > bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best;
}

// ─── Market helpers ───────────────────────────────────────────────────────────

const MENA = ['uae', 'dubai', 'abu dhabi', 'ksa', 'saudi', 'riyadh', 'jeddah', 'qatar', 'doha', 'kuwait', 'bahrain', 'oman', 'egypt', 'cairo', 'gcc', 'mena', 'middle east', 'jordan', 'morocco'];

export function isMena(market: string): boolean {
  const m = market.toLowerCase();
  return MENA.some((k) => m.includes(k));
}

export function marketNote(market: string): string {
  if (!clean(market)) return 'Adapt copy and casting to the primary market before production.';
  if (isMena(market)) {
    return `Design bilingual Arabic / English layouts from day one for ${market} — mirror grids for RTL, pair a quality Arabic typeface with the Latin system, and cast talent that reflects the local audience.`;
  }
  return `Localise copy, casting and cultural cues for ${market}, and validate references with a local reviewer before rollout.`;
}

// ─── Occasion helpers ─────────────────────────────────────────────────────────

export function occasionFlavour(occasion: string): string {
  const o = occasion.toLowerCase();
  if (!o.trim()) return '';
  if (o.includes('ramadan')) return 'Lean into Ramadan values — reflection, generosity and togetherness — with crescent-moon light, lanterns and the warm glow of iftar tables, avoiding cliché by focusing on genuine moments.';
  if (o.includes('eid')) return 'Capture Eid’s celebratory energy — family gatherings, gifting and new beginnings — with a festive yet elegant palette.';
  if (o.includes('national day')) return 'Celebrate national pride with flag-inspired colour accents used sparingly, local landmarks and stories of shared progress.';
  if (o.includes('launch')) return 'Treat the launch as an event: tease, reveal, then sustain — every touchpoint should feel like an unveiling.';
  if (o.includes('black friday') || o.includes('white friday') || o.includes('sale')) return 'Make urgency feel premium: countdown mechanics, bold numerals and a clear offer hierarchy without discount-bin aesthetics.';
  if (o.includes('summer')) return 'Use summer’s energy — sun, water, long days and freedom — with a bright, sun-bleached palette.';
  if (o.includes('new year')) return 'Frame the moment as a fresh start, with forward-looking language and celebratory light.';
  if (o.includes('valentine') || o.includes('mother')) return 'Build the work around genuine emotional connection and the gesture of giving.';
  return `Anchor the creative in ${occasion}, borrowing its rituals and visual codes so the campaign feels timely, not generic.`;
}
