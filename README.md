# Mohamed Creative OS

A personal creative productivity platform for a Senior Graphic Designer / Art Director working across branding, real estate, social, advertising, AI imagery and video.

## Features

- **Dashboard** — welcome, live stats, quick actions, quick tools, recent projects, briefs and campaigns
- **Creative Brief Generator** — form → structured 10-section brief including the creative concept (copy, per-section copy, export)
- **Campaign Generator** — big idea, concept, 5 taglines, key visual, art direction, 5 social ideas, 3 video concepts, CTA, content pillars
- **AI Prompt Generator** — prompts for image, video, product, real estate, social and cinematic work, each broken into 11 controls plus a compiled, paste-ready prompt
- **Optional Claude generation** — the three generators can call Claude through a server-side API (off by default); the key never reaches the browser
- **Design Studio** — editable social media designs from a brief: 8 layout templates, 3 deterministic Layout Concepts per brief, a canvas editor (move, resize, rotate, layers, undo/redo), client brand kits, uploads, and PNG / SVG / JSON export. Fully local, no AI or paid API.
- **Projects** — create / edit / delete, status + category filters, sort, grid / list views
- **Clients** — create / edit / delete, with project counts computed from linked projects
- **Settings** — profile, creative defaults, AI engine selection, JSON export / import, sample-data reset
- Global search (`⌘K` / `Ctrl K`), localStorage persistence, empty / loading / error states, responsive layout with a mobile drawer

## Getting started

Requires Node.js 20.12 or newer (22 recommended).

```bash
npm install
npm run dev              # app on http://localhost:5173, API server on :8787
```

The app works out of the box with the **Local Creative Engine** (the default): no API key, no cost. Connecting Claude is optional; see AI setup below.

`npm run dev` starts two processes: the Vite frontend and the API server (`server/`). Vite forwards every `/api` request to the API server, so the browser only ever talks to the app's own backend.

### AI setup (Claude, optional)

Only needed if you want real AI generation. It uses paid Anthropic API credit.

1. Create an API key in the [Anthropic Console](https://console.anthropic.com/settings/keys).
2. Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY=...`.
3. Restart `npm run dev`. **Settings → AI engine** should now show **Connected**.
4. In the same section, select **Claude (Anthropic)** as the engine.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | none | Your Anthropic API key. Read only by the server. |
| `ANTHROPIC_MODEL` | no | `claude-opus-5-5` | Claude model used by all three generators. |
| `ANTHROPIC_EFFORT` | no | `high` | Reasoning effort: `low`, `medium`, `high`, `xhigh` or `max`. Lower is faster and cheaper. |
| `PORT` | no | `8787` | API server port. |

If Claude is selected but no key is set, the header and Settings show **Not configured**, and the generators show a clear message with a retry button and a link to Settings. Switch back to the Local Creative Engine to keep working without a key.

**Keeping the key safe:**
- `.env` is git-ignored. Never commit a real key, and never put it in a `VITE_` variable: those are bundled into browser code.
- The key is read only in `server/config.ts`. API responses (including `/api/ai/status`) never include it.
- Deploy the frontend and API together (see Production) or put the API behind your own auth. Anyone who can reach `/api/generate/*` can spend your API credit.

### Production

```bash
npm run build
ANTHROPIC_API_KEY=... npm start     # serves dist/ and /api on PORT (default 8787)
```

`npm start` runs one Node process that serves the built app and the API together, so it works on any Node host (Render, Railway, Fly.io, a VPS). Set the environment variables in the host's dashboard rather than shipping a `.env` file.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Frontend + API server with hot reload |
| `npm run build` | Typecheck frontend and server, then build `dist/` |
| `npm start` | Production server: `dist/` plus `/api` |
| `npm run typecheck` | Typecheck only |
| `npm test` | Unit tests, then both browser suites |
| `npm run test:unit` | Fast model tests (template layouts, document operations, concepts) |
| `npm run test:e2e` | Build, then run the app and Design Studio browser suites |

### End-to-end tests

`npm run test:e2e` drives the real UI in Chromium against a **local stand-in for the Anthropic API** (`tests/fake-anthropic.mjs`). It needs no API key and costs nothing. It covers navigation, projects CRUD, all three generators through the backend, Arabic right-to-left output, the missing-key and invalid-key states, the local engine fallback, and mobile layout. Install a browser once with `npx playwright install chromium`, or point `CHROMIUM_PATH` at an existing Chromium binary.

## Design Studio

`/studio` is a local, deterministic design workspace. Nothing in it calls an AI service.

- **New design**: name, client, campaign, platform (Instagram, Facebook, LinkedIn, TikTok), format presets or a custom size, brief, headline, subheadline, CTA, visual direction and an optional hero image.
- **Brand**: a client's saved brand kit (logo, primary / secondary / accent colours, fonts, tone of voice), or colours and fonts defined manually and optionally saved as that client's kit. Elements stay linked to brand colour roles, so changing the brand updates the design.
- **Templates**: Luxury Editorial, Architectural Bold, Minimal Premium, Split Image, Full Bleed, Typography Focus, Property Showcase, Campaign Announcement. Each is a layout function that adapts to square, portrait, story and landscape canvases and fits text to the space available.
- **Layout Concepts**: *Generate Concepts* picks three different templates for the brief (real estate, luxury, corporate or product), deterministically. They are labelled as layout concepts, not AI output.
- **Editor**: Elements, Templates, Uploads and Brand on the left; canvas in the centre; Properties and Layers on the right. Select, drag (snaps to the canvas centre), resize from 8 handles (works on rotated elements), rotate, double-click text to edit in place, duplicate, delete, reorder layers, undo / redo, zoom, and Preview mode.
- **Storage**: designs, brand kits and saved templates are stored in localStorage with the rest of the workspace. Uploaded images go to IndexedDB, because localStorage is too small for photos; designs reference them as `asset:<id>`.
- **Export**: PNG at the exact canvas size, SVG with live `<text>` and vector shapes, and JSON with the full document (uploaded images embedded). PNG and SVG come from the same renderer as the canvas, so exports match what you see.
- **Phones**: a preview with basic editing (text, layout, export). The full canvas editor is desktop-only.

**Design document schema** (`src/features/studio/model/types.ts`, `schema: "mcos.design"`, `schemaVersion: 1`): a platform-independent JSON document with `id, name, clientId, campaign, platform, width, height, background, elements[], brand, content, templateId, createdAt, updatedAt`. Every element is separate and editable, with `x, y, width, height, rotation, opacity, zIndex` plus type-specific properties (text, image, logo, rect, circle, line, gradient) and an optional content `slot`. Nothing is flattened, so a future Canva export layer can map elements one to one.

**Extending it later**: AI or other providers plug in through `ConceptProvider` (`src/features/studio/engine/concepts.ts`): return layout concepts, or fill `DesignContent` (headline, subheadline, CTA, visual direction) and template choices. The editor only consumes documents, so it doesn't need to change.

## Architecture

```
server/
  index.ts        Express app: /api routes, and dist/ hosting in production
  config.ts       Environment (.env) loading. The only place the API key is read.
  ai/claude.ts    Anthropic SDK calls, structured outputs, error mapping, connection status
  ai/prompts.ts   Creative Director system prompt and per-generator instructions
  ai/schemas.ts   Zod schemas for request validation and Claude's structured output
  ai/errors.ts    Error codes and the messages shown in the UI
src/
  components/     ui/ (design-system primitives), layout/, generator/, projects/, clients/
  pages/          one file per route
  features/studio/  Design Studio: model/ (schema, operations, text layout, brand, formats),
                    templates/, engine/ (layout concepts), render/ (SVG renderer + exporters),
                    editor/ (canvas, panels, undo history), assets/ (IndexedDB uploads), pages/
  store/          AppStore (useReducer + localStorage), useGeneration, useAIStatus
  services/ai/    provider interface: Claude (server), local engine, remote endpoint
  data/seed.ts    sample workspace
  lib/            formatting, search, serialization, storage helpers
  types/          domain types shared by frontend and server
tests/            unit tests, browser e2e suites, and the fake Anthropic API
```

### How generation works

1. A generator page calls the active `AIProvider` (`src/services/ai`). The default is the **Local Creative Engine**, which runs in the browser. When **Claude** is selected, the provider `POST`s `{ input }` to `/api/generate/brief`, `/campaign` or `/prompts`.
2. The server validates the input with Zod, then calls Claude through the official Anthropic SDK (`client.beta.messages.parse`) with:
   - a stable Creative Director system prompt (prompt-cached), covering Egyptian and GCC real estate, buyer psychology, differentiation and Arabic / English / bilingual output;
   - **structured outputs** (a JSON schema), so responses always match the app's data shapes;
   - adaptive thinking at the configured effort;
   - server-side refusal fallback (`fallbacks: "default"`): if the model declines a request, the API retries it on a fallback model in the same call.
3. The response is normalised into the existing `BriefOutput` / `CampaignOutput` / `GeneratedPrompt[]` shapes, so the UI renders it the same way it rendered the local engine's output.
4. If the browser cancels, the server aborts the Claude request too.

**Output language:** each generator has a language option (Match my input / English / Arabic / Bilingual). Arabic text renders right to left automatically. In the Prompt Generator the eleven fields follow the chosen language, while the paste-ready prompt stays in English, which image and video models handle best.

**Other engines** (Settings → AI engine): the **Local Creative Engine** is the default: offline, template-based, no key. **Remote AI Endpoint** posts `{ task, model, input }` to a URL you control and expects the same JSON shapes back.
