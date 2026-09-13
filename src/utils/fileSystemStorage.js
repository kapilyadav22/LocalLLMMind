/**
 * File System Storage Utility for LocalLLMMind
 * Enables persistent saving and syncing of chats and projects to a user-selected local directory.
 * Powered by the HTML5 File System Access API with IndexedDB directory handle caching.
 * Designed & Engineered by Kapil Kumar Yadav
 */

const DB_NAME = 'llm_studio_fs_db';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const HANDLE_KEY = 'memory_directory_handle';

/**
 * Check if the browser supports the native File System Access API
 */
export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

/**
 * Internal IndexedDB helper to store and retrieve structured cloneable handles
 */
function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists a FileSystemDirectoryHandle into IndexedDB
 */
export async function storeDirectoryHandle(handle) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, HANDLE_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to store directory handle in IndexedDB:', err);
    return false;
  }
}

/**
 * Retrieves the stored FileSystemDirectoryHandle from IndexedDB
 */
export async function getStoredDirectoryHandle() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Removes the stored FileSystemDirectoryHandle from IndexedDB
 */
export async function clearStoredDirectoryHandle() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(HANDLE_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return false;
  }
}

/**
 * Verifies or requests readwrite permissions for a directory handle
 */
export async function verifyPermission(fileHandle, readWrite = true) {
  if (!fileHandle) return false;
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  try {
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true;
    }
  } catch (err) {
    console.warn('Error verifying directory permission:', err);
  }
  return false;
}

/**
 * Prompts user to pick a directory from their local file system
 */
export async function pickMemoryDirectory() {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser.');
  }

  const handle = await window.showDirectoryPicker({
    mode: 'readwrite',
    startIn: 'documents',
  });

  const hasPermission = await verifyPermission(handle, true);
  if (!hasPermission) {
    throw new Error('Write permission was not granted for the selected folder.');
  }

  await storeDirectoryHandle(handle);
  return handle;
}

/**
 * Synchronizes all conversations, projects, and markdown summaries to the directory
 */
export async function syncToDirectory(dirHandle, { conversations = [], projects = [], settings = {}, saveMarkdown = true }) {
  if (!dirHandle) throw new Error('No directory selected');

  const hasPermission = await verifyPermission(dirHandle, true);
  if (!hasPermission) {
    throw new Error('Permission denied. Please re-authorize folder access.');
  }

  // 1. Write conversations.json
  const convoFile = await dirHandle.getFileHandle('conversations.json', { create: true });
  const convoWritable = await convoFile.createWritable();
  await convoWritable.write(JSON.stringify(conversations, null, 2));
  await convoWritable.close();

  // 2. Write projects.json
  const projFile = await dirHandle.getFileHandle('projects.json', { create: true });
  const projWritable = await projFile.createWritable();
  await projWritable.write(JSON.stringify(projects, null, 2));
  await projWritable.close();

  // 3. Write memory_manifest.json
  const manifest = {
    application: 'LocalLLMMind',
    developer: 'Kapil Kumar Yadav',
    version: '1.3.0',
    lastSyncedAt: new Date().toISOString(),
    totalConversations: conversations.length,
    totalProjects: projects.length,
    directoryName: dirHandle.name,
    settingsSummary: {
      selectedModel: settings.selectedModel || 'none',
      ollamaUrl: settings.ollamaUrl,
    },
  };
  const manifestFile = await dirHandle.getFileHandle('memory_manifest.json', { create: true });
  const manifestWritable = await manifestFile.createWritable();
  await manifestWritable.write(JSON.stringify(manifest, null, 2));
  await manifestWritable.close();

  // 4. Optionally write individual readable markdown files into /chats
  let mdFilesWritten = 0;
  if (saveMarkdown && conversations.length > 0) {
    try {
      const chatsDir = await dirHandle.getDirectoryHandle('chats', { create: true });
      for (const convo of conversations) {
        const safeTitle = (convo.title || 'chat')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .substring(0, 32);
        const fileName = `${safeTitle}_${convo.id.substring(0, 8)}.md`;

        let md = `# ${convo.title || 'Chat'}\n\n`;
        md += `*Exported from LocalLLMMind · Model: ${convo.model || 'Unknown'} · Last Updated: ${convo.updatedAt || convo.createdAt}*\n\n---\n\n`;

        (convo.messages || []).forEach((m) => {
          const role = m.role === 'user' ? '👤 **User**' : '🤖 **Assistant**';
          md += `### ${role}\n\n${m.content}\n\n`;
          if (m.images && m.images.length > 0) {
            md += `*Attached ${m.images.length} image(s)*\n\n`;
          }
          if (m.metrics) {
            md += `*⚡ ${m.metrics.tokPerSec} tok/s · ${m.metrics.evalCount} tokens (${m.metrics.duration}s)*\n\n`;
          }
          md += `---\n\n`;
        });

        const chatFile = await chatsDir.getFileHandle(fileName, { create: true });
        const chatWritable = await chatFile.createWritable();
        await chatWritable.write(md);
        await chatWritable.close();
        mdFilesWritten++;
      }
    } catch (e) {
      console.warn('Could not write markdown chats subfolder:', e);
    }
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    directoryName: dirHandle.name,
    conversationsCount: conversations.length,
    projectsCount: projects.length,
    markdownFilesCount: mdFilesWritten,
  };
}

/**
 * Reads conversations and projects from the directory
 */
export async function readFromDirectory(dirHandle) {
  if (!dirHandle) throw new Error('No directory selected');

  const hasPermission = await verifyPermission(dirHandle, false);
  if (!hasPermission) {
    throw new Error('Permission denied. Please authorize folder read access.');
  }

  let conversations = [];
  let projects = [];

  // Read conversations.json
  try {
    const convoFile = await dirHandle.getFileHandle('conversations.json');
    const file = await convoFile.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      conversations = parsed;
    }
  } catch {
    // conversations.json might not exist yet in a fresh directory
  }

  // Read projects.json
  try {
    const projFile = await dirHandle.getFileHandle('projects.json');
    const pFile = await projFile.getFile();
    const pText = await pFile.text();
    const parsedProjects = JSON.parse(pText);
    if (Array.isArray(parsedProjects)) {
      projects = parsedProjects;
    }
  } catch {
    // projects.json might not exist yet
  }

  return {
    success: true,
    directoryName: dirHandle.name,
    conversations,
    projects,
  };
}
