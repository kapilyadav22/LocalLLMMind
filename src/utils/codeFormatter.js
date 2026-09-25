/**
 * Universal, language-independent code formatter and beautifier.
 * Supports JSON, HTML/XML, Python/YAML, C-family/Brace languages, and generic indentation cleanup.
 */

export function formatCode(content, filePathOrLang = '', tabSize = 2) {
  if (!content || typeof content !== 'string') return content;
  const indent = ' '.repeat(tabSize);

  // Derive file extension or language hint
  const ext = (filePathOrLang.includes('.') ? filePathOrLang.split('.').pop() : filePathOrLang).toLowerCase().trim();

  // 1. JSON formatting
  const isJson = ext === 'json' || content.trim().startsWith('{') || content.trim().startsWith('[');
  if (isJson) {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, tabSize) + '\n';
    } catch {
      // If not strict JSON, continue to generic beautifier
    }
  }

  // 2. HTML / XML / SVG tag-based indentation
  const isMarkup = ['html', 'htm', 'xml', 'svg'].includes(ext) || /^\s*<(!DOCTYPE|html|\?xml|[a-zA-Z0-9]+)/i.test(content);
  if (isMarkup) {
    return formatMarkup(content, indent);
  }

  // 3. Python / YAML (colon & indentation-sensitive languages)
  const isIndentSensitive = ['py', 'python', 'yaml', 'yml'].includes(ext);
  if (isIndentSensitive) {
    return formatIndentSensitive(content, indent);
  }

  // 4. Universal Brace-based languages (JS, TS, C, C++, C#, Java, Go, Rust, PHP, CSS, SCSS, Swift, Kotlin, Dart, etc.)
  return formatBraceLanguage(content, indent);
}

/**
 * Universal brace-based auto-indenter
 */
function formatBraceLanguage(content, indent) {
  const lines = content.split(/\r?\n/);
  let depth = 0;
  const formatted = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      formatted.push('');
      continue;
    }

    // Single-line comment: keep depth as is
    if (line.startsWith('//') || line.startsWith('#') || line.startsWith('/*')) {
      formatted.push(indent.repeat(depth) + line);
      continue;
    }

    // Count closing braces at start of line to indent correctly
    let leadingCloses = 0;
    for (const ch of line) {
      if (ch === '}' || ch === ')' || ch === ']') leadingCloses++;
      else if (!/\s/.test(ch)) break;
    }

    const effectiveDepth = Math.max(0, depth - leadingCloses);
    formatted.push(indent.repeat(effectiveDepth) + line);

    // Calculate depth change for subsequent lines
    let opens = 0;
    let closes = 0;
    let inString = false;
    let stringChar = '';

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      const prev = line[j - 1];

      // Handle strings
      if ((ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = ch;
        } else if (stringChar === ch) {
          inString = false;
        }
      }

      // Check for inline single-line comment
      if (!inString && ch === '/' && line[j + 1] === '/') {
        break; // ignore rest of the line
      }

      if (!inString) {
        if (ch === '{' || ch === '(' || ch === '[') opens++;
        else if (ch === '}' || ch === ')' || ch === ']') closes++;
      }
    }

    depth = Math.max(0, depth + (opens - closes));
  }

  // Clean trailing spaces and collapse excess blank lines
  return cleanVerticalRhythm(formatted.join('\n'));
}

/**
 * Indentation-sensitive formatter (Python, YAML)
 */
function formatIndentSensitive(content, indent) {
  const lines = content.split(/\r?\n/);
  let currentDepth = 0;
  const formatted = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      formatted.push('');
      continue;
    }

    // Dedent keywords in Python
    if (/^(return|pass|break|continue|raise|elif|else:|except|finally:)/.test(trimmed)) {
      if (trimmed.startsWith('elif') || trimmed.startsWith('else:') || trimmed.startsWith('except') || trimmed.startsWith('finally:')) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    formatted.push(indent.repeat(currentDepth) + trimmed);

    // If line ends with colon (:), next block should be indented
    if (trimmed.endsWith(':') && !trimmed.startsWith('#')) {
      currentDepth++;
    } else if (/^(return|pass|break|continue|raise)/.test(trimmed)) {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  return cleanVerticalRhythm(formatted.join('\n'));
}

/**
 * HTML / XML markup formatter
 */
function formatMarkup(content, indent) {
  const tokens = content.replace(/>\s*</g, '><').split(/(?=<)|(?<=>)/g).filter(Boolean);
  let depth = 0;
  const formatted = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

  for (let token of tokens) {
    token = token.trim();
    if (!token) continue;

    const isClosing = token.startsWith('</');
    const isSelfClosing = token.endsWith('/>') || token.startsWith('<!--') || token.startsWith('<!');
    const tagMatch = token.match(/^<([a-zA-Z0-9:-]+)/);
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
    const isVoid = voidTags.has(tagName);

    if (isClosing) {
      depth = Math.max(0, depth - 1);
    }

    formatted.push(indent.repeat(depth) + token);

    if (!isClosing && !isSelfClosing && !isVoid && token.startsWith('<')) {
      depth++;
    }
  }

  return cleanVerticalRhythm(formatted.join('\n'));
}

/**
 * Universal whitespace normalization
 */
function cleanVerticalRhythm(code) {
  return (
    code
      .replace(/[ \t]+$/gm, '') // strip trailing spaces on lines
      .replace(/\n{3,}/g, '\n\n') // collapse multiple blank lines to max 2
      .trimEnd() + '\n'
  );
}
