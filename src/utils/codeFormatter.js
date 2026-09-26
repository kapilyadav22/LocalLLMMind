import { localAction } from '../services/localControlService.js';
const parsers = { js: 'babel', mjs: 'babel', cjs: 'babel', jsx: 'babel', ts: 'typescript', tsx: 'typescript', json: 'json', css: 'css', scss: 'scss', less: 'less', html: 'html', htm: 'html', vue: 'vue', md: 'markdown', mdx: 'mdx', yaml: 'yaml', yml: 'yaml' };
export async function formatCode(content, filePath = '', tabSize = 2) {
  const extension = filePath.split('.').pop().toLowerCase();
  if (['py', 'pyi'].includes(extension)) return (await localAction('projects/format', { content, filePath })).content;
  const parser = parsers[extension];
  if (!parser) throw new Error(`No formatter is installed for .${extension}. Use your IDE's language formatter; the source has been left unchanged.`);
  const prettier = await import('prettier/standalone');
  const plugins = await Promise.all([import('prettier/plugins/babel'), import('prettier/plugins/estree'), import('prettier/plugins/typescript'), import('prettier/plugins/postcss'), import('prettier/plugins/html'), import('prettier/plugins/markdown'), import('prettier/plugins/yaml')]);
  return prettier.format(content, { parser, plugins: plugins.map((plugin) => plugin.default || plugin), tabWidth: tabSize, singleQuote: true });
}
