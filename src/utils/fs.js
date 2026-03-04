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
  const id  = `p_${Date.now()}`;
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

// FIX: rename only updates metadata — physical dir path stays the same
export async function renameProject(pid, newName) {
  const meta = await loadMeta();
  const proj = (meta.projects || []).find(p => p.id === pid);
  if (!proj) throw new Error('Project not found');
  proj.name = newName.trim();
  await saveMeta(meta);
}

// ── Folders ──────────────────────────────────────────────────────────────────

// FIX: less aggressive sanitisation — only strip characters unsafe for filesystem paths
function sanitiseFolderName(name) {
  return name.replace(/[/\\:*?"<>|]/g, '').trim();
}

export async function createFolder(projectId, parentDir, folderName, parentFolders = []) {
  const safe = sanitiseFolderName(folderName);
  // Ensure unique dir name by appending timestamp
  const dir = `${parentDir}${safe}_${Date.now()}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const folder = {
    id: `f_${Date.now()}`,
    name: safe,           // display name — can be renamed without touching dir
    dir,
    createdAt: new Date().toISOString(),
    subfolders: [],
  };

  const meta = await loadMeta();
  const proj = (meta.projects || []).find(p => p.id === projectId);
  if (!proj) return folder;

  if (parentDir === proj.dir) {
    proj.folders = [...(proj.folders || []), folder];
  } else {
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

// FIX: rename folder only updates display name in metadata — no filesystem move
export async function renameFolder(projectId, folderId, newName) {
  const meta = await loadMeta();
  const proj = (meta.projects || []).find(p => p.id === projectId);
  if (!proj) throw new Error('Project not found');

  const findAndRename = (folders) => {
    for (const f of folders) {
      if (f.id === folderId) { f.name = newName.trim(); return true; }
      if (f.subfolders && findAndRename(f.subfolders)) return true;
    }
    return false;
  };
  findAndRename(proj.folders || []);
  await saveMeta(meta);
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
  const ts  = Date.now();
  const lat = opts.lat != null ? `_${opts.lat.toFixed(5)}`  : '';
  const lng = opts.lng != null ? `_${opts.lng.toFixed(5)}`  : '';
  const wm  = opts.watermark ? '_WM' : '';
  const name = `SS_${ts}${lat}${lng}${wm}.jpg`;
  const dest = `${dir}${name}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return { name, uri: dest };
}

export async function deletePhoto(uri) {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

// Move a photo to a different folder directory
export async function movePhoto(fromUri, toDir) {
  const filename = fromUri.split('/').pop();
  const dest = `${toDir}${filename}`;
  await FileSystem.moveAsync({ from: fromUri, to: dest });
  return { name: filename, uri: dest };
}

// FIX: parallel counting using Promise.all instead of sequential await
export async function countPhotosInTree(folder) {
  const [directPhotos, subCounts] = await Promise.all([
    getPhotos(folder.dir).then(p => p.length),
    Promise.all((folder.subfolders || []).map(sub => countPhotosInTree(sub))),
  ]);
  return directPhotos + subCounts.reduce((a, b) => a + b, 0);
}

// Collect all photos recursively from a folder tree
export async function getAllPhotosInTree(folder) {
  const [direct, subPhotos] = await Promise.all([
    getPhotos(folder.dir),
    Promise.all((folder.subfolders || []).map(sub => getAllPhotosInTree(sub))),
  ]);
  return [...direct, ...subPhotos.flat()];
}

// Export entire project as ZIP
export async function exportProjectAsZip(projectId) {
  const meta = await loadMeta();
  const proj = (meta.projects || []).find(p => p.id === projectId);
  if (!proj) throw new Error('Project not found');

  const zipPath = `${FileSystem.cacheDirectory}${proj.name.replace(/\s+/g, '_')}_export.zip`;

  if (typeof FileSystem.createZipAsync === 'function') {
    await FileSystem.createZipAsync({
      sourceDirectory: proj.dir,
      outputFilePath: zipPath,
    });
    return zipPath;
  }
  throw new Error('ZIP export requires a newer version of expo-file-system.');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// Parse timestamp from a SurveySnap photo filename
// Format: SS_{timestamp}[_{lat}][_{lng}][_WM].jpg
export function parsePhotoMeta(filename) {
  const base = filename.replace(/_WM\.jpg$/i, '').replace(/\.jpg$/i, '');
  const parts = base.split('_');
  // parts[0]='SS', parts[1]=timestamp, parts[2]=lat?, parts[3]=lng?
  const ts  = parseInt(parts[1], 10);
  const lat = parts.length >= 4 ? parseFloat(parts[2]) : NaN;
  const lng = parts.length >= 4 ? parseFloat(parts[3]) : NaN;
  return {
    timestamp: isNaN(ts) ? null : new Date(ts),
    lat: isNaN(lat) ? null : lat,
    lng: isNaN(lng) ? null : lng,
  };
}
