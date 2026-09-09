import { onAuthChange, loginWithGoogle, logout } from './auth';
import { showToast, openOverlay, closeOverlay, textEl, formatDate } from './ui';
import { submitFeedback } from './feedback';
import {
  PHASES, CONCERNS, phaseLabel, concernLabel, suggestActions,
} from './advisor';
import {
  PROJECT_KINDS, kindLabel, subscribeProjects, createProject, updateProject, deleteProject,
} from './projects';
import {
  subscribeEntries, createEntry, updateEntryActions, deleteEntry,
} from './entries';
import {
  getEstimate, saveEstimate, deleteEstimate, emptyEstimate, templateItems,
  calcEstimate, newItemId,
} from './estimates';
import { Project, Entry, Estimate, ProjectKind } from './types';

// ============================================================
// DOM refs
// ============================================================
const loginScreen = document.getElementById('login-screen') as HTMLElement;
const appEl = document.getElementById('app') as HTMLElement;
const userInfo = document.getElementById('user-info') as HTMLElement;
const userAvatar = document.getElementById('user-avatar') as HTMLImageElement;
const userName = document.getElementById('user-name') as HTMLElement;
const btnGoogleLogin = document.getElementById('btn-google-login') as HTMLButtonElement;
const btnLogout = document.getElementById('btn-logout') as HTMLButtonElement;

const consultForm = document.getElementById('consult-form') as HTMLFormElement;
const inputProject = document.getElementById('input-project') as HTMLSelectElement;
const inputPhase = document.getElementById('input-phase') as HTMLSelectElement;
const inputNote = document.getElementById('input-note') as HTMLTextAreaElement;
const concernChips = document.getElementById('concern-chips') as HTMLElement;

const statEntries = document.getElementById('stat-entries') as HTMLElement;
const statDone = document.getElementById('stat-done') as HTMLElement;
const historyList = document.getElementById('history-list') as HTMLElement;
const historyEmpty = document.getElementById('history-empty') as HTMLElement;

const projectForm = document.getElementById('project-form') as HTMLFormElement;
const inputProjectTitle = document.getElementById('input-project-title') as HTMLInputElement;
const inputProjectKind = document.getElementById('input-project-kind') as HTMLSelectElement;
const inputProjectDeadline = document.getElementById('input-project-deadline') as HTMLInputElement;
const projectListEl = document.getElementById('project-list') as HTMLElement;
const projectEmpty = document.getElementById('project-empty') as HTMLElement;
const archivedProjectListEl = document.getElementById('archived-project-list') as HTMLElement;
const archivedCountEl = document.getElementById('archived-count') as HTMLElement;

const confirmDialogTitle = document.getElementById('confirm-dialog-title') as HTMLElement;
const confirmOverlay = document.getElementById('confirm-dialog-overlay') as HTMLElement;
const btnConfirmCancel = document.getElementById('btn-confirm-cancel') as HTMLButtonElement;
const btnConfirmDelete = document.getElementById('btn-confirm-delete') as HTMLButtonElement;

const feedbackBtn = document.getElementById('feedback-btn') as HTMLButtonElement;
const feedbackOverlay = document.getElementById('feedback-modal-overlay') as HTMLElement;
const inputFeedbackMessage = document.getElementById('input-feedback-message') as HTMLTextAreaElement;
const btnFeedbackClose = document.getElementById('btn-feedback-close') as HTMLButtonElement;
const btnFeedbackSend = document.getElementById('btn-feedback-send') as HTMLButtonElement;

const estimateNoProject = document.getElementById('estimate-no-project') as HTMLElement;
const estimatePanel = document.getElementById('estimate-panel') as HTMLElement;
const estimateProjectSelect = document.getElementById('estimate-project') as HTMLSelectElement;
const estimateTemplateKind = document.getElementById('estimate-template-kind') as HTMLSelectElement;
const btnEstimateApplyTemplate = document.getElementById('btn-estimate-apply-template') as HTMLButtonElement;
const btnEstimateClear = document.getElementById('btn-estimate-clear') as HTMLButtonElement;
const estimateSaved = document.getElementById('estimate-saved') as HTMLElement;
const estimateItemsEl = document.getElementById('estimate-items') as HTMLElement;
const btnEstimateAddItem = document.getElementById('btn-estimate-add-item') as HTMLButtonElement;
const estimateBuffer = document.getElementById('estimate-buffer') as HTMLInputElement;
const estimateHpd = document.getElementById('estimate-hpd') as HTMLInputElement;
const estimateDpm = document.getElementById('estimate-dpm') as HTMLInputElement;
const estimateTotalsEl = document.getElementById('estimate-totals') as HTMLElement;

// ============================================================
// State
// ============================================================
let currentUid: string | null = null;
let unsubscribeProjects: (() => void) | null = null;
let unsubscribeEntries: (() => void) | null = null;
let allProjects: Project[] = [];
let allEntries: Entry[] = [];
const selectedConcerns = new Set<string>();
let freshEntryId: string | null = null;

type PendingDelete =
  | { type: 'entry'; id: string; label: string }
  | { type: 'project'; id: string; label: string }
  | { type: 'estimate-clear'; id: string; label: string };
let pendingDelete: PendingDelete | null = null;

// 工数見積り
let estimateProjectId: string | null = null;
let currentEstimate: Estimate | null = null;
let estimateIsNew = true;
let estimateSaveTimer: number | null = null;

// ============================================================
// 静的セレクトの初期化
// ============================================================
function initStaticControls(): void {
  PHASES.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.key;
    opt.textContent = p.label;
    inputPhase.append(opt);
  });

  PROJECT_KINDS.forEach((k) => {
    const opt = document.createElement('option');
    opt.value = k.key;
    opt.textContent = k.label;
    inputProjectKind.append(opt);

    const tplOpt = document.createElement('option');
    tplOpt.value = k.key;
    tplOpt.textContent = `${k.label}テンプレート`;
    estimateTemplateKind.append(tplOpt);
  });

  CONCERNS.forEach((c) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = c.label;
    chip.dataset.key = c.key;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      if (selectedConcerns.has(c.key)) {
        selectedConcerns.delete(c.key);
        chip.classList.remove('is-selected');
        chip.setAttribute('aria-pressed', 'false');
      } else {
        selectedConcerns.add(c.key);
        chip.classList.add('is-selected');
        chip.setAttribute('aria-pressed', 'true');
      }
    });
    concernChips.append(chip);
  });
}
initStaticControls();

// ============================================================
// Auth
// ============================================================
onAuthChange((user) => {
  if (unsubscribeProjects) { unsubscribeProjects(); unsubscribeProjects = null; }
  if (unsubscribeEntries) { unsubscribeEntries(); unsubscribeEntries = null; }

  if (user) {
    currentUid = user.uid;
    loginScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
    userInfo.classList.remove('hidden');
    userAvatar.src = user.photoURL || '';
    userAvatar.alt = '';
    userName.textContent = user.displayName || user.email || '';

    unsubscribeProjects = subscribeProjects(currentUid, (projects) => {
      allProjects = projects;
      renderProjectSelect();
      renderProjects();
      renderHistory();
      syncEstimateSection();
    });
    unsubscribeEntries = subscribeEntries(currentUid, (entries) => {
      allEntries = entries;
      renderStats();
      renderHistory();
    });
  } else {
    currentUid = null;
    allProjects = [];
    allEntries = [];
    estimateProjectId = null;
    currentEstimate = null;
    if (estimateSaveTimer !== null) { window.clearTimeout(estimateSaveTimer); estimateSaveTimer = null; }
    loginScreen.classList.remove('hidden');
    appEl.classList.add('hidden');
    userInfo.classList.add('hidden');
  }
});

btnGoogleLogin.addEventListener('click', () => {
  loginWithGoogle().catch((e: Error) => showToast('ログインに失敗しました: ' + e.message));
});

btnLogout.addEventListener('click', () => {
  logout();
});

// ============================================================
// 相談フォーム
// ============================================================
function renderProjectSelect(): void {
  const prev = inputProject.value;
  inputProject.innerHTML = '';
  const base = document.createElement('option');
  base.value = '';
  base.textContent = '案件に紐づけない';
  inputProject.append(base);

  allProjects
    .filter((p) => !p.archived)
    .forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.title;
      inputProject.append(opt);
    });

  if (allProjects.some((p) => p.id === prev && !p.archived)) {
    inputProject.value = prev;
  }
}

consultForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUid) return;
  const submitBtn = consultForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (submitBtn.disabled) return;

  const phase = inputPhase.value;
  const note = inputNote.value.trim();
  const tags = [...selectedConcerns];
  const projectId = inputProject.value || null;
  const suggestions = suggestActions(phase, tags);

  submitBtn.disabled = true;
  createEntry(currentUid, { projectId, phase, concernTags: tags, note }, suggestions)
    .then((id) => {
      freshEntryId = id;
      inputNote.value = '';
      selectedConcerns.clear();
      concernChips.querySelectorAll('.chip').forEach((c) => {
        c.classList.remove('is-selected');
        c.setAttribute('aria-pressed', 'false');
      });
      showToast('次のアクションを用意しました');
      window.setTimeout(() => {
        document.getElementById(`entry-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    })
    .catch((err: Error) => showToast('保存に失敗しました: ' + err.message))
    .finally(() => { submitBtn.disabled = false; });
});

// ============================================================
// 統計
// ============================================================
function renderStats(): void {
  statEntries.textContent = String(allEntries.length);
  const done = allEntries.reduce(
    (sum, entry) => sum + entry.actions.filter((a) => a.done).length,
    0,
  );
  statDone.textContent = String(done);
}

// ============================================================
// 相談履歴
// ============================================================
function projectTitleOf(projectId: string | null): string | null {
  if (!projectId) return null;
  return allProjects.find((p) => p.id === projectId)?.title ?? null;
}

function renderHistory(): void {
  historyList.innerHTML = '';
  historyEmpty.classList.toggle('hidden', allEntries.length > 0);
  allEntries.forEach((entry) => historyList.append(renderEntryCard(entry)));
}

function renderEntryCard(entry: Entry): HTMLElement {
  const card = document.createElement('div');
  card.className = 'entry-card';
  card.id = `entry-${entry.id}`;
  if (entry.id === freshEntryId) card.classList.add('is-fresh');

  // --- head ---
  const head = document.createElement('div');
  head.className = 'entry-card__head';
  head.append(textEl('span', 'entry-card__phase', phaseLabel(entry.phase)));
  const pjTitle = projectTitleOf(entry.projectId);
  if (pjTitle) {
    const pjSpan = textEl('span', 'entry-card__project', '');
    pjSpan.innerHTML = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-3px;display:inline-block"><path d="M10 18 H26 L32 24 H54 V48 H10 Z"/></svg>';
    pjSpan.append(document.createTextNode(` ${pjTitle}`));
    head.append(pjSpan);
  }
  const when = entry.createdAt ? formatDate(entry.createdAt.toDate()) : '';
  if (when) head.append(textEl('span', 'entry-card__date', when));
  card.append(head);

  // --- note ---
  if (entry.note) {
    card.append(textEl('div', 'entry-card__note', entry.note));
  }

  // --- concern tags ---
  if (entry.concernTags.length > 0) {
    const tags = document.createElement('div');
    tags.className = 'entry-card__tags';
    entry.concernTags.forEach((t) => tags.append(textEl('span', 'entry-card__tag', concernLabel(t))));
    card.append(tags);
  }

  // --- progress ---
  const doneCount = entry.actions.filter((a) => a.done).length;
  card.append(
    textEl('div', 'entry-card__progress', `次のアクション ${doneCount}/${entry.actions.length} 完了`),
  );

  // --- action list ---
  const list = document.createElement('div');
  list.className = 'action-list';
  entry.actions.forEach((action, idx) => {
    const item = document.createElement('div');
    item.className = 'action-item' + (action.done ? ' is-done' : '');

    const checkbox = document.createElement('button');
  checkbox.className = 'action-item__checkbox' + (action.done ? ' is-done' : '');
  checkbox.innerHTML = action.done ? '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" style="width:0.8em;height:0.8em"><path d="M14 33 L26 45 L50 19"/></svg>' : '';
    checkbox.setAttribute('type', 'button');
    checkbox.setAttribute('aria-label', action.done ? '未完了に戻す' : '完了にする');
    checkbox.addEventListener('click', () => toggleAction(entry, idx));

    const body = document.createElement('div');
    body.className = 'action-item__body';
    body.append(textEl('div', 'action-item__text', action.text));
    if (action.reason) body.append(textEl('div', 'action-item__reason', `なぜ: ${action.reason}`));

    item.append(checkbox, body);
    list.append(item);
  });
  card.append(list);

  // --- footer (delete) ---
  const footer = document.createElement('div');
  footer.className = 'entry-card__footer';
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn--ghost btn--sm';
  delBtn.innerHTML = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><path d="M14 18 H50"/><path d="M22 18 V12 Q22 10 24 10 H40 Q42 10 42 12 V18"/><path d="M18 18 L21 52 Q21 54 23 54 H41 Q43 54 43 52 L46 18"/><line x1="26" y1="26" x2="27" y2="46"/><line x1="38" y1="26" x2="37" y2="46"/></svg> この相談を削除';
  delBtn.setAttribute('type', 'button');
  delBtn.addEventListener('click', () => {
    pendingDelete = { type: 'entry', id: entry.id, label: `${phaseLabel(entry.phase)}の相談` };
    confirmDialogTitle.textContent = `「${phaseLabel(entry.phase)}」の相談を削除しますか？`;
    openOverlay(confirmOverlay);
  });
  footer.append(delBtn);
  card.append(footer);

  return card;
}

function toggleAction(entry: Entry, idx: number): void {
  if (!currentUid) return;
  const next = entry.actions.map((a, i) => (i === idx ? { ...a, done: !a.done } : a));
  updateEntryActions(currentUid, entry.id, next).catch(() => showToast('更新に失敗しました'));
}

// ============================================================
// 案件
// ============================================================
projectForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUid) return;
  const title = inputProjectTitle.value.trim();
  if (!title) return;
  const submitBtn = projectForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;

  const kind = inputProjectKind.value as ProjectKind;
  const deadline = inputProjectDeadline.value || null;

  createProject(currentUid, title, kind, deadline)
    .then(() => {
      projectForm.reset();
      showToast('案件を追加しました');
    })
    .catch((err: Error) => showToast('追加に失敗しました: ' + err.message))
    .finally(() => { submitBtn.disabled = false; });
});

function renderProjects(): void {
  projectListEl.innerHTML = '';
  archivedProjectListEl.innerHTML = '';

  const active = allProjects.filter((p) => !p.archived);
  const archived = allProjects.filter((p) => p.archived);

  projectEmpty.classList.toggle('hidden', active.length > 0);
  active.forEach((p) => projectListEl.append(renderProjectRow(p)));
  archived.forEach((p) => archivedProjectListEl.append(renderProjectRow(p)));
  archivedCountEl.textContent = String(archived.length);
}

function renderProjectRow(project: Project): HTMLElement {
  const row = document.createElement('div');
  row.className = 'project-row' + (project.archived ? ' is-archived' : '');

  row.append(textEl('span', 'project-row__title', project.title));

  const metaParts = [kindLabel(project.kind)];
  if (project.deadline) metaParts.push(`〆 ${project.deadline}`);
  row.append(textEl('span', 'project-row__meta', metaParts.join(' ・ ')));

  const actions = document.createElement('div');
  actions.className = 'project-row__actions';

  const archiveBtn = document.createElement('button');
  archiveBtn.className = 'icon-btn';
  archiveBtn.innerHTML = project.archived ? '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><path d="M22 22 H40 A14 14 0 1 1 40 50 H30"/><path d="M30 12 L18 22 L30 32"/></svg>' : '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><path d="M10 20 L32 10 L54 20 L32 30 Z"/><path d="M10 20 V46 L32 56 V30"/><path d="M54 20 V46 L32 56"/></svg>';
  archiveBtn.setAttribute('type', 'button');
  archiveBtn.setAttribute('aria-label', project.archived ? 'アーカイブ解除' : 'アーカイブ');
  archiveBtn.addEventListener('click', () => {
    if (!currentUid) return;
    updateProject(currentUid, project.id, { archived: !project.archived })
      .catch(() => showToast('更新に失敗しました'));
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn is-danger';
  delBtn.innerHTML = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><path d="M14 18 H50"/><path d="M22 18 V12 Q22 10 24 10 H40 Q42 10 42 12 V18"/><path d="M18 18 L21 52 Q21 54 23 54 H41 Q43 54 43 52 L46 18"/><line x1="26" y1="26" x2="27" y2="46"/><line x1="38" y1="26" x2="37" y2="46"/></svg>';
  delBtn.setAttribute('type', 'button');
  delBtn.setAttribute('aria-label', '削除');
  delBtn.addEventListener('click', () => {
    pendingDelete = { type: 'project', id: project.id, label: project.title };
    confirmDialogTitle.textContent = `案件「${project.title}」を削除しますか？`;
    openOverlay(confirmOverlay);
  });

  actions.append(archiveBtn, delBtn);
  row.append(actions);
  return row;
}

// ============================================================
// 削除確認ダイアログ（共通）
// ============================================================
btnConfirmCancel.addEventListener('click', () => {
  pendingDelete = null;
  closeOverlay(confirmOverlay);
});

btnConfirmDelete.addEventListener('click', () => {
  if (!currentUid || !pendingDelete || btnConfirmDelete.disabled) return;
  btnConfirmDelete.disabled = true;
  const uid = currentUid;
  const target = pendingDelete;

  let task: Promise<void>;
  if (target.type === 'entry') {
    task = deleteEntry(uid, target.id);
  } else if (target.type === 'project') {
    // 案件に紐づく工数見積りもあわせて削除（存在しなくてもエラーにしない）
    task = deleteProject(uid, target.id).then(() => {
      if (estimateProjectId === target.id) {
        estimateProjectId = null;
        currentEstimate = null;
      }
      return deleteEstimate(uid, target.id).catch(() => undefined);
    });
  } else {
    task = clearEstimateItems();
  }

  task
    .then(() => showToast(target.type === 'estimate-clear' ? '項目を消去しました' : '削除しました'))
    .catch((err: Error) => showToast('操作に失敗しました: ' + err.message))
    .finally(() => {
      btnConfirmDelete.disabled = false;
      pendingDelete = null;
      closeOverlay(confirmOverlay);
    });
});

// ============================================================
// 工数見積り
// ============================================================
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function fmtHours(h: number): string {
  return `${Math.round(h * 10) / 10}h`;
}

function syncEstimateSection(): void {
  const active = allProjects.filter((p) => !p.archived);
  const hasProjects = active.length > 0;
  estimateNoProject.classList.toggle('hidden', hasProjects);
  estimatePanel.classList.toggle('hidden', !hasProjects);

  if (!hasProjects) {
    estimateProjectId = null;
    currentEstimate = null;
    return;
  }

  const desired = active.some((p) => p.id === estimateProjectId)
    ? (estimateProjectId as string)
    : active[0].id;

  estimateProjectSelect.innerHTML = '';
  active.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.title;
    estimateProjectSelect.append(opt);
  });
  estimateProjectSelect.value = desired;

  if (desired !== estimateProjectId || currentEstimate === null) {
    void loadEstimate(desired);
  }
}

async function loadEstimate(projectId: string): Promise<void> {
  if (!currentUid) return;
  estimateProjectId = projectId;
  if (estimateSaveTimer !== null) { window.clearTimeout(estimateSaveTimer); estimateSaveTimer = null; }
  estimateSaved.textContent = '';

  let est: Estimate | null = null;
  try {
    est = await getEstimate(currentUid, projectId);
  } catch {
    showToast('見積りの読み込みに失敗しました');
  }
  if (estimateProjectId !== projectId) return; // 読み込み中に案件が切り替わった

  estimateIsNew = est === null;
  currentEstimate = est ?? emptyEstimate(projectId);

  const project = allProjects.find((p) => p.id === projectId);
  if (project) estimateTemplateKind.value = project.kind;

  estimateBuffer.value = String(currentEstimate.bufferPercent);
  estimateHpd.value = String(currentEstimate.hoursPerDay);
  estimateDpm.value = String(currentEstimate.daysPerMonth);

  renderEstimateItems();
  renderEstimateTotals();
}

function renderEstimateItems(): void {
  estimateItemsEl.innerHTML = '';
  if (!currentEstimate) return;

  if (currentEstimate.items.length === 0) {
    estimateItemsEl.append(
      textEl('p', 'estimate-table__empty', '「テンプレを追加」または「＋ 項目を追加」から作業を積み上げましょう。'),
    );
    return;
  }

  currentEstimate.items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'estimate-row';

    const label = document.createElement('input');
    label.type = 'text';
    label.className = 'estimate-row__label';
    label.value = item.label;
    label.placeholder = '作業内容';
    label.maxLength = 60;
    label.addEventListener('input', () => { item.label = label.value; scheduleEstimateSave(); });

    const hours = document.createElement('input');
    hours.type = 'number';
    hours.className = 'estimate-row__num';
    hours.min = '0';
    hours.step = '0.5';
    hours.setAttribute('inputmode', 'decimal');
    hours.value = String(item.hours);
    hours.setAttribute('aria-label', '1件あたりの工数（時間）');

    const qty = document.createElement('input');
    qty.type = 'number';
    qty.className = 'estimate-row__num';
    qty.min = '0';
    qty.step = '1';
    qty.setAttribute('inputmode', 'numeric');
    qty.value = String(item.qty);
    qty.setAttribute('aria-label', '数量');

    const subtotal = textEl('span', 'estimate-row__subtotal', fmtHours(num(item.hours) * num(item.qty)));

    const recompute = () => {
      item.hours = num(hours.value);
      item.qty = num(qty.value);
      subtotal.textContent = fmtHours(item.hours * item.qty);
      renderEstimateTotals();
      scheduleEstimateSave();
    };
    hours.addEventListener('input', recompute);
    qty.addEventListener('input', recompute);

    const del = document.createElement('button');
    del.className = 'icon-btn is-danger estimate-row__del';
    del.innerHTML = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><path d="M14 18 H50"/><path d="M22 18 V12 Q22 10 24 10 H40 Q42 10 42 12 V18"/><path d="M18 18 L21 52 Q21 54 23 54 H41 Q43 54 43 52 L46 18"/><line x1="26" y1="26" x2="27" y2="46"/><line x1="38" y1="26" x2="37" y2="46"/></svg>';
    del.setAttribute('type', 'button');
    del.setAttribute('aria-label', '項目を削除');
    del.addEventListener('click', () => {
      if (!currentEstimate) return;
      currentEstimate.items = currentEstimate.items.filter((it) => it.id !== item.id);
      renderEstimateItems();
      renderEstimateTotals();
      scheduleEstimateSave();
    });

    const hWrap = document.createElement('span');
    hWrap.className = 'estimate-row__field';
    hWrap.append(hours, textEl('span', 'estimate-row__unit', 'h'));

    const qWrap = document.createElement('span');
    qWrap.className = 'estimate-row__field';
    qWrap.append(textEl('span', 'estimate-row__unit', '×'), qty);

    row.append(label, hWrap, qWrap, subtotal, del);
    estimateItemsEl.append(row);
  });
}

function renderEstimateTotals(): void {
  if (!currentEstimate) return;
  currentEstimate.bufferPercent = num(estimateBuffer.value);
  currentEstimate.hoursPerDay = num(estimateHpd.value) || currentEstimate.hoursPerDay;
  currentEstimate.daysPerMonth = num(estimateDpm.value) || currentEstimate.daysPerMonth;

  const t = calcEstimate(currentEstimate);
  estimateTotalsEl.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'estimate-totals__grid';
  const cell = (labelText: string, value: string, strong = false) => {
    const c = document.createElement('div');
    c.className = 'estimate-totals__cell' + (strong ? ' is-strong' : '');
    c.append(textEl('div', 'estimate-totals__label', labelText));
    c.append(textEl('div', 'estimate-totals__value', value));
    return c;
  };
  grid.append(cell('作業工数', fmtHours(t.baseHours)));
  grid.append(cell(`予備（${Math.round(currentEstimate.bufferPercent)}%）`, fmtHours(t.bufferHours)));
  grid.append(cell('合計工数', fmtHours(t.totalHours), true));
  grid.append(cell('人日換算', `${Math.round(t.personDays * 10) / 10} 人日`));
  grid.append(cell('人月換算', `${Math.round(t.personMonths * 100) / 100} 人月`));
  estimateTotalsEl.append(grid);
}

function scheduleEstimateSave(): void {
  if (estimateSaveTimer !== null) window.clearTimeout(estimateSaveTimer);
  estimateSaved.textContent = '保存中…';
  estimateSaveTimer = window.setTimeout(() => {
    estimateSaveTimer = null;
    void flushEstimateSave();
  }, 800);
}

async function flushEstimateSave(): Promise<void> {
  if (!currentUid || !currentEstimate) return;
  const uid = currentUid;
  const snapshot = currentEstimate;
  try {
    await saveEstimate(uid, snapshot, estimateIsNew);
    estimateIsNew = false;
    if (currentEstimate === snapshot) estimateSaved.textContent = '保存しました';
  } catch {
    estimateSaved.textContent = '';
    showToast('見積りの保存に失敗しました');
  }
}

function clearEstimateItems(): Promise<void> {
  if (!currentEstimate) return Promise.resolve();
  currentEstimate.items = [];
  renderEstimateItems();
  renderEstimateTotals();
  if (estimateSaveTimer !== null) { window.clearTimeout(estimateSaveTimer); estimateSaveTimer = null; }
  return flushEstimateSave();
}

estimateProjectSelect.addEventListener('change', () => {
  void loadEstimate(estimateProjectSelect.value);
});

btnEstimateAddItem.addEventListener('click', () => {
  if (!currentEstimate) return;
  currentEstimate.items.push({ id: newItemId(), label: '', hours: 0, qty: 1 });
  renderEstimateItems();
  renderEstimateTotals();
  const rows = estimateItemsEl.querySelectorAll('.estimate-row__label');
  (rows[rows.length - 1] as HTMLInputElement | undefined)?.focus();
  scheduleEstimateSave();
});

btnEstimateApplyTemplate.addEventListener('click', () => {
  if (!currentEstimate) return;
  const kind = estimateTemplateKind.value as ProjectKind;
  currentEstimate.items.push(...templateItems(kind));
  renderEstimateItems();
  renderEstimateTotals();
  scheduleEstimateSave();
});

btnEstimateClear.addEventListener('click', () => {
  if (!currentEstimate || currentEstimate.items.length === 0) return;
  pendingDelete = { type: 'estimate-clear', id: estimateProjectId ?? '', label: '工数見積りの全項目' };
  confirmDialogTitle.textContent = '工数見積りの項目をすべて消去しますか？';
  openOverlay(confirmOverlay);
});

[estimateBuffer, estimateHpd, estimateDpm].forEach((inp) => {
  inp.addEventListener('input', () => {
    renderEstimateTotals();
    scheduleEstimateSave();
  });
});

// ============================================================
// 要望送信モーダル
// ============================================================
feedbackBtn.addEventListener('click', () => {
  inputFeedbackMessage.value = '';
  openOverlay(feedbackOverlay);
});

btnFeedbackClose.addEventListener('click', () => closeOverlay(feedbackOverlay));

btnFeedbackSend.addEventListener('click', () => {
  const message = inputFeedbackMessage.value.trim();
  if (!message || btnFeedbackSend.disabled) return;
  btnFeedbackSend.disabled = true;
  submitFeedback(message)
    .then((ok) => {
      showToast(ok ? '送信しました。ありがとうございます！' : '送信に失敗しました');
      if (ok) closeOverlay(feedbackOverlay);
    })
    .finally(() => {
      btnFeedbackSend.disabled = false;
    });
});
