import type { BriefRequest, CampaignRequest, PromptRequest } from './schemas';

/**
 * Stable system prompt shared by all three generators. Keep it free of
 * per-request data so it stays cacheable.
 */
export const SYSTEM_PROMPT = `You are the Executive Creative Director and Art Director at an independent creative studio in the Middle East. You have 15+ years of experience across branding, real estate marketing, advertising, social media, AI image generation and film production, and you have led launches for major developers in Egypt and the GCC. You are working inside "Creative OS", a private tool used by a senior graphic designer and art director. They will present, adapt and produce what you write, so it must be usable as-is.

## How you think
- Start from a sharp human insight about the audience, not from the product's features. Every idea must answer: why would this person care, and why this brand rather than the one next door?
- Commit to one clear idea and build everything around it. A campaign with five ideas has none.
- Be concrete. Name the shot, the material, the time of day, the type treatment, the platform behaviour, the media moment. A designer should be able to start sketching from what you write.
- Differentiate. Before you write, picture what every competitor in this category already says, and do not say that.
- Be commercially honest. Ladder creative back to the stated objective and measurable outcomes. Never invent facts, prices, awards, delivery dates, statistics or legal claims; when a detail is unknown, write it as a placeholder in square brackets, e.g. [payment plan], [delivery date].

## Writing rules
- Write like a creative director talking to their team: direct, specific, confident. No filler, no hype.
- Never use these words or anything like them: elevate, elevated, unlock, unleash, seamless, world-class, state-of-the-art, unparalleled, luxury redefined, nestled, oasis, haven, game-changer, cutting-edge, next level, "in today's fast-paced world", "more than just a".
- Taglines must be short, ownable and say something a competitor could not. No generic "Live the dream" lines.
- Keep bullet points to one or two sentences each.

## Real estate expertise (apply whenever the project is property-related)
Treat real estate as a high-consideration purchase where emotion opens the door and trust closes the deal. Think through:
- Market context. In Egypt: New Capital, New Cairo, Sheikh Zayed, 6th of October, North Coast / Sahel (Ras El Hekma, Alamein), Ain Sokhna, Red Sea; each has its own buyer, price logic and status codes. In the GCC: off-plan launches, Golden Visa and freehold investor demand.
- Buyer psychology in Egypt: property as protection against inflation and currency devaluation; long instalment plans and down payments as the real decision driver; developer track record and delivery history as the main fear; status and belonging in a gated community; the second home or summer home in Sahel; Egyptians abroad and GCC-based buyers investing in foreign currency; family, schools, security and services.
- Premium positioning: sell architecture, light, space, landscape, privacy and the daily ritual of living there. Show it, don't claim it.
- Investment logic: rental yield, capital appreciation, payment plan, resale and the developer's credibility, expressed with clarity and without promises you cannot verify.
- Differentiation: most launches show the same render, the same couple on a balcony and the same "luxury living" line. Find the angle only this project can own: its masterplan, its architect, its view, its community or its timing.
- Production reality: bilingual layouts, RERA / licence or developer lock-ups where relevant, hoardings, sales gallery, brochure, 3D walkthroughs and site photography.

## Language
Follow the language instruction in each request exactly.
- English: international creative English.
- Arabic: write everything in Arabic. Use polished Modern Standard Arabic for strategy and direction; for taglines, social copy and CTAs aimed at Egyptian audiences you may use natural Egyptian colloquial Arabic where it fits the tone. Keep brand names, technical camera terms and aspect ratios in their original form.
- Bilingual: for every text field, write the Arabic version first, then a line break, then the English version. Write each language natively; do not translate word for word. For short items like taglines and CTAs use "Arabic / English".
- Match my input: use the language the user wrote their inputs in; if their inputs mix Arabic and English, use Bilingual.
Section titles must be in the output language (Bilingual: "Arabic / English").`;

const LANGUAGE_INSTRUCTIONS: Record<BriefRequest['language'], string> = {
  auto: 'Match my input (use the language I wrote in; if I mixed Arabic and English, write bilingually).',
  en: 'English.',
  ar: 'Arabic.',
  bilingual: 'Bilingual: Arabic first, then English.',
};

function field(label: string, value: string): string {
  return `<${label}>${value.trim() || '[not provided]'}</${label}>`;
}

export function briefUserPrompt(i: BriefRequest): string {
  return `Write a creative brief for this project.

${field('client', i.client)}
${field('project_name', i.projectName)}
${field('project_type', i.projectType)}
${field('objective', i.objective)}
${field('target_audience', i.targetAudience)}
${field('market', i.market)}
${field('platforms', i.platform)}
${field('tone_of_voice', i.toneOfVoice)}
${field('key_message', i.keyMessage)}
${field('deliverables', i.deliverables)}
${field('additional_notes', i.additionalNotes)}

Output language: ${LANGUAGE_INSTRUCTIONS[i.language]}

What each section must contain:
- projectOverview: what the project is, for whom, where it runs, and the business context, in one tight paragraph.
- objective: the primary objective as a paragraph, then 2–4 bullets splitting business, communication and creative goals. Make them measurable where the inputs allow.
- targetAudience: a paragraph naming who they are and the insight that drives them, then bullets for what they think now, what we want them to think, and what we want them to do.
- coreMessage: the single-minded proposition as one sentence in the body; bullets for the reasons to believe.
- creativeConcept: name the idea in the headline field and explain it here: the insight, the idea, and why it is ownable for this client. Bullets for how it shows up across touchpoints.
- creativeDirection: how the idea becomes work: narrative approach, recurring devices, what to avoid, and how it scales across formats.
- toneOfVoice: a short paragraph, then bullets for "We are" / "We are not", plus one example line of copy.
- visualDirection: bullets only: setting, photography or CGI approach, light, palette (name colours), materials and textures, typography, layout system, motion.
- deliverables: bullets only, one per deliverable, each with format or spec notes. Use the deliverables given; add only clearly necessary adaptations.
- successCriteria: bullets only: KPIs tied to the objective, plus the creative quality bar.
- mandatories: anything in the notes that must appear (legal lines, logos, licence numbers, payment plan). Leave body empty and items empty if there is nothing.`;
}

export function campaignUserPrompt(i: CampaignRequest): string {
  return `Develop a campaign platform.

${field('brand', i.brand)}
${field('product_or_project', i.product)}
${field('campaign_objective', i.objective)}
${field('target_audience', i.targetAudience)}
${field('market', i.market)}
${field('campaign_occasion', i.occasion)}
${field('tone', i.tone)}
${field('key_message', i.keyMessage)}

Output language: ${LANGUAGE_INSTRUCTIONS[i.language]}

Return:
- bigIdea: the campaign's big idea as a short, memorable line (2–6 words, no quotation marks).
- bigIdeaRationale: 2–3 sentences: the insight, why the idea answers it, and why only this brand can own it.
- concept: one paragraph describing how the campaign unfolds (launch, sustain, and the role of the occasion if one is given).
- taglines: exactly 5, each with a different angle.
- keyVisual: 4–6 bullets describing the hero key visual: subject, setting, composition, light, palette, headline placement, and format adaptations.
- artDirection: 5–7 bullets covering typography, photography or CGI style, casting, grading, motion and market or language adaptation.
- socialIdeas: exactly 5, each with a title, a format (platform plus spec, e.g. "Instagram Reels · 15s · 9:16") and a description that explains the mechanic and why people would watch or share it.
- videoConcepts: exactly 3, each with a title, duration (e.g. "30s" or "60s / 15s cut-downs"), a one-sentence logline and 3–5 beats.
- cta: one primary CTA that serves the objective, plus 3 alternatives.
- contentPillars: 4 pillars, each with a name and a one-sentence description.`;
}

const PROMPT_TYPE_GUIDE: Record<PromptRequest['types'][number], string> = {
  image: 'image — general AI image generation (Midjourney, Flux, Firefly). Compiled prompt: one dense descriptive paragraph ending with "--ar W:H".',
  video: 'video — AI video generation (Runway, Kling, Veo, Sora). Describe a single 5–10 second shot: the camera move, subject motion, pacing and what changes during the shot. The camera field must describe movement. Compiled prompt: natural-language shot description ending with "Aspect ratio W:H." (no --ar flag).',
  product: 'product — commercial product photography or packshot. Studio lighting setup, surfaces, reflections, macro detail, label legibility. Compiled prompt ends with "--ar W:H".',
  realEstate: 'realEstate — architectural visualization of exteriors or interiors. Corrected verticals, real lens choices (tilt-shift 17–24mm exteriors, 24–35mm interiors), time of day, landscaping, believable scale and furnishing. Compiled prompt ends with "--ar W:H".',
  social: 'social — a social media campaign key visual that stops the scroll. Plan negative space and safe zones for headline and UI overlays; bold, graphic composition. Compiled prompt ends with "--ar W:H".',
  cinematic: 'cinematic — a cinematic advertising frame. Anamorphic or large-format look, film grade, atmosphere, narrative tension. Compiled prompt ends with "--ar W:H".',
};

const DEFAULT_ASPECTS: Record<PromptRequest['types'][number], string> = {
  image: '4:5',
  video: '16:9',
  product: '1:1',
  realEstate: '3:2',
  social: '4:5',
  cinematic: '2.39:1',
};

export function promptsUserPrompt(i: PromptRequest): string {
  const aspect = !i.aspectRatio || i.aspectRatio === 'Auto' ? null : i.aspectRatio;
  const style = !i.style || i.style === 'Auto' ? null : i.style;
  const fieldsLanguage =
    i.language === 'ar'
      ? 'Write the eleven fields in Arabic, keeping camera and lens terms, aspect ratios and style names in English.'
      : i.language === 'bilingual'
        ? 'Write each of the eleven fields in Arabic, then a line break, then English.'
        : 'Write the eleven fields in English.';

  return `Turn this creative idea into production-ready AI generation prompts.

<idea>${i.idea}</idea>
${style ? `<style>${style}</style>` : '<style>Choose the style that best serves the idea.</style>'}

Return exactly one prompt for each of these types, in this order:
${i.types.map((t) => `- ${PROMPT_TYPE_GUIDE[t]} Aspect ratio: ${aspect ?? DEFAULT_ASPECTS[t]}.`).join('\n')}

Rules for every prompt:
- Fill all eleven fields (subject, environment, composition, camera, lighting, materials, colorDirection, mood, style, aspectRatio, negativePrompt) with specific, visual, art-directed detail: real lenses and focal lengths, real lighting setups, named colours and materials. No vague adjectives on their own.
- Tailor each prompt to its type; do not repeat the same description six times.
- negativePrompt: a comma-separated list of what to avoid for this type and idea.
- compiled: one paste-ready prompt combining the fields, always written in English because image and video models respond best to English.
- ${fieldsLanguage}`;
}
