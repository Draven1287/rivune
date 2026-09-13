import { storage } from '../../services/storage/index.js';
export interface Project { id: string; name: string; createdAt: number; folderName?: string; fileCount?: number }
const storageKey = 'rivune.projects.v1';
export function parseProjects(raw: string | null): Project[] {
  try {
    const value: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(value)) return [];
    const ids = new Set<string>();
    return value.filter((row): row is Project => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
      const p = row as Project;
      if (typeof p.id !== 'string' || !p.id || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100 || typeof p.createdAt !== 'number' || !Number.isFinite(p.createdAt)) return false;
      ids.add(p.id); return true;
    }).slice(0, 100).map(p => ({ id: p.id, name: p.name.trim(), createdAt: p.createdAt,
      ...(typeof p.folderName === 'string' && p.folderName.length <= 255 ? { folderName: p.folderName } : {}),
      ...(Number.isInteger(p.fileCount) && p.fileCount! >= 0 ? { fileCount: p.fileCount } : {}),
    }));
  } catch { return []; }
}
function readProjects(): Project[] { try { return parseProjects(storage.getItem(storageKey)); } catch { return []; } }
export function getProjectName(id: string | null | undefined): string | null { return readProjects().find(p => p.id === id)?.name ?? null; }
let currentDialog: HTMLDialogElement | null = null;
export function openProjects(onSelect: (projectId: string | null) => void, currentProjectId?: string | null): void {
  if (currentDialog) { currentDialog.focus(); return; }
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const dialog = document.createElement('dialog');
  currentDialog = dialog;
  dialog.className = 'projects-dialog';
  dialog.setAttribute('aria-labelledby', 'projects-title');
  dialog.innerHTML = '<h2 id="projects-title">Projects</h2><p>Keep related chats together on this device.</p><div class="project-list"></div><form><label for="project-name">New project</label><input id="project-name" maxlength="100" required placeholder="Project name" autocomplete="off"><button type="button" data-folder>Choose a folder (optional)</button><input type="file" data-folder-picker webkitdirectory multiple hidden><p data-folder-note>No folder selected.</p><button type="submit">Create project</button></form><p role="status" data-project-status></p><button type="button" data-close>Done</button>';
  const name = dialog.querySelector<HTMLInputElement>('#project-name')!;
  const status = dialog.querySelector<HTMLElement>('[data-project-status]')!;
  const picker = dialog.querySelector<HTMLInputElement>('[data-folder-picker]')!;
  const folderNote = dialog.querySelector<HTMLElement>('[data-folder-note]')!;
  let folder: { folderName: string; fileCount: number } | null = null;
  const close = () => { dialog.close(); dialog.remove(); currentDialog = null; previousFocus?.focus(); };
  const select = (id: string | null) => { close(); onSelect(id); };
  function renderList(): void {
    const list = dialog.querySelector<HTMLElement>('.project-list')!;
    list.replaceChildren();
    const options = [{ id: null, name: 'All chats' }, ...readProjects()];
    for (const project of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = project.name;
      button.setAttribute('aria-pressed', String((currentProjectId || null) === project.id));
      button.addEventListener('click', () => select(project.id));
      list.append(button);
    }
  }
  dialog.querySelector('[data-folder]')!.addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => {
    const files = picker.files;
    if (!files?.length) return;
    const folderName = files[0].webkitRelativePath.split('/')[0] || 'Selected folder';
    folder = { folderName: folderName.slice(0, 255), fileCount: files.length };
    if (!name.value.trim()) name.value = folderName.slice(0, 100);
    folderNote.textContent = `${folderName} · ${files.length} files listed. Only the folder name and count are saved. File contents are not read; ongoing folder access is not connected.`;
    picker.value = '';
  });
  dialog.querySelector('form')!.addEventListener('submit', event => {
    event.preventDefault();
    const projectName = name.value.trim();
    if (!projectName) { name.focus(); return; }
    const projects = readProjects();
    if (projects.length >= 100) { status.textContent = 'The local project limit is 100.'; return; }
    const project: Project = { id: crypto.randomUUID(), name: projectName.slice(0, 100), createdAt: Date.now(), ...(folder || {}) };
    try { storage.setItem(storageKey, JSON.stringify([...projects, project])); }
    catch { status.textContent = 'Could not save this project. Free device storage or allow local storage, then try again.'; return; }
    select(project.id);
  });
  dialog.querySelector('[data-close]')!.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  renderList();
  document.body.append(dialog);
  dialog.showModal();
}
