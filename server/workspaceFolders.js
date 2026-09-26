import { readdir, realpath, lstat, mkdir, open, rename, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { skipReason, decodeText, MAX_IMPORT_FILE_BYTES } from '../src/utils/projectImport.js';
import { validateFilePath, MAX_FILES, MAX_PROJECT_BYTES } from '../src/shared/projectValidation.js';
const hash = (data) => createHash('sha256').update(data).digest('hex');

export function createFolderStore() {
  const folders = new Map();
  async function get(id) {
    const folder = folders.get(id);
    if (!folder) throw new Error('Folder connection expired. Reconnect the folder.');
    if (await realpath(folder.path) !== folder.path) throw new Error('The connected folder has moved or become a symbolic link. Reconnect it.');
    return folder;
  }
  async function target(folder, relative, createParents = false) {
    validateFilePath(relative);
    if (skipReason(relative)) throw new Error(`Cannot edit excluded path: ${relative}`);
    const parts = relative.split('/'); let current = folder.path;
    for (const part of parts.slice(0, -1)) {
      current = path.join(current, part);
      if (createParents) await mkdir(current).catch((error) => { if (error.code !== 'EEXIST') throw error; });
      const stat = await lstat(current);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Unsafe parent directory: ${relative}`);
    }
    return path.join(current, parts.at(-1));
  }
  async function diskFile(filename) {
    let file;
    try {
      file = await open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > MAX_IMPORT_FILE_BYTES) throw new Error('File is no longer a supported source file.');
      const bytes = await file.readFile();
      return { hash: hash(bytes), mode: stat.mode, content: decodeText(bytes) };
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    finally { await file?.close(); }
  }
  async function scan(id) {
    const folder = await get(id); const files = [], hashes = Object.create(null), skipped = [];
    let bytes = 0, entries = 0;
    async function walk(dir, prefix = '') {
      for (const item of await readdir(dir, { withFileTypes: true })) {
        if (++entries > 30000) throw new Error('Folder has too many entries. Open a smaller source folder.');
        const relative = prefix + item.name;
        if (skipReason(relative) || item.isSymbolicLink()) { skipped.push(relative); continue; }
        if (item.isDirectory()) {
          // Recheck parents to avoid following directory symlinks introduced during a scan.
          await target(folder, relative + '/probe');
          await walk(path.join(dir, item.name), relative + '/');
        } else if (item.isFile()) {
          try { validateFilePath(relative); } catch { skipped.push(relative); continue; }
          let source;
          try { source = await diskFile(await target(folder, relative)); }
          catch (error) { if (error.code === 'EACCES') throw error; skipped.push(relative); continue; }
          if (!source) continue;
          bytes += Buffer.byteLength(source.content);
          if (bytes > MAX_PROJECT_BYTES || files.length >= MAX_FILES) throw new Error('Folder exceeds 2,000 source files or 20 MB. Open a smaller source folder.');
          files.push({ path: relative, content: source.content }); hashes[relative] = source.hash;
        }
      }
    }
    await walk(folder.path);
    return { id, path: folder.path, name: path.basename(folder.path), files: files.sort((a, b) => a.path.localeCompare(b.path)), hashes, skipped };
  }
  async function connect(directory) {
    if (typeof directory !== 'string' || !path.isAbsolute(directory)) throw new Error('Enter the full absolute folder path.');
    const canonical = await realpath(directory);
    if (!(await lstat(canonical)).isDirectory()) throw new Error('Choose a directory.');
    let folder = [...folders.values()].find((item) => item.path === canonical);
    if (!folder) { folder = { id: randomUUID(), path: canonical, busy: false }; folders.set(folder.id, folder); }
    return scan(folder.id);
  }
  async function save(id, changes) {
    const folder = await get(id);
    if (folder.busy) throw new Error('Another save is in progress. Retry.');
    if (!Array.isArray(changes) || changes.length > MAX_FILES) throw new Error('Invalid file changes.');
    folder.busy = true;
    try {
      let total = 0; const seen = new Set(), prepared = [], conflicts = [];
      for (const change of changes) {
        if (seen.has(change.path)) throw new Error('Duplicate file change.'); seen.add(change.path);
        if (change.content !== null && typeof change.content !== 'string') throw new Error('Invalid source content.');
        total += Buffer.byteLength(change.content || '');
        if (Buffer.byteLength(change.content || '') > MAX_IMPORT_FILE_BYTES || total > MAX_PROJECT_BYTES) throw new Error('Save exceeds source size limits.');
        let filename;
        try { filename = await target(folder, change.path); }
        catch (error) { if (error.code !== 'ENOENT') throw error; filename = null; }
        const old = filename ? await diskFile(filename) : null;
        if ((old?.hash ?? null) !== change.expectedHash) conflicts.push(change.path);
        prepared.push({ ...change, old });
      }
      if (conflicts.length) return { conflicts, saved: [] };
      const saved = [];
      for (const change of prepared) {
        const filename = await target(folder, change.path, true);
        const latest = await diskFile(filename);
        if ((latest?.hash ?? null) !== change.expectedHash) return { conflicts: [change.path], saved };
        if (change.content === null) { if (latest) await unlink(filename); }
        else {
          const temporary = path.join(path.dirname(filename), `.llm-save-${randomUUID()}`);
          let handle;
          try {
            handle = await open(temporary, 'wx', change.old?.mode ?? 0o644);
            await handle.writeFile(change.content); await handle.sync(); await handle.close(); handle = null;
            await target(folder, change.path);
            const beforeReplace = await diskFile(filename);
            if ((beforeReplace?.hash ?? null) !== change.expectedHash) return { conflicts: [change.path], saved };
            await rename(temporary, filename);
          } finally { await handle?.close(); await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; }); }
        }
        saved.push(change.path);
      }
      return { saved, conflicts: [] };
    } finally { folder.busy = false; }
  }
  return { connect, scan, save, get };
}
