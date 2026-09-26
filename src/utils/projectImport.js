import JSZip from 'jszip';
import { validateFiles, validateFilePath, MAX_FILES, MAX_PROJECT_BYTES } from '../shared/projectValidation.js';

export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 30 * 1024 * 1024;
const ignoredDirs = new Set(['node_modules', '.git', '.vscode', '.idea', '__macosx', '__pycache__', '.next', '.nuxt', '.cache', '.local-workspaces', 'dist', 'build', 'coverage', '.venv', '.formatter-venv', 'venv', 'target', 'vendor']);
const binary = /\.(png|jpe?g|gif|webp|ico|bmp|avif|pdf|zip|gz|tar|7z|rar|exe|dll|so|dylib|wasm|woff2?|ttf|otf|eot|mp[34]|mov|avi|wav|sqlite3?|db|pyc|class|jar|docx?|xlsx?|pptx?)$/i;
export function skipReason(path) {
  const parts = path.split('/');
  if (parts.some((part) => part.startsWith('.llm-save-'))) return 'temporary save file';
  if (parts.some((part) => ignoredDirs.has(part.toLowerCase()))) return 'dependency, build, or editor directory';
  if (parts.at(-1) === '.DS_Store') return 'system file';
  if (/^\.env(?:$|\.(?!example$|sample$|template$))/.test(parts.at(-1)) || /\.(pem|key|p12)$/i.test(path)) return 'local credentials';
  if (binary.test(path)) return 'binary asset';
  return '';
}
export function decodeText(bytes) {
  if (bytes.some((byte) => byte === 0)) throw new Error('binary data');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('not UTF-8 text'); }
}
export function normalizeMetadata(meta, files) {
  const paths = new Set(files.map((file) => file.path));
  const comments = (Array.isArray(meta?.comments) ? meta.comments : []).filter((item) => item && paths.has(item.path) && typeof item.text === 'string').slice(0, 1000).map((item) => ({
    id: crypto.randomUUID(), path: item.path, text: item.text.slice(0, 10000),
    from: Number.isInteger(item.from) && item.from > 0 ? item.from : null,
    to: Number.isInteger(item.from) && item.from > 0 ? Math.max(item.from, Number.isInteger(item.to) ? item.to : item.from) : null,
    excerpt: typeof item.excerpt === 'string' ? item.excerpt : '', resolved: item.resolved === true,
    createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
  }));
  return { name: typeof meta?.name === 'string' ? meta.name.trim().slice(0, 200) : '', summary: typeof meta?.summary === 'string' ? meta.summary.slice(0, 4000) : '', comments };
}
async function collect(entries, name) {
  const files = [], skipped = [];
  let bytes = 0, meta;
  for await (const entry of entries) {
    const reason = skipReason(entry.path);
    if (reason) { skipped.push(`${entry.path}: ${reason}`); continue; }
    if (entry.path !== '.localllmmind.json') {
      try { validateFilePath(entry.path); } catch (error) { skipped.push(`${entry.path}: ${error.message}`); continue; }
    }
    let text;
    try {
      if (entry.size > MAX_IMPORT_FILE_BYTES) throw new Error('larger than 2 MB');
      const data = await entry.read();
      if (data.byteLength > MAX_IMPORT_FILE_BYTES) throw new Error('larger than 2 MB');
      text = decodeText(data);
      bytes += data.byteLength;
    } catch (error) { skipped.push(`${entry.path}: ${error.message}`); continue; }
    if (bytes > MAX_PROJECT_BYTES) throw new Error('Project exceeds 20 MB of source text. Choose a smaller folder.');
    if (entry.path === '.localllmmind.json') { try { meta = JSON.parse(text); } catch { skipped.push('Invalid workspace metadata'); } continue; }
    files.push({ path: entry.path, content: text });
    if (files.length > MAX_FILES) throw new Error(`Project exceeds ${MAX_FILES} source files. Choose a smaller folder.`);
  }
  if (!files.length) throw new Error('No supported UTF-8 source files found. Dependencies, generated folders and binary assets are skipped.');
  validateFiles(files);
  const metadata = normalizeMetadata(meta, files);
  return { ...metadata, name: metadata.name || name || 'Imported project', files: files.sort((a, b) => a.path.localeCompare(b.path)), skipped };
}
export async function importDirectoryHandle(handle) {
  async function* walk(directory, prefix = '') {
    for await (const [name, entry] of directory.entries()) {
      const path = prefix + name;
      if (entry.kind === 'directory') {
        if (ignoredDirs.has(name.toLowerCase())) { yield { path: path + '/', size: 0, read: async () => new Uint8Array() }; continue; }
        yield* walk(entry, path + '/');
      } else {
        yield { path, read: async () => { const file = await entry.getFile(); if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error('larger than 2 MB'); return new Uint8Array(await file.arrayBuffer()); } };
      }
    }
  }
  return collect(walk(handle), handle.name);
}
export async function importDirectoryFiles(fileList) {
  const files = Array.from(fileList);
  const root = files[0]?.webkitRelativePath?.split('/')[0];
  return collect(files.map((file) => ({ path: file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name, size: file.size, read: async () => new Uint8Array(await file.arrayBuffer()) })), root);
}
async function readZipEntry(entry) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    const stream = entry.internalStream('uint8array');
    stream.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_IMPORT_FILE_BYTES) { stream.pause(); reject(new Error('larger than 2 MB')); return; }
      chunks.push(chunk);
    }).on('error', reject).on('end', () => {
      const data = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
      resolve(data);
    }).resume();
  });
}
export async function importProjectArchive(file) {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error('Archive exceeds 30 MB. Open the source folder instead.');
  if (/\.json$/i.test(file.name)) {
    const data = JSON.parse(await file.text());
    const files = validateFiles(data.files);
    const meta = normalizeMetadata(data, files);
    return { ...meta, name: meta.name || file.name.replace(/\.json$/i, ''), files, skipped: [] };
  }
  if (!/\.zip$/i.test(file.name)) throw new Error('Choose a ZIP or exported project JSON file.');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files).filter((entry) => !entry.dir && !entry.name.startsWith('__MACOSX/'));
  if (entries.length > 20000) throw new Error('Archive contains too many entries. Open the source folder instead.');
  // JSZip sanitizes traversal paths; inspect the original name before accepting it.
  for (const entry of entries) {
    const original = entry.unsafeOriginalName || entry.name;
    if (original.startsWith('/') || original.includes('\\') || original.split('/').includes('..')) throw new Error('Archive contains unsafe paths.');
  }
  const root = entries[0]?.name.split('/')[0];
  const stripRoot = entries.length > 0 && entries.every((entry) => entry.name.startsWith(root + '/'));
  return collect(entries.map((entry) => ({ path: stripRoot ? entry.name.slice(root.length + 1) : entry.name, read: () => readZipEntry(entry) })), file.name.replace(/\.zip$/i, ''));
}

export const MAX_ATTACHMENTS = 20;
export const MAX_ATTACHMENT_BYTES = 512 * 1024;
export async function readAttachments(files, existing = []) {
  const added = [], skipped = [];
  const seen = new Set(existing.map((item) => item.path));
  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    let reason = skipReason(path);
    if (seen.has(path)) reason = 'already attached';
    if (existing.length + added.length >= MAX_ATTACHMENTS) reason = '20 attachment limit';
    if (file.size > MAX_ATTACHMENT_BYTES) reason = 'larger than 512 KB';
    if (reason) { skipped.push(`${path}: ${reason}`); continue; }
    try {
      const content = decodeText(new Uint8Array(await file.arrayBuffer()));
      added.push({ id: crypto.randomUUID(), name: file.name, path, content, size: file.size }); seen.add(path);
    } catch (error) { skipped.push(`${path}: ${error.message}`); }
  }
  return { attachments: [...existing, ...added], skipped };
}
