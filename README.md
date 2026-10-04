# Mohamed Creative OS

A personal creative productivity platform for a Senior Graphic Designer / Art Director working across branding, real estate, social, advertising, AI imagery and video.

## Features

- **Dashboard** — welcome, live stats, quick actions, quick tools, recent projects, briefs and campaigns
- **Creative Brief Generator** — 11-field form → structured 9-section brief (copy, per-section copy, export)
- **Campaign Generator** — big idea, concept, 5 taglines, key visual, art direction, 5 social ideas, 3 video concepts, CTA, content pillars
- **AI Prompt Generator** — prompts for image, video, product, real estate, social and cinematic work, each broken into 11 controls plus a compiled, paste-ready prompt
- **Projects** — create / edit / delete, status + category filters, sort, grid / list views
- **Clients** — create / edit / delete, with project counts computed from linked projects
- **Settings** — profile, creative defaults, AI engine selection, JSON export / import, sample-data reset
- Global search (`⌘K` / `Ctrl K`), localStorage persistence, empty / loading / error states, responsive layout with a mobile drawer

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run preview
```

## Architecture

```
src/
  components/   ui/ (design-system primitives), layout/, generator/, projects/, clients/
  pages/        one file per route
  store/        AppStore (useReducer + localStorage), useGeneration (loading/error/abort)
  services/ai/  provider interface, local engine, remote provider, knowledge base
  data/seed.ts  sample workspace
  lib/          formatting, search, serialization, storage helpers
  types/        domain types
```

### AI providers

Every generator calls an `AIProvider` (`src/services/ai/types.ts`):

- **Local Creative Engine** (default) — runs offline in the browser. It detects the sector and tone from the inputs and builds deterministic, structured output from a creative knowledge base. No API key needed.
- **Remote AI Endpoint** — `POST {endpoint}` with `{ task: "brief" | "campaign" | "prompts", model, input }`. The endpoint must return JSON matching `BriefOutput`, `CampaignOutput` or `GeneratedPrompt[]` (see `src/types`). Keep API keys on that server, never in the browser.

To connect an LLM, deploy a small backend (for example a serverless function that calls the Claude API with a JSON-schema prompt), then set its URL in **Settings → AI engine**.
