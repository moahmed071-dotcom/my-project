import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load .env from the project root if present. Real environment variables win.
try {
  process.loadEnvFile(path.join(root, '.env'));
} catch {
  /* no .env file — rely on the process environment */
}

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type Effort = (typeof EFFORTS)[number];

function readEffort(): Effort {
  const v = (process.env.ANTHROPIC_EFFORT ?? '').trim().toLowerCase();
  return (EFFORTS as readonly string[]).includes(v) ? (v as Effort) : 'high';
}

export const config = {
  root,
  distDir: path.join(root, 'dist'),
  isProduction: process.env.NODE_ENV === 'production' || process.argv.includes('--production'),
  port: Number(process.env.PORT) || 8787,
  host: process.env.HOST || (process.env.NODE_ENV === 'production' || process.argv.includes('--production') ? '0.0.0.0' : '127.0.0.1'),
  model: (process.env.ANTHROPIC_MODEL ?? '').trim() || 'claude-opus-5-5',
  effort: readEffort(),
  /** Never log or return this value. */
  get apiKey(): string {
    return (process.env.ANTHROPIC_API_KEY ?? '').trim();
  },
  get aiConfigured(): boolean {
    return this.apiKey.length > 0;
  },
};
