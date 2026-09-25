export function restoreFile(files, baseFile) {
  return [...files.filter((file) => file.path !== baseFile.path), { ...baseFile }].sort((a, b) => a.path.localeCompare(b.path));
}
export function commitStagedFiles(files, baseFiles, stagedPaths) {
  const result = new Map(baseFiles.map((file) => [file.path, file]));
  const current = new Map(files.map((file) => [file.path, file]));
  for (const path of stagedPaths) {
    if (current.has(path)) result.set(path, { ...current.get(path) });
    else result.delete(path);
  }
  return [...result.values()].sort((a, b) => a.path.localeCompare(b.path));
}
