export const MAX_PROJECT_BYTES = 20 * 1024 * 1024;
export const MAX_FILES = 2000;

export function validateFilePath(path) {
  if (typeof path !== 'string' || !path || path.length > 240 || path !== path.trim()) {
    throw new Error('Use a relative file path of 1–240 characters.');
  }
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' ||
    /[\\<>:"|?*]/.test(part) || [...part].some((character) => character.charCodeAt(0) < 32) || /[. ]$/.test(part) ||
    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part) ||
    ['.git', '.vscode', '.idea', 'node_modules', '.localllmmind.json'].includes(part.toLowerCase()))) {
    throw new Error(`Unsafe or reserved file path: ${path}`);
  }
  return path;
}

export function validateFiles(files, { maxFiles = MAX_FILES, maxBytes = MAX_PROJECT_BYTES } = {}) {
  if (!Array.isArray(files) || files.length < 1 || files.length > maxFiles) {
    throw new Error(`A project must contain 1–${maxFiles} text files.`);
  }
  const seen = new Set();
  let bytes = 0;
  for (const file of files) {
    validateFilePath(file?.path);
    if (typeof file.content !== 'string' || file.content.includes('\0')) throw new Error('Only text files are supported.');
    const key = file.path.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate file: ${file.path}`);
    seen.add(key);
    bytes += new TextEncoder().encode(file.content).length;
  }
  for (const key of seen) {
    const parts = key.split('/');
    while (parts.length > 1) {
      parts.pop();
      if (seen.has(parts.join('/'))) throw new Error('A file cannot also be a directory.');
    }
  }
  if (bytes > maxBytes) throw new Error(`Projects are limited to ${maxBytes / 1024 / 1024} MB of text.`);
  return files.map(({ path, content }) => ({ path, content }));
}

export function mergeFiles(current, updates) {
  const files = new Map(current.map((file) => [file.path, file]));
  for (const file of validateFiles(updates)) files.set(file.path, file);
  return validateFiles([...files.values()].sort((a, b) => a.path.localeCompare(b.path)));
}

export function parseProposal(text) {
  let data;
  let jsonString = (text || '').trim();
  const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  }
  try {
    data = JSON.parse(jsonString);
  } catch {
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        data = JSON.parse(jsonString.slice(firstBrace, lastBrace + 1));
      } catch {
        throw new Error('The model returned incomplete or invalid JSON. Try again with a smaller request or a coding model. Your files are unchanged.');
      }
    } else {
      throw new Error('The model returned incomplete or invalid JSON. Try again with a smaller request or a coding model. Your files are unchanged.');
    }
  }
  return { summary: typeof data?.summary === 'string' ? data.summary.slice(0, 4000) : 'Proposed project files', files: validateFiles(data?.files, { maxFiles: 80, maxBytes: 2 * 1024 * 1024 }) };
}
