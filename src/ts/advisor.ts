// ============================================================
// Web制作モヤほどき — ルールベースの次アクション提案エンジン
// 外部AI APIは使わず、内蔵のナレッジ表だけで判定する。
// ============================================================

export interface PhaseDef {
  key: string;
  label: string;
}

export interface ConcernDef {
  key: string;
  label: string;
}

export interface Suggestion {
  text: string;
  reason: string;
}

interface Rule {
  /** 対象フェーズ（空なら全フェーズ） */
  phases: string[];
  /** 対象の不安タグ（空ならタグ非依存。複数指定時はいずれか1つでも選択されていれば一致） */
  tags: string[];
  /** 大きいほど上位に出す */
  weight: number;
  actions: Suggestion[];
}

// ---- フェーズ定義 ---------------------------------------------------------
export const PHASES: PhaseDef[] = [
  { key: 'hearing', label: 'ヒアリング' },
  { key: 'requirements', label: '要件定義' },
  { key: 'wireframe', label: '設計・ワイヤー' },
  { key: 'design', label: 'デザイン' },
  { key: 'coding', label: 'コーディング' },
  { key: 'cms', label: 'CMS実装' },
  { key: 'test', label: 'テスト' },
  { key: 'launch', label: '公開・納品' },
  { key: 'postlaunch', label: '公開後' },
];

// ---- 不安タグ定義 -------------------------------------------------------
export const CONCERNS: ConcernDef[] = [
  { key: 'vague-requirements', label: '要件が曖昧' },
  { key: 'tight-schedule', label: 'スケジュールが厳しい' },
  { key: 'waiting-client', label: 'クライアント返信待ち' },
  { key: 'tech-unsure', label: '技術的に不安' },
  { key: 'estimate-unsure', label: '見積り根拠が不安' },
  { key: 'many-review-comments', label: 'レビュー指摘が多い' },
  { key: 'scope-creep', label: '追加要望が増える' },
  { key: 'design-ng', label: 'デザインが通らない' },
  { key: 'no-content', label: '素材・原稿が揃わない' },
  { key: 'solo-anxiety', label: 'ひとりで不安' },
];

export function phaseLabel(key: string): string {
  return PHASES.find((p) => p.key === key)?.label ?? key;
}

export function concernLabel(key: string): string {
  return CONCERNS.find((c) => c.key === key)?.label ?? key;
}

// ---- フェーズ別ベースライン ------------------------------------------
const PHASE_BASELINE: Rule[] = [
  {
    phases: ['hearing'], tags: [], weight: 5,
    actions: [
      { text: '目的・ゴール・成功指標（KGI/KPI）を1文で言語化し、クライアントに確認する', reason: 'ゴールが曖昧なまま進むと、後工程で必ず手戻りが発生するため' },
      { text: 'ターゲットユーザーと、サイト上で達成したいユーザー行動を3つに絞る', reason: '優先順位の基準が決まり、以降の判断が速くなるため' },
      { text: '現行サイトの課題と、参考サイト（良い例・悪い例）を3つずつ集める', reason: '認識のズレを、言葉ではなく具体物で早期にすり合わせられるため' },
      { text: '公開希望日・予算・運用体制（更新担当は誰か）をヒアリングシートで確定する', reason: 'スコープと座組みが決まらないと見積りも設計もできないため' },
    ],
  },
  {
    phases: ['requirements'], tags: [], weight: 5,
    actions: [
      { text: 'サイトマップ（全ページ一覧）を作り、ページ数を確定させる', reason: 'ページ数は工数・見積りの土台になるため' },
      { text: '各ページの目的・掲載要素・CTAを一覧表にまとめ、クライアント承認を得る', reason: '「思っていたのと違う」を設計段階で潰せるため' },
      { text: '機能要件（フォーム/多言語/検索/会員 等）と非機能要件（表示速度/対応ブラウザ/アクセシビリティ）を洗い出す', reason: '後から出てくると納期と費用に直撃するため' },
      { text: '支給素材（原稿・写真・ロゴ）のリストと提出締切を決めて依頼する', reason: '素材待ちはスケジュール遅延の最大要因のため' },
    ],
  },
  {
    phases: ['wireframe'], tags: [], weight: 5,
    actions: [
      { text: '主要ページのワイヤーを作り、情報の優先順位をクライアントと合意する', reason: 'デザイン前に構造を固めると、装飾の議論に集中できるため' },
      { text: 'PC / スマホそれぞれのレイアウト方針（何を残し何を畳むか）を決める', reason: 'レスポンシブの破綻はワイヤー段階でしか安く直せないため' },
      { text: 'ワイヤーに文字量の目安を入れ、原稿依頼テンプレートに反映する', reason: '原稿と設計の往復を減らせるため' },
    ],
  },
  {
    phases: ['design'], tags: [], weight: 5,
    actions: [
      { text: 'デザインの方向性（トンマナ・参考2〜3案）を先に握ってからカンプ制作に入る', reason: '方向性のズレを、全ページ作る前に発見できるため' },
      { text: 'トップ＋下層1枚だけ先に提出し、合意を取ってから残りを量産する', reason: '手戻りの範囲を最小化できるため' },
      { text: 'デザイントークン（色・余白・タイポ・角丸）を決めて実装しやすい形で共有する', reason: 'コーディングの解釈ブレと差し戻しを減らせるため' },
    ],
  },
  {
    phases: ['coding'], tags: [], weight: 5,
    actions: [
      { text: '共通パーツ（ヘッダー/フッター/ボタン/見出し）から実装し、コンポーネント化する', reason: '修正が1箇所で済み、全体の一貫性も保てるため' },
      { text: '対応ブラウザとブレークポイントを確定し、実機確認の計画を立てる', reason: '「あとで確認」は必ず終盤の炎上になるため' },
      { text: 'Git管理とステージング環境を用意し、こまめにコミット・デプロイする', reason: '進捗の可視化と、壊れたときの切り戻しのため' },
      { text: '画像最適化・遅延読み込み・Lighthouseの目標スコアを決める', reason: '速度対策は作った後より作りながらの方が安いため' },
    ],
  },
  {
    phases: ['cms'], tags: [], weight: 5,
    actions: [
      { text: '更新頻度の高い箇所を洗い出し、CMS化する範囲を線引きする', reason: '全部CMS化はコスト過剰、静的箇所との境界を先に決めるため' },
      { text: '入力者が迷わないよう、管理画面のラベル・入力例・投稿マニュアルを用意する', reason: '納品後の問い合わせ対応を減らせるため' },
      { text: '本番投入前にダミー記事で表示崩れ（長文・未入力・画像なし）を検証する', reason: '実運用の入力パターンは想定より荒いため' },
    ],
  },
  {
    phases: ['test'], tags: [], weight: 5,
    actions: [
      { text: 'チェックリスト（リンク切れ/フォーム送信/表示崩れ/メタ情報/404ページ）で全ページ確認する', reason: '確認の抜け漏れを仕組みで防ぐため' },
      { text: '実機（iOS / Android / 主要ブラウザ）で表示と操作を確認する', reason: 'エミュレータでは再現しない不具合があるため' },
      { text: 'フォームの到達先・自動返信・スパム対策・個人情報の取り扱いを確認する', reason: 'フォーム不達はクレームと機会損失に直結するため' },
      { text: 'SEO基本（title / description / OGP / 構造化データ / sitemap.xml / robots.txt）を確認する', reason: '公開後に気づくと検索評価の立ち上がりが遅れるため' },
    ],
  },
  {
    phases: ['launch'], tags: [], weight: 5,
    actions: [
      { text: '公開手順書（DNS / サーバ / SSL / リダイレクト / 公開時刻 / 切り戻し手順）を作る', reason: '公開作業は一発勝負、手順化でミスを防ぐため' },
      { text: '旧サイトからのリダイレクト（301）一覧を用意し、主要URLの評価を引き継ぐ', reason: 'リニューアルでの検索流入の落ち込みを防ぐため' },
      { text: 'アナリティクス・サーチコンソール登録とバックアップ取得を済ませる', reason: '公開直後からのデータ取得と、万一の復旧のため' },
      { text: '納品物（データ / ID・パスワード / 保守範囲 / 請求）を一覧化してクライアントに渡す', reason: '「聞いていない」を防ぎ、支払いと運用移行を滑らかにするため' },
    ],
  },
  {
    phases: ['postlaunch'], tags: [], weight: 5,
    actions: [
      { text: '公開後1週間はエラー・問い合わせ・アクセス数を毎日チェックする', reason: '初期不具合は早く見つけるほど傷が浅いため' },
      { text: '保守契約の範囲（更新 / 障害対応 / 月次レポート）を明文化する', reason: '無償対応の常態化を防ぐため' },
      { text: '公開初期の数値を記録し、次の改善提案の材料にする', reason: '継続案件・追加提案につなげるため' },
    ],
  },
];

// ---- 不安タグ別ルール（フェーズ非依存） -----------------------------
const TAG_RULES: Rule[] = [
  {
    phases: [], tags: ['vague-requirements'], weight: 20,
    actions: [
      { text: '「決まっていること」と「未確定のこと」を箇条書きで分け、未確定は仮決めして承認をもらう', reason: '曖昧さを可視化すると、相手の意思決定を促せるため' },
      { text: '要件を満たす最小構成（MVP）と、後回しにできる要素を線引きする', reason: '全部同時に決めようとして止まるのを避けるため' },
      { text: '口頭で決めたことは当日中に議事録にして送り、指定期限までに反論がなければ合意とみなす旨を添える', reason: '言った言わないを防ぎ、判断を前に進めるため' },
    ],
  },
  {
    phases: [], tags: ['tight-schedule'], weight: 20,
    actions: [
      { text: 'クリティカルパス（遅れると全体が遅れる作業）を洗い出し、そこに人と時間を寄せる', reason: '全部を等しく急いでも全体は縮まないため' },
      { text: 'スコープ・品質・納期のどれを動かせるかをクライアントに選んでもらう', reason: '3つ全部は守れない前提で、意思決定を相手に渡すため' },
      { text: 'テンプレート / 既存コンポーネント / UIキットで作れる部分を最大化する', reason: 'ゼロから作る箇所を減らすのが最も効く時短のため' },
      { text: '並行できる作業（原稿待ちの間にコーディング環境構築など）を前倒しする', reason: '待ち時間を作業時間に変えるため' },
    ],
  },
  {
    phases: [], tags: ['waiting-client'], weight: 20,
    actions: [
      { text: '待ち項目・期限・遅れた場合の納期影響を1通のメールにまとめてリマインドする', reason: '相手が「何をいつまでに返すか」を一目で分かる状態にするため' },
      { text: '返信待ちの間に進められるタスク（別ページ・共通パーツ・検証準備）に着手する', reason: '手を止めないことでスケジュールの余裕を作るため' },
      { text: '判断してほしい点は選択肢を2案こちらから提示し、選ぶだけの状態にする', reason: '相手の返信ハードルを下げると回答が速くなるため' },
    ],
  },
  {
    phases: [], tags: ['tech-unsure'], weight: 20,
    actions: [
      { text: '不安な部分だけを小さく切り出して、動作検証用のプロトタイプを先に作る', reason: '実現可否を早く確定させ、後半のリスクを消すため' },
      { text: '実現方法を2案（確実に動く安全策 / 理想案）用意し、工数とリスクを比較する', reason: '詰まったときに戻れる道を先に用意しておくため' },
      { text: '1つの実装で30分詰まったら手を止め、代替実装・外部サービス・相談を検討する', reason: '沼にはまる時間を制限し、判断を早めるため' },
    ],
  },
  {
    phases: [], tags: ['estimate-unsure'], weight: 20,
    actions: [
      { text: '作業をページ単位・機能単位に分解し、それぞれ所要時間を見積もって合算する', reason: '「なんとなく一式」より、分解した積み上げの方が精度が高いため' },
      { text: '前提条件（支給素材あり / 修正2回まで / CMSは指定 等）を見積書に明記する', reason: '前提が崩れたときに追加請求の根拠になるため' },
      { text: '見積りにバッファ（15〜20%）と、追加対応の時間単価を入れておく', reason: '想定外は必ず起きる前提で組むため' },
    ],
  },
  {
    phases: [], tags: ['many-review-comments'], weight: 20,
    actions: [
      { text: '指摘を「必須修正 / 要相談 / 次フェーズ送り」に分類し、対応順をクライアントと合意する', reason: '全部を同じ優先度で受けると終わらないため' },
      { text: '同種の指摘はまとめて、原因（デザインルールの未定義など）ごと潰す', reason: 'モグラ叩きを止め、再発を防ぐため' },
      { text: '修正後は変更点リストを添えて再提出し、どこを見ればいいか明確にする', reason: '確認が速くなり、レビュー往復が減るため' },
    ],
  },
  {
    phases: [], tags: ['scope-creep'], weight: 18,
    actions: [
      { text: '追加要望は一旦「要望リスト」に記録し、今回対応 / 別途見積りを線引きする', reason: 'その場で即答せず、判断を保留できる置き場を作るため' },
      { text: '変更が納期・費用に与える影響をその場で口頭で伝え、後で書面でも合意する', reason: '「無料でできると思っていた」を防ぐため' },
    ],
  },
  {
    phases: [], tags: ['design-ng'], weight: 18,
    actions: [
      { text: 'NGの理由を「言葉」で引き出す（誰に・何を感じてほしいか）', reason: '感覚的な却下のままだと直しても当たらないため' },
      { text: '方向性の異なる2案を出して、相手の好みの軸を特定する', reason: '好き嫌いの基準を、比較を通じて言語化してもらうため' },
      { text: '参考サイトを一緒に見ながら、要素単位（色・余白・写真・フォント）で合意する', reason: '抽象的な議論を、具体的な部品の話に落とすため' },
    ],
  },
  {
    phases: [], tags: ['no-content'], weight: 18,
    actions: [
      { text: 'ダミーテキスト・仮画像で先に組み、後から差し替えられる構造にしておく', reason: '素材待ちで全体を止めないため' },
      { text: '原稿テンプレート（見出し例・文字数目安・記入欄）を渡して作成負荷を下げる', reason: '「何を書けばいいか分からない」で止まっているケースが多いため' },
      { text: '素材の最終締切と、間に合わない場合の公開範囲（段階公開）を決めておく', reason: '公開日を素材の遅れで動かさないため' },
    ],
  },
  {
    phases: [], tags: ['solo-anxiety'], weight: 16,
    actions: [
      { text: '不安を「分かっていること / 分からないこと / 確認すべき相手」の3つに分けて書き出す', reason: '漠然とした不安を、対処できる小さな項目に変えるため' },
      { text: '今日中に動かせる最小の一歩を1つだけ決めて、まずそれに着手する', reason: '止まっている状態から抜けるのが最優先のため' },
      { text: '判断に迷う点は、クライアント / 先輩 / コミュニティに投げられる質問文の形にまとめる', reason: '人に聞ける状態にするだけで、解決の半分は終わるため' },
    ],
  },
];

// ---- （フェーズ × タグ）の追加ルール --------------------------------
const COMBO_RULES: Rule[] = [
  {
    phases: ['hearing', 'requirements'], tags: ['tight-schedule'], weight: 24,
    actions: [
      { text: '「今回やらないこと」を明文化してクライアント合意を取る', reason: '短納期は、やることを増やさない合意が最初の一手のため' },
    ],
  },
  {
    phases: ['design'], tags: ['tight-schedule'], weight: 24,
    actions: [
      { text: '全ページのカンプ作成をやめ、ワイヤー＋デザイントークン＋主要2ページの提示に切り替える', reason: '実装しながら詰める前提にすると、デザイン工程を大幅に短縮できるため' },
    ],
  },
  {
    phases: ['coding'], tags: ['tech-unsure'], weight: 24,
    actions: [
      { text: '不安な機能を含む1ページだけを縦に貫通させて（設計→実装→動作確認）先に完成させる', reason: '技術リスクを、他の作業に着手する前に潰しておくため' },
    ],
  },
  {
    phases: ['test', 'launch'], tags: ['tight-schedule'], weight: 24,
    actions: [
      { text: 'クリティカルな確認（フォーム到達・主要導線・SP表示・SSL）だけ先に済ませ、軽微は公開後対応に回す合意を取る', reason: '公開を止める不具合と、後で直せる不具合を分けるため' },
    ],
  },
  {
    phases: ['requirements', 'wireframe', 'design'], tags: ['waiting-client'], weight: 22,
    actions: [
      { text: '承認待ちのページは仮確定として先に進め、変更時は差分のみ対応する旨を伝えておく', reason: '承認の遅れが全工程を止めない仕組みにするため' },
    ],
  },
];

const ALL_RULES: Rule[] = [...PHASE_BASELINE, ...TAG_RULES, ...COMBO_RULES];

// ---- エンジン本体 -------------------------------------------------------
function ruleMatches(rule: Rule, phase: string, selectedTags: string[]): boolean {
  const phaseOk = rule.phases.length === 0 || rule.phases.includes(phase);
  const tagOk = rule.tags.length === 0 || rule.tags.some((t) => selectedTags.includes(t));
  return phaseOk && tagOk;
}

/**
 * フェーズと選択された不安タグから、次のアクション候補を返す。
 * - タグが1つも選ばれていない場合は、フェーズのベースラインのみ。
 * - タグが選ばれている場合は、タグ関連ルールを優先しつつベースラインも一部混ぜる。
 */
export function suggestActions(phase: string, selectedTags: string[]): Suggestion[] {
  const matched = ALL_RULES.filter((r) => ruleMatches(r, phase, selectedTags));

  // weight 降順、同weightは元の並び順を保つ
  const ordered = matched
    .map((rule, idx) => ({ rule, idx }))
    .sort((a, b) => b.rule.weight - a.rule.weight || a.idx - b.idx)
    .map((x) => x.rule);

  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const push = (s: Suggestion) => {
    if (seen.has(s.text)) return;
    seen.add(s.text);
    out.push(s);
  };

  const hasTags = selectedTags.length > 0;
  const cap = hasTags ? 6 : 4;

  // タグ由来（weightが高い）を先に詰める
  for (const rule of ordered) {
    const isBaseline = rule.tags.length === 0;
    if (hasTags && isBaseline) continue; // ベースラインは後回し
    for (const a of rule.actions) {
      push(a);
      if (out.length >= cap) return out;
    }
  }

  // 残り枠をフェーズ・ベースラインで埋める
  if (out.length < cap) {
    for (const rule of ordered) {
      if (rule.tags.length !== 0) continue;
      for (const a of rule.actions) {
        push(a);
        if (out.length >= cap) return out;
      }
    }
  }

  return out;
}
