import { applyBrand } from './brand';
import { newElementId } from './elements';
import { withAutoHeight } from './textLayout';
import type { DesignBrand, DesignDocument, DesignElement } from './types';

/**
 * Pure document operations. The editor's undo/redo history is built on these:
 * each returns a new document and never mutates its input.
 */

const touch = (doc: DesignDocument): DesignDocument => ({ ...doc, updatedAt: new Date().toISOString() });

/** Sort by zIndex and renumber 0..n-1. */
export function normalizeZ(elements: DesignElement[]): DesignElement[] {
  return [...elements]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((el, i) => (el.zIndex === i ? el : { ...el, zIndex: i }));
}

export function sortedByZ(elements: DesignElement[]): DesignElement[] {
  return [...elements].sort((a, b) => a.zIndex - b.zIndex);
}

export function addElement(doc: DesignDocument, el: DesignElement): DesignDocument {
  const top = doc.elements.reduce((m, e) => Math.max(m, e.zIndex), -1);
  return touch({ ...doc, elements: normalizeZ([...doc.elements, { ...el, zIndex: top + 1 }]) });
}

export function updateElement(doc: DesignDocument, id: string, patch: Partial<DesignElement>): DesignDocument {
  return touch({
    ...doc,
    elements: doc.elements.map((el) => {
      if (el.id !== id) return el;
      const next = { ...el, ...patch } as DesignElement;
      return next.type === 'text' ? withAutoHeight(next) : next;
    }),
  });
}

export function deleteElement(doc: DesignDocument, id: string): DesignDocument {
  return touch({ ...doc, elements: normalizeZ(doc.elements.filter((el) => el.id !== id)) });
}

export function duplicateElement(doc: DesignDocument, id: string, newId: string = newElementId()): { doc: DesignDocument; newId: string | null } {
  const src = doc.elements.find((el) => el.id === id);
  if (!src) return { doc, newId: null };
  const offset = Math.round(Math.min(doc.width, doc.height) * 0.02);
  const copy = { ...src, id: newId, name: `${src.name} copy`, x: src.x + offset, y: src.y + offset, zIndex: src.zIndex + 0.5 } as DesignElement;
  return { doc: touch({ ...doc, elements: normalizeZ([...doc.elements, copy]) }), newId: copy.id };
}

export type LayerMove = 'forward' | 'backward' | 'front' | 'back';

export function reorder(doc: DesignDocument, id: string, move: LayerMove): DesignDocument {
  const els = sortedByZ(doc.elements);
  const i = els.findIndex((e) => e.id === id);
  if (i < 0) return doc;
  const [el] = els.splice(i, 1);
  const target = move === 'front' ? els.length : move === 'back' ? 0 : move === 'forward' ? Math.min(els.length, i + 1) : Math.max(0, i - 1);
  els.splice(target, 0, el);
  return touch({ ...doc, elements: els.map((e, z) => ({ ...e, zIndex: z })) });
}

export function setBrand(doc: DesignDocument, brand: DesignBrand): DesignDocument {
  return touch(applyBrand(doc, brand));
}

/** Re-measure every text box (e.g. after web fonts finish loading). */
export function relayoutText(doc: DesignDocument): DesignDocument {
  let changed = false;
  const elements = doc.elements.map((el) => {
    if (el.type !== 'text') return el;
    const next = withAutoHeight(el);
    if (next !== el) changed = true;
    return next;
  });
  return changed ? { ...doc, elements } : doc;
}
