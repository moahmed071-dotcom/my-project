import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { z } from 'zod';
import { config } from './config';
import { AIError } from './ai/errors';
import { generateBrief, generateCampaign, generatePrompts, getStatus } from './ai/claude';
import { BriefInputSchema, CampaignInputSchema, PromptInputSchema } from './ai/schemas';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

// ─── API ─────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

/** AI engine status for Settings. Never includes the API key. */
app.get('/api/ai/status', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store').json(await getStatus(req.query.refresh === '1'));
  } catch (err) {
    next(err);
  }
});

function generateRoute<S extends z.ZodType, T>(schema: S, run: (input: z.infer<S>, signal: AbortSignal) => Promise<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body?.input);
    if (!parsed.success) {
      return next(AIError.invalidInput(parsed.error.issues[0]?.message ?? 'Invalid input.'));
    }
    // Stop the Claude request if the browser cancels or disconnects.
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    try {
      const output = await run(parsed.data, controller.signal);
      res.json({ output });
    } catch (err) {
      if (controller.signal.aborted) return; // client is gone
      next(err);
    }
  };
}

app.post('/api/generate/brief', generateRoute(BriefInputSchema, generateBrief));
app.post('/api/generate/campaign', generateRoute(CampaignInputSchema, generateCampaign));
app.post('/api/generate/prompts', generateRoute(PromptInputSchema, generatePrompts));

app.use('/api', (_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Unknown API route.' } });
});

// ─── Frontend (production) ───────────────────────────────────────────────────

if (config.isProduction) {
  const indexHtml = path.join(config.distDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.warn('[server] dist/ not found. Run `npm run build` before `npm start`.');
  }
  app.use(express.static(config.distDir, { index: false, maxAge: '1h' }));
  // SPA fallback for client-side routes.
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(indexHtml);
  });
}

// ─── Errors ──────────────────────────────────────────────────────────────────

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AIError) {
    res.status(err.status).json(err.toJSON());
    return;
  }
  if ((err as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'invalid_input', message: 'The request is too large.' } });
    return;
  }
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'invalid_input', message: 'The request body isn’t valid JSON.' } });
    return;
  }
  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: { code: 'server_error', message: 'Unexpected server error.' } });
});

app.listen(config.port, config.host, () => {
  console.log(`[server] Creative OS API on http://${config.host}:${config.port}`);
  console.log(`[server] AI: ${config.aiConfigured ? `Anthropic configured · model ${config.model} · effort ${config.effort}` : 'ANTHROPIC_API_KEY not set — generators will report "not configured"'}`);
});
