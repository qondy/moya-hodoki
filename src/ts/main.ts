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
import { Project, Entry, ProjectKind } from './types';

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
  | { type: 'project'; id: string; label: string };
let pendingDelete: PendingDelete | null = null;

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
  if (pjTitle) head.append(textEl('span', 'entry-card__project', `📁 ${pjTitle}`));
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

    const checkbox = textEl('button', 'action-item__checkbox' + (action.done ? ' is-done' : ''), action.done ? '✓' : '');
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
  const delBtn = textEl('button', 'btn btn--ghost btn--sm', '🗑 この相談を削除');
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

  const archiveBtn = textEl('button', 'icon-btn', project.archived ? '↩' : '📦');
  archiveBtn.setAttribute('type', 'button');
  archiveBtn.setAttribute('aria-label', project.archived ? 'アーカイブ解除' : 'アーカイブ');
  archiveBtn.addEventListener('click', () => {
    if (!currentUid) return;
    updateProject(currentUid, project.id, { archived: !project.archived })
      .catch(() => showToast('更新に失敗しました'));
  });

  const delBtn = textEl('button', 'icon-btn is-danger', '🗑');
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

  const task = target.type === 'entry'
    ? deleteEntry(uid, target.id)
    : deleteProject(uid, target.id);

  task
    .then(() => showToast('削除しました'))
    .catch((err: Error) => showToast('削除に失敗しました: ' + err.message))
    .finally(() => {
      btnConfirmDelete.disabled = false;
      pendingDelete = null;
      closeOverlay(confirmOverlay);
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
