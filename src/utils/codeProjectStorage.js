let database;
function openDatabase() {
  database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('localllmmind-code', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspace');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = null; reject(request.error); };
  });
  return database;
}
export async function loadCodeWorkspace() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('workspace').objectStore('workspace').get('projects');
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
export async function saveCodeWorkspace(projects) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workspace', 'readwrite');
    tx.objectStore('workspace').put(projects, 'projects');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted.'));
  });
}
export function newCodeProject(name = 'Untitled project', files = []) {
  return { id: crypto.randomUUID(), name, files, baseFiles: files.map((file) => ({ ...file })), commits: [], comments: [], updatedAt: Date.now(), summary: '', previous: null };
}
