import {
  doc, getDoc, setDoc, deleteDoc, serverTimestamp, DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { Checklist, ChecklistItemState } from './types';
import { mergeChecklistItems } from './checklistItems';

// 純粋ロジック（項目定義・マージ・進捗計算）は checklistItems.ts に分離。ここでは再エクスポートのみ。
export {
  CHECKLIST_ITEMS, CHECKLIST_CATEGORIES, emptyChecklistItems, mergeChecklistItems, checklistProgress,
} from './checklistItems';
export type { ChecklistItemDef, ChecklistCategory } from './checklistItems';

function toChecklist(projectId: string, data: DocumentData): Checklist {
  const rawItems: ChecklistItemState[] = Array.isArray(data.items)
    ? data.items.map((it: DocumentData): ChecklistItemState => ({
        id: typeof it.id === 'string' ? it.id : '',
        checked: !!it.checked,
        note: typeof it.note === 'string' ? it.note : '',
      }))
    : [];
  return {
    projectId,
    items: mergeChecklistItems(rawItems),
    updatedAt: data.updatedAt ?? null,
    createdAt: data.createdAt ?? null,
  };
}

export async function getChecklist(uid: string, projectId: string): Promise<Checklist | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'checklists', projectId));
  return snap.exists() ? toChecklist(projectId, snap.data()) : null;
}

export async function saveChecklist(uid: string, cl: Checklist, isNew: boolean): Promise<void> {
  const payload: DocumentData = {
    projectId: cl.projectId,
    items: cl.items.map((it) => ({ id: it.id, checked: it.checked, note: it.note })),
    updatedAt: serverTimestamp(),
  };
  if (isNew) payload.createdAt = serverTimestamp();
  await setDoc(doc(db, 'users', uid, 'checklists', cl.projectId), payload, { merge: true });
}

export function deleteChecklist(uid: string, projectId: string): Promise<void> {
  return deleteDoc(doc(db, 'users', uid, 'checklists', projectId));
}
