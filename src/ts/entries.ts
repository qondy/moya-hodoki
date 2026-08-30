import {
  collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { ActionItem, Entry } from './types';
import { Suggestion } from './advisor';

function toEntry(id: string, data: DocumentData): Entry {
  return {
    id,
    projectId: data.projectId ?? null,
    phase: data.phase ?? '',
    concernTags: Array.isArray(data.concernTags) ? data.concernTags : [],
    note: data.note ?? '',
    actions: Array.isArray(data.actions)
      ? data.actions.map((a: DocumentData): ActionItem => ({
          text: a.text ?? '',
          reason: a.reason ?? '',
          done: a.done ?? false,
        }))
      : [],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export function subscribeEntries(uid: string, callback: (entries: Entry[]) => void): () => void {
  const q = query(collection(db, 'users', uid, 'entries'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => toEntry(d.id, d.data())));
  });
}

export function createEntry(
  uid: string,
  input: { projectId: string | null; phase: string; concernTags: string[]; note: string },
  suggestions: Suggestion[],
): Promise<string> {
  const actions: ActionItem[] = suggestions.map((s) => ({ text: s.text, reason: s.reason, done: false }));
  return addDoc(collection(db, 'users', uid, 'entries'), {
    projectId: input.projectId,
    phase: input.phase,
    concernTags: input.concernTags,
    note: input.note,
    actions,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).then((ref) => ref.id);
}

export function updateEntryActions(uid: string, entryId: string, actions: ActionItem[]): Promise<void> {
  return updateDoc(doc(db, 'users', uid, 'entries', entryId), {
    actions,
    updatedAt: serverTimestamp(),
  });
}

export function deleteEntry(uid: string, entryId: string): Promise<void> {
  return deleteDoc(doc(db, 'users', uid, 'entries', entryId));
}
