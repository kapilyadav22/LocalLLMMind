import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const windows = process.platform === 'win32';
for (const [command, args] of [
  [windows ? 'python' : 'python3', ['-m', 'venv', '.formatter-venv']],
  [path.join(root, '.formatter-venv', windows ? 'Scripts/python.exe' : 'bin/python'), ['-m', 'pip', 'install', 'black==26.5.1']],
]) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) { console.error(result.error?.message || 'Formatter setup failed. Python 3.10+ and network access are required.'); process.exit(1); }
}
