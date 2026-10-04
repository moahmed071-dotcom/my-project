import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { Brief, Campaign, Client, Project, PromptSet, Settings } from '@/types';
import { clearAll, loadJSON, saveJSON } from '@/lib/storage';
import { uid } from '@/lib/id';
import {
  DEFAULT_SETTINGS,
  seedBriefs,
  seedCampaigns,
  seedClients,
  seedProjects,
  seedPromptSets,
} from '@/data/seed';

export interface AppState {
  projects: Project[];
  clients: Client[];
  briefs: Brief[];
  campaigns: Campaign[];
  promptSets: PromptSet[];
  settings: Settings;
}

type Collection = 'projects' | 'clients' | 'briefs' | 'campaigns' | 'promptSets';

type Action =
  | { type: 'upsert'; collection: Collection; item: { id: string } }
  | { type: 'remove'; collection: Collection; id: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'replace'; state: AppState };

const STORAGE_VERSION = 1;

function seedState(): AppState {
  return {
    projects: seedProjects(),
    clients: seedClients(),
    briefs: seedBriefs(),
    campaigns: seedCampaigns(),
    promptSets: seedPromptSets(),
    settings: DEFAULT_SETTINGS,
  };
}

function emptyState(settings: Settings): AppState {
  return { projects: [], clients: [], briefs: [], campaigns: [], promptSets: [], settings };
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
    settings: migrateSettings(loadJSON<Partial<Settings>>('settings', {})),
  };
}

/** Phase 2 made Claude the default engine; move workspaces still on the old default over once. */
function migrateSettings(stored: Partial<Settings>): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...stored };
  if ((stored.engineVersion ?? 1) < 2) {
    return { ...merged, aiProvider: stored.aiProvider === 'remote' ? 'remote' : 'claude', engineVersion: 2 };
  }
  return merged;
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

  // Persist each slice whenever it changes.
  useEffect(() => {
    const ok = [
      saveJSON('version', STORAGE_VERSION),
      saveJSON('projects', state.projects),
      saveJSON('clients', state.clients),
      saveJSON('briefs', state.briefs),
      saveJSON('campaigns', state.campaigns),
      saveJSON('promptSets', state.promptSets),
      saveJSON('settings', state.settings),
    ].every(Boolean);
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
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      clientById,
      projectCountFor,
      resetToSample() {
        dispatch({ type: 'replace', state: { ...seedState(), settings: state.settings } });
      },
      clearData() {
        clearAll();
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
