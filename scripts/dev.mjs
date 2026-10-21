/**
 * `npm run dev`: starts the API server (port 8787, restarts on change) and the
 * Vite dev server (port 5173, proxies /api to 8787) together, and stops both
 * when either exits or you press Ctrl+C.
 */
import { spawn } from 'node:child_process';

/** @type {[name: string, args: string[]][]} */
const COMMANDS = [
  ['api', ['--watch', '--env-file-if-exists=.env', 'server/index.js']],
  ['web', ['node_modules/vite/bin/vite.js']],
];

const processes = COMMANDS.map(([name, args]) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
  child.on('exit', (code) => {
    console.log(`[dev] ${name} stopped${code ? ` with code ${code}` : ''}. Shutting down.`);
    shutdown(code ?? 0);
  });
  return child;
});

let stopping = false;
/** Stops every child process, then exits with `code`. @param {number} code */
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) if (child.exitCode === null) child.kill();
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
