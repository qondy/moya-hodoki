import {
  collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { Project, ProjectKind } from './types';

export const PROJECT_KINDS: { key: ProjectKind; label: string }[] = [
  { key: 'lp', label: 'LP' },
  { key: 'corporate', label: 'コーポレート' },
  { key: 'ec', label: 'EC' },
  { key: 'media', label: 'メディア・ブログ' },
  { key: 'renewal', label: 'リニューアル' },
  { key: 'other', label: 'その他' },
];

export function kindLabel(key: string): string {
  return PROJECT_KINDS.find((k) => k.key === key)?.label ?? 'その他';
}

function toProject(id: string, data: DocumentData): Project {
  return {
    id,
    title: data.title,
    kind: (data.kind ?? 'other') as ProjectKind,
    deadline: data.deadline ?? null,
    archived: data.archived ?? false,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export function subscribeProjects(uid: string, callback: (projects: Project[]) => void): () => void {
  const q = query(collection(db, 'users', uid, 'projects'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => toProject(d.id, d.data())));
  });
}

export function createProject(
  uid: string,
  title: string,
  kind: ProjectKind,
  deadline: string | null,
): Promise<string> {
  return addDoc(collection(db, 'users', uid, 'projects'), {
    title,
    kind,
    deadline,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).then((ref) => ref.id);
}

export function updateProject(
  uid: string,
  projectId: string,
  patch: Partial<Pick<Project, 'title' | 'kind' | 'deadline' | 'archived'>>,
): Promise<void> {
  return updateDoc(doc(db, 'users', uid, 'projects', projectId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export function deleteProject(uid: string, projectId: string): Promise<void> {
  return deleteDoc(doc(db, 'users', uid, 'projects', projectId));
}
