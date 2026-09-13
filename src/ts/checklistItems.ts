import { ChecklistItemState } from './types';

// コーディング着手前に依頼主へ確認すべき項目（coding-template/CLAUDE.md の
// 「コーディング開始前チェックリスト」と対応）。純粋なデータ＋ロジックのみ。
export const CHECKLIST_CATEGORIES = ['体制・進行', 'サイト仕様', '計測・解析'] as const;
export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];

export interface ChecklistItemDef {
  id: string;
  category: ChecklistCategory;
  label: string;
}

export const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { id: 'contact', category: '体制・進行', label: 'やりとりは誰がするのか' },
  { id: 'regulation', category: '体制・進行', label: 'コーディングについてのレギュレーションがあるのか' },
  { id: 'delivery-type', category: '体制・進行', label: '納品形態（公開まで対応／ファイル納品のみ）' },
  { id: 'dynamic-or-static', category: 'サイト仕様', label: 'サイトは動的（CMS等）ではないか、html一式をディレクトリにアップするのか' },
  { id: 'reference-lp', category: 'サイト仕様', label: '今回と近い過去のLPのURLがあったら' },
  { id: 'https', category: 'サイト仕様', label: 'HTTPS化はしてあるのか' },
  { id: 'page-speed', category: 'サイト仕様', label: '表示速度の設定はされているのか' },
  { id: 'redirect', category: 'サイト仕様', label: 'リダイレクトの有無' },
  { id: 'cms-account', category: 'サイト仕様', label: 'CMSだった場合のアカウント情報' },
  { id: 'sitemap', category: 'サイト仕様', label: 'サイトマップ（ディレクトリマップ）' },
  { id: 'published-url', category: 'サイト仕様', label: '公開されるページのURL（トレイリングスラッシュの有無）' },
  { id: 'tracking', category: '計測・解析', label: '計測設定 GTM・GA（イベント・パラメーター・コンバージョン）。こちら側で埋め込み・設定することはあるか' },
  { id: 'heatmap', category: '計測・解析', label: 'ヒートマップ' },
];

export function emptyChecklistItems(): ChecklistItemState[] {
  return CHECKLIST_ITEMS.map((d) => ({ id: d.id, checked: false, note: '' }));
}

/** 保存済みデータを現在の項目定義にマージする（項目の追加・削除があっても壊れないように） */
export function mergeChecklistItems(saved: ChecklistItemState[]): ChecklistItemState[] {
  return CHECKLIST_ITEMS.map((d) => {
    const found = saved.find((s) => s.id === d.id);
    return { id: d.id, checked: found?.checked ?? false, note: found?.note ?? '' };
  });
}

export function checklistProgress(items: ChecklistItemState[]): { done: number; total: number } {
  return { done: items.filter((i) => i.checked).length, total: CHECKLIST_ITEMS.length };
}
