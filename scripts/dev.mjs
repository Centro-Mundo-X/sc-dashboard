/**
 * Runs the API and the dashboard together for local development.
 *
 * Loads `.env.development`, starts both processes and streams their output with
 * a prefix per service. Ctrl+C stops both.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILE = '.env.development';
const WEB_PORT = process.env.WEB_PORT ?? '5173';

/** Minimal dotenv: KEY=value per line, `#` comments, no inline quotes. */
function loadEnv(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

const env = { ...process.env, ...loadEnv(ENV_FILE) };

const children = [];

function run(name, command, args, extraEnv) {
  const child = spawn(command, args, {
    env: { ...env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const prefix = name === 'api' ? '\x1b[36mapi\x1b[0m' : '\x1b[35mweb\x1b[0m';
  const forward = (stream, target) => {
    stream.setEncoding('utf8');
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) target.write(`${prefix} ${line}\n`);
      }
    });
  };

  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`${prefix} exited with code ${code}\n`);
    }
  });

  children.push(child);
  return child;
}

function shutdown() {
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
    process.exit(0);
  }, 2000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

run('api', 'node', ['--experimental-strip-types', '--watch', 'apps/api/src/main.ts'], {});

run('web', 'pnpm', ['--filter', '@sc/web', 'exec', 'vite', 'dev', '--port', WEB_PORT], {
  API_BASE_URL: env.API_BASE_URL ?? `http://127.0.0.1:${env.PORT ?? 3000}`,
  API_FORWARDED_PROTO: env.API_FORWARDED_PROTO ?? 'http',
  // The dashboard reads SQLite directly. pnpm --filter runs it from apps/web,
  // so the path has to be absolute or it resolves against the wrong directory.
  DATABASE_PATH: resolve(env.DATABASE_PATH ?? './data/data.sqlite'),
});

console.log('');
console.log(`  dashboard  http://localhost:${WEB_PORT}`);
console.log(`  api        http://127.0.0.1:${env.PORT ?? 3000}`);
console.log('');
