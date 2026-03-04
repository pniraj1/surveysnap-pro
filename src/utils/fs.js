// src/utils/fs.js — Local Storage Engine
import * as FileSystem from 'expo-file-system';

const ROOT = `${FileSystem.documentDirectory}SurveySnap/`;
const META = `${ROOT}meta.json`;

// ── Bootstrap ───────────────────────────────────────────────────────────────
export async function boot() {
  const info = await FileSystem.getInfoAsync(ROOT);
  if (!info.exists) await FileSystem.makeDirectoryAsync(ROOT, { intermediates: true });
}

// ── Projects ─────────────────────────────────────────────────────────────────
export async function loadMeta() {
  await boot();
  try {
    const info = await FileSystem.getInfoAsync(META);
    if (!info.exists) return { projects: [] };
    const raw = await FileSystem.readAsStringAsync(META);
    return JSON.parse(raw);
  } catch { return { projects: [] }; }
}

export async function saveMeta(data) {
  await FileSystem.writeAsStringAsync(META, JSON.stringify(data));
}

export async function getProjects() {
  const { projects } = await loadMeta();
  return projects || [];
}

export async function createProject(name) {
  const meta = await loadMeta();
  const id = `p_${Date.now()}`;
  const dir = `${ROOT}${id}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const proj = { id, name, dir, createdAt: new Date().toISOString(), folders: [] };
  meta.projects = [proj, ...(meta.projects || [])];
  await saveMeta(meta);
  return proj;
}

export async function deleteProject(pid) {
  const meta = await loadMeta();
  const proj = (meta.projects || []).find(p => p.id === pid);
  if (proj) {
    const info = await FileSystem.getInfoAsync(proj.dir);
    if (info.exists) await FileSystem.deleteAsync(proj.dir, { idempotent: true });
  }
  meta.projects = (meta.projects || []).filter(p => p.id !== pid);
  await saveMeta(meta);
}

// ── Folders ──────────────────────────────────────────────────────────────────
export async function createFolder(projectId, parentDir, folderName, parentFolders = []) {
  const safe = folderName.replace(/[^\w\s\-]/g, '').trim();
  const dir = `${parentDir}${safe}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const folder = {
    id: `f_${Date.now()}`,
    name: safe,
    dir,
    createdAt: new Date().toISOString(),
    subfolders: [],
  };

  // Recursively update project meta
  const meta = await loadMeta();
  const proj = (meta.projects || []).find(p => p.id === projectId);
  if (!proj) return folder;

  if (parentDir === proj.dir) {
    proj.folders = [...(proj.folders || []), folder];
  } else {
    // Find parent folder in tree and append
    const appendTo = (folders) => {
      for (const f of folders) {
        if (f.dir === parentDir) { f.subfolders = [...(f.subfolders || []), folder]; return true; }
        if (f.subfolders && appendTo(f.subfolders)) return true;
      }
      return false;
    };
    appendTo(proj.folders || []);
  }
  await saveMeta(meta);
  return folder;
}

export async function getFolderTree(projectId) {
  const meta = await loadMeta();
  const proj = (meta.projects || []).find(p => p.id === projectId);
  return proj ? (proj.folders || []) : [];
}

// ── Photos ───────────────────────────────────────────────────────────────────
export async function getPhotos(dir) {
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) return [];
    const files = await FileSystem.readDirectoryAsync(dir);
    return files
      .filter(f => /\.(jpg|jpeg)$/i.test(f))
      .sort((a, b) => b.localeCompare(a)) // newest first
      .map(f => ({ name: f, uri: `${dir}${f}` }));
  } catch { return []; }
}

export async function savePhoto(dir, tempUri, opts = {}) {
  const ts = Date.now();
  const lat = opts.lat != null ? `_${opts.lat.toFixed(5)}` : '';
  const lng = opts.lng != null ? `_${opts.lng.toFixed(5)}` : '';
  const wm  = opts.watermark ? '_WM' : '';
  const name = `SS_${ts}${lat}${lng}${wm}.jpg`;
  const dest = `${dir}${name}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return { name, uri: dest };
}

export async function deletePhoto(uri) {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function countPhotosInTree(folder) {
  let count = 0;
  const photos = await getPhotos(folder.dir);
  count += photos.length;
  for (const sub of (folder.subfolders || [])) {
    count += await countPhotosInTree(sub);
  }
  return count;
}

// ── Sizing ───────────────────────────────────────────────────────────────────
export async function getDirSize(dir) {
  try {
    const files = await FileSystem.readDirectoryAsync(dir);
    let total = 0;
    for (const f of files) {
      const info = await FileSystem.getInfoAsync(`${dir}${f}`, { size: true });
      if (info.size) total += info.size;
    }
    return total;
  } catch { return 0; }
}

export function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
