import {
  doc, getDoc, setDoc, deleteDoc, serverTimestamp, DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { Estimate, EstimateItem } from './types';
import {
  DEFAULT_BUFFER_PERCENT, DEFAULT_HOURS_PER_DAY, DEFAULT_DAYS_PER_MONTH, newItemId, safeNum,
} from './estimateCalc';

// 純粋ロジック（テンプレート・集計）は estimateCalc.ts に分離。ここでは再エクスポートのみ。
export {
  ESTIMATE_TEMPLATES, DEFAULT_BUFFER_PERCENT, DEFAULT_HOURS_PER_DAY, DEFAULT_DAYS_PER_MONTH,
  newItemId, templateItems, emptyEstimate, calcEstimate,
} from './estimateCalc';
export type { EstimateTotals } from './estimateCalc';

function toEstimate(projectId: string, data: DocumentData): Estimate {
  return {
    projectId,
    items: Array.isArray(data.items)
      ? data.items.map((it: DocumentData): EstimateItem => ({
          id: typeof it.id === 'string' ? it.id : newItemId(),
          label: it.label ?? '',
          hours: safeNum(it.hours),
          qty: safeNum(it.qty, 1),
        }))
      : [],
    bufferPercent: safeNum(data.bufferPercent, DEFAULT_BUFFER_PERCENT),
    hoursPerDay: safeNum(data.hoursPerDay, DEFAULT_HOURS_PER_DAY) || DEFAULT_HOURS_PER_DAY,
    daysPerMonth: safeNum(data.daysPerMonth, DEFAULT_DAYS_PER_MONTH) || DEFAULT_DAYS_PER_MONTH,
    updatedAt: data.updatedAt ?? null,
    createdAt: data.createdAt ?? null,
  };
}

export async function getEstimate(uid: string, projectId: string): Promise<Estimate | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'estimates', projectId));
  return snap.exists() ? toEstimate(projectId, snap.data()) : null;
}

export async function saveEstimate(uid: string, est: Estimate, isNew: boolean): Promise<void> {
  const payload: DocumentData = {
    projectId: est.projectId,
    items: est.items.map((it) => ({
      id: it.id,
      label: it.label,
      hours: safeNum(it.hours),
      qty: safeNum(it.qty, 1),
    })),
    bufferPercent: safeNum(est.bufferPercent, DEFAULT_BUFFER_PERCENT),
    hoursPerDay: safeNum(est.hoursPerDay, DEFAULT_HOURS_PER_DAY) || DEFAULT_HOURS_PER_DAY,
    daysPerMonth: safeNum(est.daysPerMonth, DEFAULT_DAYS_PER_MONTH) || DEFAULT_DAYS_PER_MONTH,
    updatedAt: serverTimestamp(),
  };
  if (isNew) payload.createdAt = serverTimestamp();
  await setDoc(doc(db, 'users', uid, 'estimates', est.projectId), payload, { merge: true });
}

export function deleteEstimate(uid: string, projectId: string): Promise<void> {
  return deleteDoc(doc(db, 'users', uid, 'estimates', projectId));
}
