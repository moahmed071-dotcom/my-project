// A local stand-in for the Anthropic Messages API, used by the e2e tests so the
// full stack (browser → our server → Anthropic SDK → HTTP) runs without a real
// key or API spend. It records each request so tests can assert on what the
// server actually sent.
import http from 'node:http';

const BRIEF_KEYS = [
  'projectOverview', 'objective', 'targetAudience', 'coreMessage', 'creativeConcept',
  'creativeDirection', 'toneOfVoice', 'visualDirection', 'deliverables', 'successCriteria',
];

const TITLES_EN = {
  projectOverview: 'Project Overview', objective: 'Objective', targetAudience: 'Target Audience', coreMessage: 'Core Message',
  creativeConcept: 'Creative Concept', creativeDirection: 'Creative Direction', toneOfVoice: 'Tone of Voice',
  visualDirection: 'Visual Direction', deliverables: 'Deliverables', successCriteria: 'Success Criteria',
};

const TITLES_AR = {
  projectOverview: 'نظرة عامة على المشروع', objective: 'الهدف', targetAudience: 'الجمهور المستهدف', coreMessage: 'الرسالة الأساسية',
  creativeConcept: 'الفكرة الإبداعية', creativeDirection: 'التوجه الإبداعي', toneOfVoice: 'نبرة الصوت',
  visualDirection: 'التوجه البصري', deliverables: 'المخرجات', successCriteria: 'معايير النجاح',
};

function briefOutput(arabic) {
  const titles = arabic ? TITLES_AR : TITLES_EN;
  return {
    headline: arabic ? 'البيت اللي بيكبر معاك' : 'The Address That Grows With You',
    sections: Object.fromEntries(
      BRIEF_KEYS.map((k) => [
        k,
        {
          title: titles[k],
          body: arabic ? `نص تجريبي لقسم ${titles[k]}. [FAKE-CLAUDE]` : `[FAKE-CLAUDE] ${titles[k]} body text.`,
          items: k === 'projectOverview' ? [] : [arabic ? 'نقطة أولى' : 'First point', arabic ? 'نقطة ثانية' : 'Second point'],
        },
      ]),
    ),
    mandatories: { title: 'Mandatories', body: '', items: [] },
  };
}

function campaignOutput() {
  return {
    bigIdea: 'Summer, Unhurried',
    bigIdeaRationale: '[FAKE-CLAUDE] Why this idea wins with this audience.',
    concept: '[FAKE-CLAUDE] Campaign concept paragraph.',
    taglines: ['Tagline one.', 'Tagline two.', 'Tagline three.', 'Tagline four.', 'Tagline five.', 'Extra tagline six.'],
    keyVisual: ['Hero frame detail.', 'Lighting detail.', 'Palette detail.', 'Formats detail.'],
    artDirection: ['Typography detail.', 'Photography detail.', 'Motion detail.', 'Market detail.', 'Casting detail.'],
    socialIdeas: Array.from({ length: 5 }, (_, i) => ({ title: `Social idea ${i + 1}`, format: 'Instagram Reels · 15s · 9:16', description: `[FAKE-CLAUDE] Social mechanic ${i + 1}.` })),
    videoConcepts: Array.from({ length: 3 }, (_, i) => ({ title: `Film ${i + 1}`, duration: '30s', logline: `[FAKE-CLAUDE] Logline ${i + 1}.`, beats: ['Beat one.', 'Beat two.', 'Beat three.'] })),
    cta: { primary: 'Book your stay', alternatives: ['See the villas', 'Plan your summer', 'Talk to us'] },
    contentPillars: ['Place', 'People', 'Proof', 'Offers'].map((name) => ({ name, description: `[FAKE-CLAUDE] ${name} pillar.` })),
  };
}

function promptsOutput() {
  const types = ['image', 'video', 'product', 'realEstate', 'social', 'cinematic'];
  return {
    prompts: types.map((type) => ({
      type,
      fields: {
        subject: `[FAKE-CLAUDE] ${type} subject`, environment: 'Environment detail', composition: 'Composition detail',
        camera: 'Camera detail', lighting: 'Lighting detail', materials: 'Materials detail', colorDirection: 'Color detail',
        mood: 'Mood detail', style: 'Style detail', aspectRatio: type === 'cinematic' ? '2.39:1' : '4:5', negativePrompt: 'blurry, watermark',
      },
      compiled: `[FAKE-CLAUDE] ${type} compiled prompt --ar ${type === 'cinematic' ? '2.39:1' : '4:5'}`,
    })),
  };
}

function apiError(res, status, type, message) {
  res.writeHead(status, { 'content-type': 'application/json', 'request-id': 'req_fake' });
  res.end(JSON.stringify({ type: 'error', error: { type, message } }));
}

export function startFakeAnthropic({ port = 0, delayMs = 600, invalidKey = 'sk-invalid' } = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const key = req.headers['x-api-key'];
      if (key === invalidKey) return apiError(res, 401, 'authentication_error', 'invalid x-api-key');

      if (req.method === 'GET' && req.url?.startsWith('/v1/models/')) {
        const id = decodeURIComponent(req.url.split('/').pop().split('?')[0]);
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ type: 'model', id, display_name: id, created_at: '2026-01-01T00:00:00Z' }));
      }

      if (req.method === 'POST' && req.url?.startsWith('/v1/messages')) {
        const body = JSON.parse(raw || '{}');
        requests.push({ headers: req.headers, body });
        const props = body.output_config?.format?.schema?.properties ?? {};
        const userText = JSON.stringify(body.messages ?? []);
        const arabic = userText.includes('Output language: Arabic');
        const output = props.sections ? briefOutput(arabic) : props.bigIdea ? campaignOutput() : props.prompts ? promptsOutput() : null;
        if (!output) return apiError(res, 400, 'invalid_request_error', 'fake: unknown output schema');
        setTimeout(() => {
          res.writeHead(200, { 'content-type': 'application/json', 'request-id': 'req_fake' });
          res.end(
            JSON.stringify({
              id: `msg_fake_${requests.length}`,
              type: 'message',
              role: 'assistant',
              model: body.model,
              content: [{ type: 'text', text: JSON.stringify(output) }],
              stop_reason: 'end_turn',
              stop_sequence: null,
              usage: { input_tokens: 1200, output_tokens: 900, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
            }),
          );
        }, delayMs);
        return;
      }
      apiError(res, 404, 'not_found_error', 'fake: unknown route');
    });
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const { port: actual } = server.address();
      resolve({ url: `http://127.0.0.1:${actual}`, requests, close: () => new Promise((r) => server.close(r)) });
    });
  });
}
