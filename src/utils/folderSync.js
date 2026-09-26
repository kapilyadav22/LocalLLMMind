const mapFiles = (files = []) => new Map(files.map((file) => [file.path, file.content]));
export function folderChanges(project) {
  const base = mapFiles(project.diskFiles), current = mapFiles(project.files);
  return [...new Set([...base.keys(), ...current.keys()])].filter((path) => base.get(path) !== current.get(path)).map((path) => ({ path, content: current.get(path) ?? null, expectedHash: project.diskHashes?.[path] ?? null }));
}
export function reconcileFolder(project, snapshot) {
  const base = mapFiles(project.diskFiles), local = mapFiles(project.files), remote = mapFiles(snapshot.files);
  const conflicts = [], files = [];
  for (const path of new Set([...base.keys(), ...local.keys(), ...remote.keys()])) {
    const b = base.get(path), l = local.get(path), r = remote.get(path);
    let content = l;
    if (l === r || l === b) content = r;
    else if (r !== b || project.diskConflicts?.includes(path)) conflicts.push(path);
    if (content !== undefined) files.push({ path, content });
  }
  return { ...project, files: files.sort((a, b) => a.path.localeCompare(b.path)), diskFiles: snapshot.files, diskHashes: snapshot.hashes, diskConflicts: conflicts };
}
export function resolveFolderConflict(project, path, choice) {
  const files = project.files.filter((file) => file.path !== path);
  const chosen = (choice === 'disk' ? project.diskFiles : project.files).find((file) => file.path === path);
  if (chosen) files.push(chosen);
  return { ...project, files: files.sort((a, b) => a.path.localeCompare(b.path)), diskConflicts: project.diskConflicts.filter((item) => item !== path) };
}
