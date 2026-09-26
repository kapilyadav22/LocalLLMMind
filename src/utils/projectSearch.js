export function searchProject(files, query, { caseSensitive = false, wholeWord = false, pathFilter = '', limit = 500 } = {}) {
  if (!query) return { matches: [], truncated: false };
  const needle = caseSensitive ? query : query.toLocaleLowerCase();
  const matches = [];
  const word = (character) => character !== undefined && /[\p{L}\p{N}_]/u.test(character);
  for (const file of files) {
    if (pathFilter && !file.path.toLowerCase().includes(pathFilter.toLowerCase())) continue;
    const lines = file.content.split('\n');
    for (let index = 0; index < lines.length; index++) {
      const text = lines[index], haystack = caseSensitive ? text : text.toLocaleLowerCase();
      let from = 0, column;
      while ((column = haystack.indexOf(needle, from)) !== -1) {
        from = column + Math.max(needle.length, 1);
        if (wholeWord && (word(text[column - 1]) || word(text[column + query.length]))) continue;
        if (matches.length >= limit) return { matches, truncated: true };
        matches.push({ path: file.path, line: index + 1, column: column + 1, preview: text.slice(Math.max(0, column - 45), column + query.length + 100) });
      }
    }
  }
  return { matches, truncated: false };
}
