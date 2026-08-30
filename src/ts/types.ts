import { Timestamp } from 'firebase/firestore';

export type ProjectKind = 'lp' | 'corporate' | 'ec' | 'media' | 'renewal' | 'other';

export interface Project {
  id: string;
  title: string;
  kind: ProjectKind;
  deadline: string | null; // 'YYYY-MM-DD'
  archived: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ActionItem {
  text: string;
  reason: string;
  done: boolean;
}

export interface Entry {
  id: string;
  projectId: string | null;
  phase: string; // Phase key
  concernTags: string[]; // ConcernTag keys
  note: string;
  actions: ActionItem[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}
