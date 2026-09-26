// Some node-pty tarballs omit the executable bit on the Unix spawn helper.
import { chmod, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
const require = createRequire(import.meta.url);
if (process.platform !== 'win32') {
  const root = path.dirname(require.resolve('node-pty/package.json'));
  for (const dir of ['build/Release', 'build/Debug', `prebuilds/${process.platform}-${process.arch}`]) {
    const helper = path.join(root, dir, 'spawn-helper');
    try { const info = await stat(helper); if (!(info.mode & 0o100)) await chmod(helper, info.mode | 0o100); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
