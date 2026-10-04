import type { CampaignInput, CampaignOutput } from '@/types';
import {
  createRng,
  detectSector,
  detectTone,
  lowerFirst,
  marketNote,
  occasionFlavour,
  or,
  pick,
  pickMany,
  sentence,
  stripPeriod,
} from '../knowledge';

const SOCIAL_FORMATS = [
  {
    title: 'The Reveal',
    format: 'Reels / TikTok · 15s',
    build: (b: string, p: string) => `A slow-build tease that withholds ${p} until the final second — sound design carries the tension, the logo lands on the beat. Designed to stop the scroll and invite re-watches for ${b}.`,
  },
  {
    title: 'Swipe to Discover',
    format: 'Carousel · 6–8 frames',
    build: (_b: string, p: string) => `An editorial carousel that unfolds ${p} like a magazine spread: hero frame, three detail frames, one proof frame, a closing CTA frame. Built for saves and shares.`,
  },
  {
    title: 'Day in the Life',
    format: 'Stories series · 5 frames',
    build: (_b: string, p: string) => `Follow a real person from morning to evening, showing exactly where ${p} fits in. Interactive polls and question stickers turn viewers into participants.`,
  },
  {
    title: 'Creator Takeover',
    format: 'Creator collab · Reels',
    build: (b: string) => `Partner with two to three local creators who authentically match the audience. Give them the brief, not the script — their honest take on ${b} becomes the most credible asset in the campaign.`,
  },
  {
    title: 'Details Matter',
    format: 'Macro video loop · 6s',
    build: (_b: string, p: string) => `Ultra-close macro loops of textures, materials and craft moments from ${p}. Hypnotic, sound-on ASMR-style content that signals quality without a single word.`,
  },
  {
    title: 'Myth vs. Truth',
    format: 'Static series · 1:1',
    build: (b: string) => `A bold typographic series that flips common category assumptions on their head, with ${b} delivering the truth. Highly shareable and easy to localise.`,
  },
  {
    title: 'Countdown',
    format: 'Stories + Feed · Daily',
    build: (_b: string, p: string) => `A daily countdown system leading up to the key date, each day revealing one new reason to care about ${p}. Builds anticipation and gives paid media a rhythm.`,
  },
  {
    title: 'Ask the Expert',
    format: 'Talking head · 30–45s',
    build: (b: string) => `A short-form Q&A series where the people behind ${b} answer the audience’s real questions — builds authority and feeds the comments section.`,
  },
];

const VIDEO_STRUCTURES = [
  {
    title: 'The Hero Film',
    duration: '60s / 30s / 15s',
    logline: (b: string, p: string, idea: string) => `A cinematic brand film that brings “${idea}” to life — an emotional journey that ends with ${p} by ${b}.`,
    beats: (p: string) => [
      'Open on an intimate, quiet human moment — no product, just feeling.',
      'Build with layered visuals and rising score as the world expands.',
      `Reveal ${p} as the natural answer to the tension we’ve built.`,
      'Land the line and the end-frame lock-up on the final musical hit.',
    ],
  },
  {
    title: 'One Take',
    duration: '30s',
    logline: (_b: string, p: string) => `A single continuous camera move that glides through the world of ${p}, revealing one detail after another without a cut.`,
    beats: () => [
      'Start tight on a detail, then pull out to reveal the space.',
      'Move through three distinct moments, each with its own sound cue.',
      'Finish wide on the hero view with the tagline appearing in-world.',
    ],
  },
  {
    title: 'Before / After',
    duration: '15s',
    logline: (b: string) => `A sharp, split-rhythm edit contrasting life without and with ${b}.`,
    beats: (p: string) => [
      'Desaturated, cluttered “before” world with off-beat edits.',
      `A clean match-cut transition into the vivid world of ${p}.`,
      'End on product, benefit line and CTA within three seconds.',
    ],
  },
  {
    title: 'Voices',
    duration: '45s',
    logline: (b: string) => `Real people in their own words — a documentary-style montage showing what ${b} means to them.`,
    beats: () => [
      'Cold open on an honest, unscripted line from a real customer.',
      'Intercut three voices with b-roll that matches their story.',
      'Close on a shared sentiment and the brand line.',
    ],
  },
  {
    title: 'The Unboxing of a Feeling',
    duration: '20s · vertical',
    logline: (_b: string, p: string) => `A tactile, vertical-first film for social that treats ${p} like a gift being opened for the first time.`,
    beats: () => [
      'Hands, textures and anticipation in close-up.',
      'A moment of reveal shot in slow motion with crisp foley.',
      'A smile, a reaction, and a fast typographic CTA.',
    ],
  },
];

const CTA_BY_OBJECTIVE: { match: RegExp; primary: string; alts: string[] }[] = [
  { match: /lead|enquir|inquir|register|sign/i, primary: 'Register your interest', alts: ['Book a private viewing', 'Get the brochure', 'Speak to an advisor'] },
  { match: /sale|sell|buy|purchase|revenue|conver/i, primary: 'Shop now', alts: ['Discover the collection', 'Claim your offer', 'Reserve yours'] },
  { match: /book|reserv|visit|footfall|traffic/i, primary: 'Book your visit', alts: ['Reserve now', 'Find your nearest location', 'See what\u2019s on'] },
  { match: /download|install|app/i, primary: 'Download the app', alts: ['Try it free', 'Get started', 'See how it works'] },
  { match: /aware|launch|brand|position/i, primary: 'Discover more', alts: ['Be the first to know', 'Explore the story', 'Watch the film'] },
];

export function buildCampaign(input: CampaignInput): CampaignOutput {
  const rng = createRng(JSON.stringify(input));
  const sector = detectSector(input.product, input.brand, input.objective, input.keyMessage, input.occasion);
  const tone = detectTone(`${input.tone} ${input.keyMessage}`);

  const brand = or(input.brand, 'The brand');
  const product = or(input.product, 'the product');
  const audience = stripPeriod(or(input.targetAudience, 'the core audience'));
  const objective = stripPeriod(or(input.objective, 'build awareness and drive action'));
  const keyMessage = stripPeriod(or(input.keyMessage, `${product} makes life better`));
  const market = or(input.market, '');
  const occasion = or(input.occasion, '');

  const idea = pick(rng, sector.bigIdeas);
  const insight = pick(rng, sector.audienceInsights);
  const palette = pick(rng, sector.palettes);
  const lighting = pick(rng, sector.lighting);
  const environment = pick(rng, sector.environments);
  const materials = pick(rng, sector.materials);
  const motifs = pickMany(rng, sector.motifs, 2);

  // Taglines: sector bank + brand-led constructions, de-duplicated.
  const seasonal = /ramadan|eid|summer|winter|national day|new year|spring/i.test(occasion);
  const constructed = [
    `${brand}. ${idea.name}.`,
    seasonal ? `This ${occasion}, ${lowerFirst(stripPeriod(pick(rng, sector.taglines)))}.` : '',
    `${stripPeriod(keyMessage).split(' ').slice(0, 6).join(' ')}.`,
  ].filter((t) => t && t.length < 70);
  const norm = (t: string) => stripPeriod(t).toLowerCase();
  const taglines: string[] = [];
  for (const t of pickMany(rng, [...constructed, ...sector.taglines], constructed.length + sector.taglines.length)) {
    const n = norm(t);
    if (taglines.some((x) => norm(x).includes(n) || n.includes(norm(x)))) continue;
    taglines.push(sentence(t));
    if (taglines.length === 5) break;
  }
  while (taglines.length < 5) taglines.push(sentence(`${brand}, ${tone.adjectives[taglines.length % 3]} by design`));

  const occasionLine = occasionFlavour(occasion);

  const cta = CTA_BY_OBJECTIVE.find((c) => c.match.test(objective)) ?? CTA_BY_OBJECTIVE[CTA_BY_OBJECTIVE.length - 1];

  const socialIdeas = pickMany(rng, SOCIAL_FORMATS, 5).map((s) => ({
    title: s.title,
    format: s.format,
    description: s.build(brand, product),
  }));

  const videoConcepts = pickMany(rng, VIDEO_STRUCTURES, 3).map((v) => ({
    title: v.title,
    duration: v.duration,
    logline: v.logline(brand, product, idea.name),
    beats: v.beats(product),
  }));

  const pillars = pickMany(rng, sector.pillars, 4);

  return {
    bigIdea: idea.name,
    bigIdeaRationale: `${idea.thought} ${insight} “${idea.name}” gives ${brand} a single, ownable thought that turns “${lowerFirst(keyMessage)}” into something ${audience.toLowerCase()} can feel, not just read.`,
    concept: [
      `The campaign launches ${product} through the lens of “${idea.name}”.`,
      `Rather than listing features, we dramatise the emotional payoff: we show the audience the version of their life where ${lowerFirst(keyMessage)}.`,
      `The work is ${tone.adjectives.join(', ')} in tone, built in a modular system that rolls out from a hero film and key visual into social, digital and on-ground touchpoints.`,
      occasionLine,
    ]
      .filter(Boolean)
      .join(' '),
    taglines,
    keyVisual: [
      `Hero frame: ${sector.subjects[0]} set within ${environment}, composed with a single strong focal point and generous negative space for copy.`,
      `Lighting: ${lighting}.`,
      `Palette: ${palette}.`,
      `Headline lock-up placed on the upper third; logo and CTA anchored bottom-right with consistent margins across every format.`,
      `Formats: 16:9 master, 4:5 feed, 9:16 story, 1:1 and long-format OOH adaptations.`,
    ],
    artDirection: [
      `Typography — ${tone.typography}.`,
      `Materials & texture — ${materials}.`,
      `Signature motifs — ${motifs.join(' and ')}, used consistently to build recognition.`,
      `Photography — ${tone.colorTemperature} grade, natural skin tones, no over-retouching; cast real-feeling people.`,
      `Motion — ${tone.pacing}; type animates with restraint and always resolves on a clean frame.`,
      marketNote(market),
    ],
    socialIdeas,
    videoConcepts,
    cta: { primary: cta.primary, alternatives: cta.alts },
    contentPillars: pillars,
  };
}
