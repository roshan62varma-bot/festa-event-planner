/**
 * `npm run dev`: starts the API server (port 8787, restarts on change) and the
 * Vite dev server (port 5173, proxies /api to 8787) together, and stops both
 * when either exits or you press Ctrl+C.
 */
import { spawn } from 'node:child_process';

const processes = [
  ['api', process.execPath, ['--watch', '--env-file-if-exists=.env', 'server/index.js']],
  ['web', process.execPath, ['node_modules/vite/bin/vite.js']],
].map(([name, command, args]) => {
  const child = spawn(command, args, { stdio: 'inherit', env: process.env });
  child.on('exit', (code) => {
    console.log(`[dev] ${name} stopped${code ? ` with code ${code}` : ''}. Shutting down.`);
    shutdown(code ?? 0);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) if (child.exitCode === null) child.kill();
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
