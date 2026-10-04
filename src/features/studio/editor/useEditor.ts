import { useCallback, useMemo, useReducer } from 'react';
import type { DesignDocument, DesignElement } from '../model/types';
import * as ops from '../model/operations';
import { newElementId } from '../model/elements';

/**
 * Editor state with undo/redo. Every change goes through `apply`, which takes
 * a pure document → document function. Continuous gestures (dragging,
 * resizing, slider scrubbing) pass a `coalesce` key so the whole gesture
 * becomes one undo step.
 */

const HISTORY_LIMIT = 100;

interface State {
  doc: DesignDocument;
  past: DesignDocument[];
  future: DesignDocument[];
  selectedId: string | null;
  coalesceKey: string | null;
  /** Increments on every document change; used for autosave. */
  revision: number;
}

type Action =
  | { type: 'apply'; fn: (d: DesignDocument) => DesignDocument; coalesce?: string; select?: string | null; silent?: boolean }
  | { type: 'select'; id: string | null }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'endGesture' };

function keepSelection(doc: DesignDocument, id: string | null) {
  return id && doc.elements.some((e) => e.id === id) ? id : null;
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'apply': {
      const next = a.fn(s.doc);
      if (next === s.doc) return a.select !== undefined ? { ...s, selectedId: a.select } : s;
      const selectedId = a.select !== undefined ? a.select : keepSelection(next, s.selectedId);
      // Silent changes (e.g. re-measuring text after fonts load) don't create history.
      if (a.silent) return { ...s, doc: next, selectedId };
      const merge = a.coalesce && a.coalesce === s.coalesceKey;
      return {
        doc: next,
        past: merge ? s.past : [...s.past, s.doc].slice(-HISTORY_LIMIT),
        future: [],
        selectedId,
        coalesceKey: a.coalesce ?? null,
        revision: s.revision + 1,
      };
    }
    case 'select':
      return { ...s, selectedId: a.id, coalesceKey: null };
    case 'endGesture':
      return { ...s, coalesceKey: null };
    case 'undo': {
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return { doc: prev, past: s.past.slice(0, -1), future: [s.doc, ...s.future], selectedId: keepSelection(prev, s.selectedId), coalesceKey: null, revision: s.revision + 1 };
    }
    case 'redo': {
      if (!s.future.length) return s;
      const next = s.future[0];
      return { doc: next, past: [...s.past, s.doc], future: s.future.slice(1), selectedId: keepSelection(next, s.selectedId), coalesceKey: null, revision: s.revision + 1 };
    }
  }
}

export function useEditor(initial: DesignDocument) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ doc: initial, past: [], future: [], selectedId: null, coalesceKey: null, revision: 0 }));

  const apply = useCallback(
    (fn: (d: DesignDocument) => DesignDocument, opts: { coalesce?: string; select?: string | null; silent?: boolean } = {}) => dispatch({ type: 'apply', fn, ...opts }),
    [],
  );

  const actions = useMemo(
    () => ({
      apply,
      select: (id: string | null) => dispatch({ type: 'select', id }),
      endGesture: () => dispatch({ type: 'endGesture' }),
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      update: (id: string, patch: Partial<DesignElement>, coalesce?: string) => apply((d) => ops.updateElement(d, id, patch), { coalesce }),
      add: (el: DesignElement) => apply((d) => ops.addElement(d, el), { select: el.id }),
      remove: (id: string) => apply((d) => ops.deleteElement(d, id), { select: null }),
      duplicate: (id: string) => {
        const newId = newElementId();
        apply((d) => ops.duplicateElement(d, id, newId).doc, { select: newId });
      },
      reorder: (id: string, move: ops.LayerMove) => apply((d) => ops.reorder(d, id, move)),
      setDoc: (patch: Partial<DesignDocument>, coalesce?: string) => apply((d) => ({ ...d, ...patch, updatedAt: new Date().toISOString() }), { coalesce }),
    }),
    [apply],
  );

  const selected = state.selectedId ? (state.doc.elements.find((e) => e.id === state.selectedId) ?? null) : null;

  return {
    doc: state.doc,
    selected,
    selectedId: state.selectedId,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    revision: state.revision,
    ...actions,
  };
}

export type Editor = ReturnType<typeof useEditor>;
