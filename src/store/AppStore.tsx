import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { Brief, Campaign, Client, Project, PromptSet, Settings } from '@/types';
import type { BrandKit, DesignDocument, SavedTemplate } from '@/features/studio/model/types';
import { clearAll, loadJSON, saveJSON } from '@/lib/storage';
import { uid } from '@/lib/id';
import {
  DEFAULT_SETTINGS,
  seedBriefs,
  seedCampaigns,
  seedClients,
  seedProjects,
  seedPromptSets,
  seedBrandKits,
} from '@/data/seed';

export interface AppState {
  projects: Project[];
  clients: Client[];
  briefs: Brief[];
  campaigns: Campaign[];
  promptSets: PromptSet[];
  /** Design Studio */
  designs: DesignDocument[];
  brandKits: BrandKit[];
  savedTemplates: SavedTemplate[];
  favoriteTemplates: string[];
  settings: Settings;
}

type Collection = 'projects' | 'clients' | 'briefs' | 'campaigns' | 'promptSets' | 'designs' | 'brandKits' | 'savedTemplates';

type Action =
  | { type: 'upsert'; collection: Collection; item: { id: string } }
  | { type: 'remove'; collection: Collection; id: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'favorites'; ids: string[] }
  | { type: 'replace'; state: AppState };

const STORAGE_VERSION = 1;

function seedState(): AppState {
  return {
    projects: seedProjects(),
    clients: seedClients(),
    briefs: seedBriefs(),
    campaigns: seedCampaigns(),
    promptSets: seedPromptSets(),
    designs: [],
    brandKits: seedBrandKits(),
    savedTemplates: [],
    favoriteTemplates: [],
    settings: DEFAULT_SETTINGS,
  };
}

function emptyState(settings: Settings): AppState {
  return { projects: [], clients: [], briefs: [], campaigns: [], promptSets: [], designs: [], brandKits: [], savedTemplates: [], favoriteTemplates: [], settings };
}

function loadState(): AppState {
  const version = loadJSON<number | null>('version', null);
  if (version !== STORAGE_VERSION) return seedState();
  const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    projects: asArray<Project>(loadJSON('projects', [])),
    clients: asArray<Client>(loadJSON('clients', [])),
    briefs: asArray<Brief>(loadJSON('briefs', [])),
    campaigns: asArray<Campaign>(loadJSON('campaigns', [])),
    promptSets: asArray<PromptSet>(loadJSON('promptSets', [])),
    designs: asArray<DesignDocument>(loadJSON('designs', [])),
    // Workspaces created before the Design Studio get the sample brand kits once.
    brandKits: asArray<BrandKit>(loadJSON<BrandKit[] | null>('brandKits', null) ?? seedBrandKits()),
    savedTemplates: asArray<SavedTemplate>(loadJSON('savedTemplates', [])),
    favoriteTemplates: asArray<string>(loadJSON('favoriteTemplates', [])),
    settings: migrateSettings(loadJSON<Partial<Settings>>('settings', {})),
  };
}

/** Fill in settings added since the workspace was saved. The user's engine choice is kept as-is. */
function migrateSettings(stored: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...stored, engineVersion: DEFAULT_SETTINGS.engineVersion };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'upsert': {
      const list = state[action.collection] as Array<{ id: string }>;
      const exists = list.some((x) => x.id === action.item.id);
      const next = exists ? list.map((x) => (x.id === action.item.id ? action.item : x)) : [action.item, ...list];
      return { ...state, [action.collection]: next };
    }
    case 'remove': {
      const list = state[action.collection] as Array<{ id: string }>;
      const next: AppState = { ...state, [action.collection]: list.filter((x) => x.id !== action.id) };
      // Deleting a client detaches its projects rather than deleting them.
      if (action.collection === 'clients') {
        next.projects = state.projects.map((p) => (p.clientId === action.id ? { ...p, clientId: null } : p));
      }
      return next;
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'favorites':
      return { ...state, favoriteTemplates: action.ids };
    case 'replace':
      return action.state;
  }
}

export type ProjectDraft = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type ClientDraft = Omit<Client, 'id' | 'createdAt'>;

interface AppStore extends AppState {
  saveProject(draft: ProjectDraft, id?: string): Project;
  deleteProject(id: string): void;
  saveClient(draft: ClientDraft, id?: string): Client;
  deleteClient(id: string): void;
  addBrief(b: Omit<Brief, 'id' | 'createdAt'>): Brief;
  deleteBrief(id: string): void;
  addCampaign(c: Omit<Campaign, 'id' | 'createdAt'>): Campaign;
  deleteCampaign(id: string): void;
  addPromptSet(p: Omit<PromptSet, 'id' | 'createdAt'>): PromptSet;
  deletePromptSet(id: string): void;
  saveDesign(doc: DesignDocument): void;
  deleteDesign(id: string): void;
  saveBrandKit(kit: BrandKit): void;
  brandKitFor(clientId: string | null | undefined): BrandKit | undefined;
  saveTemplate(t: SavedTemplate): void;
  deleteSavedTemplate(id: string): void;
  toggleFavoriteTemplate(id: string): void;
  updateSettings(patch: Partial<Settings>): void;
  clientById(id: string | null | undefined): Client | undefined;
  projectCountFor(clientId: string): number;
  resetToSample(): void;
  clearData(): void;
  exportData(): string;
  importData(json: string): void;
  storageError: boolean;
}

const Ctx = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [storageError, setStorageError] = useState(false);

  // Persist only the slices that changed (designs autosave often while editing).
  const persisted = useRef<Partial<AppState>>({});
  useEffect(() => {
    let ok = saveJSON('version', STORAGE_VERSION);
    (Object.keys(state) as (keyof AppState)[]).forEach((key) => {
      if (persisted.current[key] === state[key]) return;
      ok = saveJSON(key, state[key]) && ok;
      (persisted.current as Record<string, unknown>)[key] = state[key];
    });
    setStorageError(!ok);
  }, [state]);

  const clientById = useCallback(
    (id: string | null | undefined) => (id ? state.clients.find((c) => c.id === id) : undefined),
    [state.clients],
  );

  const projectCountFor = useCallback(
    (clientId: string) => state.projects.filter((p) => p.clientId === clientId).length,
    [state.projects],
  );

  const store = useMemo<AppStore>(() => {
    const now = () => new Date().toISOString();
    return {
      ...state,
      storageError,
      saveProject(draft, id) {
        const existing = id ? state.projects.find((p) => p.id === id) : undefined;
        const item: Project = existing
          ? { ...existing, ...draft, updatedAt: now() }
          : { ...draft, id: uid('pr'), createdAt: now(), updatedAt: now() };
        dispatch({ type: 'upsert', collection: 'projects', item });
        return item;
      },
      deleteProject: (id) => dispatch({ type: 'remove', collection: 'projects', id }),
      saveClient(draft, id) {
        const existing = id ? state.clients.find((c) => c.id === id) : undefined;
        const item: Client = existing ? { ...existing, ...draft } : { ...draft, id: uid('cl'), createdAt: now() };
        dispatch({ type: 'upsert', collection: 'clients', item });
        return item;
      },
      deleteClient: (id) => dispatch({ type: 'remove', collection: 'clients', id }),
      addBrief(b) {
        const item: Brief = { ...b, id: uid('br'), createdAt: now() };
        dispatch({ type: 'upsert', collection: 'briefs', item });
        return item;
      },
      deleteBrief: (id) => dispatch({ type: 'remove', collection: 'briefs', id }),
      addCampaign(c) {
        const item: Campaign = { ...c, id: uid('cp'), createdAt: now() };
        dispatch({ type: 'upsert', collection: 'campaigns', item });
        return item;
      },
      deleteCampaign: (id) => dispatch({ type: 'remove', collection: 'campaigns', id }),
      addPromptSet(p) {
        const item: PromptSet = { ...p, id: uid('ps'), createdAt: now() };
        dispatch({ type: 'upsert', collection: 'promptSets', item });
        return item;
      },
      deletePromptSet: (id) => dispatch({ type: 'remove', collection: 'promptSets', id }),
      saveDesign: (doc) => dispatch({ type: 'upsert', collection: 'designs', item: doc }),
      deleteDesign: (id) => dispatch({ type: 'remove', collection: 'designs', id }),
      saveBrandKit: (kit) => dispatch({ type: 'upsert', collection: 'brandKits', item: kit }),
      brandKitFor: (clientId) => (clientId ? state.brandKits.find((k) => k.clientId === clientId) : undefined),
      saveTemplate: (t) => dispatch({ type: 'upsert', collection: 'savedTemplates', item: t }),
      deleteSavedTemplate(id) {
        dispatch({ type: 'remove', collection: 'savedTemplates', id });
        dispatch({ type: 'favorites', ids: state.favoriteTemplates.filter((x) => x !== id) });
      },
      toggleFavoriteTemplate(id) {
        const on = state.favoriteTemplates.includes(id);
        dispatch({ type: 'favorites', ids: on ? state.favoriteTemplates.filter((x) => x !== id) : [...state.favoriteTemplates, id] });
      },
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      clientById,
      projectCountFor,
      resetToSample() {
        dispatch({ type: 'replace', state: { ...seedState(), settings: state.settings } });
      },
      clearData() {
        clearAll();
        persisted.current = {}; // storage was wiped: rewrite every slice
        dispatch({ type: 'replace', state: emptyState(state.settings) });
      },
      exportData() {
        return JSON.stringify({ app: 'mohamed-creative-os', version: STORAGE_VERSION, exportedAt: now(), data: state }, null, 2);
      },
      importData(json) {
        const parsed = JSON.parse(json);
        const data = parsed?.data ?? parsed;
        if (!data || !Array.isArray(data.projects) || !Array.isArray(data.clients)) {
          throw new Error('This file is not a valid Creative OS export.');
        }
        dispatch({
          type: 'replace',
          state: {
            projects: data.projects,
            clients: data.clients,
            briefs: Array.isArray(data.briefs) ? data.briefs : [],
            campaigns: Array.isArray(data.campaigns) ? data.campaigns : [],
            promptSets: Array.isArray(data.promptSets) ? data.promptSets : [],
            designs: Array.isArray(data.designs) ? data.designs : [],
            brandKits: Array.isArray(data.brandKits) ? data.brandKits : [],
            savedTemplates: Array.isArray(data.savedTemplates) ? data.savedTemplates : [],
            favoriteTemplates: Array.isArray(data.favoriteTemplates) ? data.favoriteTemplates : [],
            settings: migrateSettings(data.settings ?? {}),
          },
        });
      },
    };
  }, [state, storageError, clientById, projectCountFor]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside <AppStoreProvider>');
  return ctx;
}
