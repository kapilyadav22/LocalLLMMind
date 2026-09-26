import { useCallback, useEffect, useRef, useState } from 'react';
import { localAction } from '../services/localControlService';
import { folderChanges, reconcileFolder } from '../utils/folderSync';

export function useConnectedFolder(project, setProjects, locked) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const latest = useRef(project), isLocked = useRef(locked), working = useRef(false), connections = useRef(new Map());
  latest.current = project; isLocked.current = locked;
  const connect = useCallback(async (current) => {
    const known = connections.current.get(current.id);
    if (known?.path === current.connectedPath) return known.id;
    const snapshot = await localAction('folders/connect', { path: current.connectedPath });
    connections.current.set(current.id, { id: snapshot.id, path: snapshot.path });
    return snapshot.id;
  }, []);
  const refresh = useCallback(async (current) => {
    let snapshot;
    try { snapshot = await localAction('folders/scan', { id: await connect(current) }); }
    catch (e) {
      if (!e.message.includes('connection expired')) throw e;
      connections.current.delete(current.id);
      snapshot = await localAction('folders/scan', { id: await connect(current) });
    }
    setProjects((items) => items.map((item) => {
      if (item.id !== current.id || item.connectedPath !== current.connectedPath) return item;
      if (JSON.stringify(item.diskHashes) === JSON.stringify(snapshot.hashes)) return item;
      return reconcileFolder(item, snapshot);
    }));
    return snapshot;
  }, [connect, setProjects]);
  useEffect(() => {
    if (!project?.connectedPath) return;
    let alive = true, timer;
    async function poll() {
      if (!alive) return;
      if (!isLocked.current && !working.current) {
        try { await refresh(latest.current); if (alive) setError(''); }
        catch (e) { if (alive) setError(e.message); }
      }
      if (alive) timer = setTimeout(poll, 3000);
    }
    poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [project?.id, project?.connectedPath, refresh]);
  const save = useCallback(async () => {
    const current = latest.current;
    if (!current?.connectedPath) throw new Error('Open a connected folder first.');
    if (working.current) throw new Error('A folder operation is already in progress.');
    if (current.diskConflicts?.length) throw new Error('Resolve file conflicts before saving.');
    working.current = true; setBusy(true); setError('');
    try {
      const id = await connect(current);
      const result = await localAction('folders/save', { id, changes: folderChanges(current) });
      await refresh(current);
      if (result.conflicts.length) throw new Error(`Disk changed before saving: ${result.conflicts.join(', ')}. Review the conflicts and retry.`);
      return id;
    } catch (e) { setError(e.message); throw e; }
    finally { working.current = false; setBusy(false); }
  }, [connect, refresh]);
  return { busy, error, save, refresh: () => project?.connectedPath && refresh(project) };
}
