import type { BriefInput, BriefOutput } from '@/types';
import {
  createRng,
  detectSector,
  detectTone,
  lowerFirst,
  marketNote,
  or,
  pick,
  pickMany,
  sentence,
  splitList,
  stripPeriod,
} from '../knowledge';

export function buildBrief(input: BriefInput): BriefOutput {
  const rng = createRng(JSON.stringify(input));
  const sector = detectSector(input.projectType, input.projectName, input.objective, input.keyMessage, input.additionalNotes);
  const tone = detectTone(`${input.toneOfVoice} ${input.additionalNotes}`);

  const client = or(input.client, 'The client');
  const project = or(input.projectName, 'This project');
  const type = or(input.projectType, sector.label);
  const objective = stripPeriod(or(input.objective, 'build awareness and drive qualified action'));
  const audience = stripPeriod(or(input.targetAudience, 'a clearly defined, high-intent audience'));
  const market = or(input.market, '');
  const platform = or(input.platform, 'a multi-channel mix');
  const toneText = or(input.toneOfVoice, tone.adjectives.join(', '));
  const keyMessage = stripPeriod(or(input.keyMessage, `${project} delivers something genuinely better`));

  const insight = pick(rng, sector.audienceInsights);
  const environment = pick(rng, sector.environments);
  const palette = pick(rng, sector.palettes);
  const materials = pick(rng, sector.materials);
  const lighting = pick(rng, sector.lighting);
  const motifs = pickMany(rng, sector.motifs, 3);
  const metrics = pickMany(rng, sector.successMetrics, 3);
  const idea = pick(rng, sector.bigIdeas);

  const deliverables = splitList(input.deliverables);
  const platforms = splitList(platform);

  const headline = `${project} — ${idea.name}`;

  return {
    headline,
    sections: [
      {
        id: 'overview',
        title: 'Project Overview',
        body: `${client} is commissioning ${lowerFirst(type)} work for ${project}${market ? ` in ${market}` : ''}. The work will run across ${platforms.length ? platforms.join(', ') : platform} and must feel ${tone.adjectives.join(', ')} while staying commercially sharp. This brief sets one clear direction for strategy, design and production so every asset pulls in the same direction.`,
      },
      {
        id: 'objective',
        title: 'Objective',
        body: `Primary objective: ${lowerFirst(objective)}.`,
        items: [
          `Business goal — ${sentence(objective)}`,
          `Communication goal — make ${audience.toLowerCase()} feel that ${lowerFirst(keyMessage)}.`,
          `Creative goal — own a distinctive visual territory in the ${sector.label.toLowerCase()} category that is instantly recognisable across ${platforms[0] ?? 'every channel'}.`,
        ],
      },
      {
        id: 'audience',
        title: 'Target Audience',
        body: `${sentence(audience)} ${insight}`,
        items: [
          `What they think today: “Everything in this category looks and sounds the same.”`,
          `What we want them to think: “${sentence(keyMessage)}”`,
          `What we want them to do: take the next step toward ${lowerFirst(objective)}.`,
        ],
      },
      {
        id: 'message',
        title: 'Core Message',
        body: `“${sentence(keyMessage)}”`,
        items: [
          'Every asset must ladder back to this single thought.',
          `Support it with proof: product truth, credentials and tangible benefits relevant to ${audience.toLowerCase()}.`,
        ],
      },
      {
        id: 'direction',
        title: 'Creative Direction',
        body: `Working idea: “${idea.name}.” ${idea.thought} The work should feel less like advertising and more like an invitation — rooted in a real human truth and executed with craft.`,
        items: [
          `Lead with emotion, close with proof — hero visuals carry the feeling, supporting frames carry the facts.`,
          `Recurring visual motifs: ${motifs.join(', ')}.`,
          `Build a modular system so the idea scales from a 6-second story to an out-of-home takeover.`,
          marketNote(market),
        ],
      },
      {
        id: 'tone',
        title: 'Tone of Voice',
        body: `${sentence(toneText)} Copy should be ${tone.copyStyle}.`,
        items: [
          `We are: ${tone.adjectives.join(', ')}.`,
          'We are not: generic, cluttered, or over-promising.',
          `Pacing for motion: ${tone.pacing}.`,
        ],
      },
      {
        id: 'visual',
        title: 'Visual Direction',
        items: [
          `Setting — ${sentence(environment)}`,
          `Palette — ${palette}; ${tone.colorTemperature} overall.`,
          `Materials & texture — ${materials}.`,
          `Lighting — ${lighting}.`,
          `Typography — ${tone.typography}.`,
          'Layout — strong grid, one focal point per frame, generous negative space, logo lock-up bottom-right.',
        ],
      },
      {
        id: 'deliverables',
        title: 'Deliverables',
        items: deliverables.length
          ? deliverables.map((d) => sentence(d).replace(/\.$/, ''))
          : ['Key visual (master + adaptations)', 'Social content suite', 'Short-form video cut-downs', 'Brand guidelines one-pager'],
      },
      {
        id: 'success',
        title: 'Success Criteria',
        items: [
          ...metrics,
          'Creative is on-brief, on-brand and approved within two review rounds.',
        ],
      },
      ...(input.additionalNotes.trim()
        ? [
            {
              id: 'notes',
              title: 'Mandatories & Notes',
              body: sentence(input.additionalNotes),
            },
          ]
        : []),
    ],
  };
}
