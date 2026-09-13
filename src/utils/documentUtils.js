/**
 * Document & Code File Utilities for LocalMind
 * Engineered by Kapil Kumar Yadav
 * 
 * Provides client-side text and code extraction, syntax detection,
 * token estimation, and prompt context formatting.
 */

import { v4 as uuidv4 } from 'uuid';

const SUPPORTED_TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'log', 'xml', 'html', 'css',
  'js', 'jsx', 'ts', 'tsx', 'py', 'pyw', 'sql', 'sh', 'bash', 'zsh',
  'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'env', 'rs', 'go', 'java',
  'kt', 'swift', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'cs', 'php', 'rb',
  'dart', 'lua', 'r', 'scala', 'graphql', 'gql', 'dockerfile', 'makefile',
]);

const EXTENSION_LANGUAGE_MAP = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  json: 'json',
  csv: 'csv',
  sql: 'sql',
  html: 'html',
  css: 'css',
  sh: 'bash',
  bash: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
  md: 'markdown',
  markdown: 'markdown',
  xml: 'xml',
  toml: 'toml',
};

/**
 * Format bytes to readable size (KB / MB)
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract lowercase extension from filename
 */
export function getFileExtension(filename = '') {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop().toLowerCase();
}

/**
 * Check if a file is a supported text/code document
 */
export function isDocumentFile(file) {
  if (!file) return false;
  if (file.type && (file.type.startsWith('text/') || file.type === 'application/json')) {
    return true;
  }
  const ext = getFileExtension(file.name);
  return SUPPORTED_TEXT_EXTENSIONS.has(ext);
}

/**
 * Get language identifier for markdown fenced code blocks
 */
export function getLanguageForFile(filename = '') {
  const ext = getFileExtension(filename);
  return EXTENSION_LANGUAGE_MAP[ext] || ext || 'text';
}

/**
 * Read text/code document with 500KB safety guard
 */
export async function readDocumentFile(file) {
  const MAX_SIZE = 500 * 1024; // 500 KB limit to protect local LLM context

  if (file.size > MAX_SIZE) {
    throw new Error(`"${file.name}" exceeds 500 KB limit (${formatFileSize(file.size)}). Please attach a smaller file.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result || '';
      resolve({
        id: uuidv4(),
        name: file.name,
        size: file.size,
        formattedSize: formatFileSize(file.size),
        extension: getFileExtension(file.name),
        language: getLanguageForFile(file.name),
        content: String(content),
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}"`));
    reader.readAsText(file);
  });
}

/**
 * Formats attached documents as contextual markdown for Ollama prompt injection
 */
export function formatDocumentsForPrompt(documents = []) {
  if (!documents.length) return '';

  return documents
    .map((doc) => {
      const lang = doc.language || 'text';
      return `\n\n--- [Attached Document: ${doc.name} (${doc.formattedSize})] ---\n\`\`\`${lang}\n${doc.content}\n\`\`\`\n`;
    })
    .join('\n');
}

/**
 * Fast token count estimator (heuristic ~3.8 characters per token for English & code)
 */
export function estimateTokens(text = '') {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

/**
 * Estimate total tokens used in a conversation
 */
export function estimateConversationTokens(messages = [], systemPrompt = '') {
  let totalChars = systemPrompt ? systemPrompt.length : 0;
  for (const m of messages) {
    if (m.content) totalChars += m.content.length;
    // Account for image base64 metadata overhead
    if (m.images && Array.isArray(m.images)) {
      totalChars += m.images.length * 1200; // rough visual token equivalence
    }
  }
  return Math.ceil(totalChars / 3.8);
}
