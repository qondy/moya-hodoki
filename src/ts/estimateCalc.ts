import { Estimate, EstimateItem, ProjectKind } from './types';

export const DEFAULT_BUFFER_PERCENT = 15;
export const DEFAULT_HOURS_PER_DAY = 8;
export const DEFAULT_DAYS_PER_MONTH = 20;

type TemplateItem = { label: string; hours: number; qty: number };

// 案件種別ごとの「定番作業」テンプレート（時間・数量はあくまで初期のたたき台）
export const ESTIMATE_TEMPLATES: Record<ProjectKind, TemplateItem[]> = {
  lp: [
    { label: '要件ヒアリング・整理', hours: 4, qty: 1 },
    { label: '構成・ワイヤーフレーム', hours: 6, qty: 1 },
    { label: 'デザインカンプ制作', hours: 16, qty: 1 },
    { label: 'コーディング（共通・セットアップ）', hours: 6, qty: 1 },
    { label: 'コーディング（セクション）', hours: 3, qty: 6 },
    { label: 'レスポンシブ対応', hours: 8, qty: 1 },
    { label: 'フォーム設置・調整', hours: 4, qty: 1 },
    { label: 'アニメーション・微調整', hours: 6, qty: 1 },
    { label: '動作テスト・修正対応', hours: 8, qty: 1 },
    { label: '公開作業', hours: 3, qty: 1 },
    { label: 'ディレクション・打ち合わせ', hours: 6, qty: 1 },
  ],
  corporate: [
    { label: '要件定義・ヒアリング', hours: 8, qty: 1 },
    { label: 'サイトマップ・情報設計', hours: 6, qty: 1 },
    { label: 'ワイヤーフレーム（主要ページ）', hours: 4, qty: 6 },
    { label: 'デザインカンプ（トップ）', hours: 16, qty: 1 },
    { label: 'デザインカンプ（下層）', hours: 6, qty: 5 },
    { label: 'コーディング（共通パーツ）', hours: 12, qty: 1 },
    { label: 'コーディング（固定ページ）', hours: 5, qty: 8 },
    { label: 'レスポンシブ対応', hours: 16, qty: 1 },
    { label: 'CMS実装（お知らせ等）', hours: 12, qty: 1 },
    { label: 'フォーム実装', hours: 6, qty: 1 },
    { label: '動作テスト・修正対応', hours: 16, qty: 1 },
    { label: '公開作業（DNS・SSL）', hours: 4, qty: 1 },
    { label: 'ディレクション・打ち合わせ', hours: 16, qty: 1 },
  ],
  ec: [
    { label: '要件定義（カート・決済含む）', hours: 20, qty: 1 },
    { label: 'サイトマップ・情報設計', hours: 8, qty: 1 },
    { label: 'ワイヤーフレーム', hours: 4, qty: 8 },
    { label: 'デザインカンプ（トップ）', hours: 16, qty: 1 },
    { label: 'デザインカンプ（下層・商品・カート）', hours: 8, qty: 6 },
    { label: 'テーマ／テンプレート実装', hours: 24, qty: 1 },
    { label: '商品ページテンプレート実装', hours: 12, qty: 1 },
    { label: 'カート・決済・会員まわり調整', hours: 24, qty: 1 },
    { label: 'レスポンシブ対応', hours: 20, qty: 1 },
    { label: '決済・配送テスト', hours: 16, qty: 1 },
    { label: '公開作業', hours: 6, qty: 1 },
    { label: 'ディレクション・打ち合わせ', hours: 24, qty: 1 },
  ],
  media: [
    { label: '要件定義・ヒアリング', hours: 6, qty: 1 },
    { label: 'サイトマップ・情報設計', hours: 4, qty: 1 },
    { label: 'ワイヤーフレーム（TOP・一覧・記事）', hours: 4, qty: 4 },
    { label: 'デザインカンプ（TOP・一覧・記事）', hours: 10, qty: 3 },
    { label: 'コーディング（共通パーツ）', hours: 10, qty: 1 },
    { label: 'コーディング（テンプレート）', hours: 6, qty: 5 },
    { label: 'CMS実装（投稿・カテゴリ・タグ）', hours: 16, qty: 1 },
    { label: '記事一覧・検索・ページャー', hours: 8, qty: 1 },
    { label: 'レスポンシブ対応', hours: 12, qty: 1 },
    { label: '動作テスト・修正対応', hours: 10, qty: 1 },
    { label: '公開作業', hours: 3, qty: 1 },
    { label: 'ディレクション・打ち合わせ', hours: 10, qty: 1 },
  ],
  renewal: [
    { label: '現行サイト調査・分析', hours: 12, qty: 1 },
    { label: '要件定義・移行方針の策定', hours: 12, qty: 1 },
    { label: 'サイトマップ・URL設計（リダイレクト計画）', hours: 8, qty: 1 },
    { label: 'ワイヤーフレーム', hours: 4, qty: 6 },
    { label: 'デザインカンプ（トップ）', hours: 16, qty: 1 },
    { label: 'デザインカンプ（下層）', hours: 6, qty: 5 },
    { label: 'コーディング（共通パーツ）', hours: 12, qty: 1 },
    { label: 'コーディング（ページ）', hours: 5, qty: 8 },
    { label: '既存コンテンツ移行', hours: 16, qty: 1 },
    { label: 'リダイレクト設定（301）', hours: 6, qty: 1 },
    { label: 'レスポンシブ対応', hours: 16, qty: 1 },
    { label: 'CMS実装', hours: 12, qty: 1 },
    { label: '動作テスト・リンクチェック', hours: 16, qty: 1 },
    { label: '公開作業・DNS切替', hours: 6, qty: 1 },
    { label: 'ディレクション・打ち合わせ', hours: 16, qty: 1 },
  ],
  other: [
    { label: '要件ヒアリング・整理', hours: 6, qty: 1 },
    { label: '情報設計・構成', hours: 4, qty: 1 },
    { label: 'ワイヤーフレーム', hours: 4, qty: 3 },
    { label: 'デザインカンプ', hours: 10, qty: 3 },
    { label: 'コーディング（共通パーツ）', hours: 10, qty: 1 },
    { label: 'コーディング（ページ）', hours: 5, qty: 5 },
    { label: 'レスポンシブ対応', hours: 12, qty: 1 },
    { label: '動作テスト・修正対応', hours: 10, qty: 1 },
    { label: '公開作業', hours: 3, qty: 1 },
    { label: 'ディレクション・打ち合わせ', hours: 8, qty: 1 },
  ],
};

export function newItemId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `it_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function templateItems(kind: ProjectKind): EstimateItem[] {
  return (ESTIMATE_TEMPLATES[kind] ?? ESTIMATE_TEMPLATES.other).map((t) => ({
    id: newItemId(),
    label: t.label,
    hours: t.hours,
    qty: t.qty,
  }));
}

export function emptyEstimate(projectId: string): Estimate {
  return {
    projectId,
    items: [],
    bufferPercent: DEFAULT_BUFFER_PERCENT,
    hoursPerDay: DEFAULT_HOURS_PER_DAY,
    daysPerMonth: DEFAULT_DAYS_PER_MONTH,
    updatedAt: null,
    createdAt: null,
  };
}

export interface EstimateTotals {
  baseHours: number;
  bufferHours: number;
  totalHours: number;
  personDays: number;
  personMonths: number;
}

export function safeNum(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function calcEstimate(est: Estimate): EstimateTotals {
  const baseHours = est.items.reduce((sum, it) => sum + safeNum(it.hours) * safeNum(it.qty), 0);
  const bufferHours = baseHours * (safeNum(est.bufferPercent) / 100);
  const totalHours = baseHours + bufferHours;
  const hpd = safeNum(est.hoursPerDay) || DEFAULT_HOURS_PER_DAY;
  const dpm = safeNum(est.daysPerMonth) || DEFAULT_DAYS_PER_MONTH;
  const personDays = totalHours / hpd;
  const personMonths = personDays / dpm;
  return { baseHours, bufferHours, totalHours, personDays, personMonths };
}
