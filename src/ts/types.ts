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

export interface EstimateItem {
  id: string;
  label: string;
  hours: number; // 1件あたりの工数（時間）
  qty: number; // 数量（ページ数など）
}

export interface Estimate {
  projectId: string;
  items: EstimateItem[];
  bufferPercent: number; // 予備工数（%）
  hoursPerDay: number; // 1人日あたりの稼働時間
  daysPerMonth: number; // 1人月あたりの営業日数
  updatedAt: Timestamp | null;
  createdAt: Timestamp | null;
}
