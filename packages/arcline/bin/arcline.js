#!/usr/bin/env node

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { existsSync, readdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { Transform } from 'node:stream';

// Verify Node.js version requirement
const [major] = process.versions.node.split('.').map(Number);
if (major < 24) {
  console.error('\x1b[31merror:\x1b[0m ARCline requires Node.js >= 24.9.0 (current version: ' + process.version + ')');
  console.error('Please upgrade Node.js or run with nvm/fnm (e.g. `nvm use 24`).');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRootDir = resolve(currentDir, '..');
const bundledDist = join(packageRootDir, 'dist');
const overlayPath = join(packageRootDir, 'arcline.overlay.yml');

let dshBin;
const possibleBinPaths = [
  () => require.resolve('@deepseek-ai/dsh/lib/bin.js'),
  () => resolve(packageRootDir, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
  () => resolve(packageRootDir, '../../node_modules/@deepseek-ai/dsh/lib/bin.js'),
  () => resolve(packageRootDir, '../../apps/cli/lib/bin.js'),
];

for (const candidate of possibleBinPaths) {
  try {
    const p = candidate();
    if (existsSync(p)) {
      dshBin = p;
      break;
    }
  } catch {}
}

if (!dshBin) {
  console.error('\x1b[31merror:\x1b[0m Could not locate ARCline runtime (@deepseek-ai/dsh).');
  process.exit(1);
}

// 1. Sync bundled ARCline web assets to @deepseek-ai/dsh-web-frontend if present
try {
  let webFrontendDir;
  try {
    webFrontendDir = dirname(require.resolve('@deepseek-ai/dsh-web-frontend/package.json'));
  } catch {
    const candidates = [
      resolve(packageRootDir, 'node_modules/@deepseek-ai/dsh-web-frontend'),
      resolve(packageRootDir, '../../node_modules/@deepseek-ai/dsh-web-frontend'),
      resolve(packageRootDir, '../host/frontend-static/node_modules/@deepseek-ai/dsh-web-frontend'),
    ];
    for (const c of candidates) {
      if (existsSync(c)) {
        webFrontendDir = c;
        break;
      }
    }
  }
  if (webFrontendDir && existsSync(bundledDist)) {
    const targetDist = join(webFrontendDir, 'dist');
    cpSync(bundledDist, targetDist, { recursive: true, force: true });
  }
} catch {
  // best-effort
}

// 2. Brand patch installed @deepseek-ai packages so the UI, client bundles, and configs show ARCline with no default deepseek models
function brandInstalledScope(scopeDir) {
  try {
    const sentinel = join(scopeDir, '.arcline-branded-v3');
    if (existsSync(sentinel)) return;

    function walk(dir) {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git') {
            walk(full);
          }
        } else if (entry.isFile()) {
          const name = entry.name;
          if (name.endsWith('.js') || name.endsWith('.html') || name.endsWith('.webmanifest')) {
            try {
              let content = readFileSync(full, 'utf8');
              let changed = false;
              if (content.includes('DeepSeek Harness')) {
                content = content.replaceAll('DeepSeek Harness’s', 'ARCline’s')
                                 .replaceAll('DeepSeek Harness’', 'ARCline’s')
                                 .replaceAll('DeepSeek Harness', 'ARCline');
                changed = true;
              }
              if (content.includes('DSH Local Build')) {
                content = content.replaceAll('DSH Local Build', 'ARCline');
                changed = true;
              }
              if (content.includes('dsh web:')) {
                content = content.replaceAll('dsh web:', 'arcline web:');
                changed = true;
              }
              if (content.includes('HARNESS')) {
                content = content.replaceAll('HARNESS', 'ARCLINE');
                changed = true;
              }
              if (changed) {
                writeFileSync(full, content, 'utf8');
              }
            } catch {}
          } else if (name.endsWith('.yml') || name.endsWith('.yaml')) {
            try {
              let content = readFileSync(full, 'utf8');
              let changed = false;
              // Disable automatic deepseek models and services in cordis config
              if (content.includes('id: llm-deepseek-account')) {
                content = content.replace(/(-\s+id:\s+llm-deepseek-account\s*\n)(?!\s+disabled:\s+true)/g, '$1      disabled: true\n');
                changed = true;
              }
              if (content.includes('id: llm-deepseek')) {
                content = content.replace(/(-\s+id:\s+llm-deepseek\s*\n)(?!\s+disabled:\s+true)/g, '$1      disabled: true\n');
                changed = true;
              }
              if (content.includes('id: plugin-package-inventory-deepseek')) {
                content = content.replace(/(-\s+id:\s+plugin-package-inventory-deepseek\s*\n)(?!\s+disabled:\s+true)/g, '$1      disabled: true\n');
                changed = true;
              }
              if (content.includes('id: web-search-deepseek')) {
                content = content.replace(/(-\s+id:\s+web-search-deepseek\s*\n)(?!\s+disabled:\s+true)/g, '$1      disabled: true\n');
                changed = true;
              }
              if (content.includes('id: web-deepseek-api')) {
                content = content.replace(/(-\s+id:\s+web-deepseek-api\s*\n)(?!\s+disabled:\s+true)/g, '$1      disabled: true\n');
                changed = true;
              }
              if (content.includes('id: deepseek-account')) {
                content = content.replace(/(-\s+id:\s+deepseek-account\s*\n)(?!\s+disabled:\s+true)/g, '$1      disabled: true\n');
                changed = true;
              }
              if (content.includes('id: account-controller')) {
                content = content.replace(/(-\s+id:\s+account-controller\s*\n)(?!\s+disabled:\s+true)/g, '$1      disabled: true\n');
                changed = true;
              }
              if (content.includes('provider: deepseek-official')) {
                content = content.replaceAll('provider: deepseek-official', 'provider: custom');
                changed = true;
              }
              if (content.includes('model: deepseek-flash')) {
                content = content.replaceAll('model: deepseek-flash', 'model: custom');
                changed = true;
              }
              if (changed) {
                writeFileSync(full, content, 'utf8');
              }
            } catch {}
          }
        }
      }
    }

    walk(scopeDir);
    try { writeFileSync(sentinel, '1', 'utf8'); } catch {}
  } catch {
    // best-effort
  }
}

try {
  // Find @deepseek-ai scope directories
  const candidateScopes = [
    resolve(dirname(dshBin), '../..'),
    resolve(packageRootDir, '../@deepseek-ai'),
    resolve(packageRootDir, 'node_modules/@deepseek-ai'),
  ];
  for (const s of candidateScopes) {
    if (s.endsWith('@deepseek-ai') && existsSync(s)) {
      brandInstalledScope(s);
    }
  }
} catch {}

// 3. Transform stream to filter and rewrite CLI output
function createBrandTransform() {
  return new Transform({
    transform(chunk, _encoding, callback) {
      let str = chunk.toString();
      // Drop any automatic deepseek api logging lines
      if (str.includes('[llm-deepseek') || str.includes('api.deepseek.com')) {
        str = str.split('\n')
          .filter(line => !line.includes('[llm-deepseek') && !line.includes('api.deepseek.com'))
          .join('\n');
      }
      str = str.replaceAll('dsh web:', 'arcline web:')
               .replaceAll('dsh:', 'arcline:')
               .replaceAll('DeepSeek Harness', 'ARCline');
      callback(null, Buffer.from(str));
    }
  });
}

// 4. Inject --patch overlay if present to guarantee no deepseek models are mounted
const rawArgs = process.argv.slice(2);
const finalArgs = [];
let patchInjected = false;

for (let i = 0; i < rawArgs.length; i++) {
  finalArgs.push(rawArgs[i]);
  if (!patchInjected && ['web', 'headless', 'tui', 'acp', 'sdk'].includes(rawArgs[i])) {
    if (existsSync(overlayPath) && !rawArgs.includes('--patch')) {
      finalArgs.push('--patch', overlayPath);
      patchInjected = true;
    }
  }
}

if (!patchInjected && existsSync(overlayPath) && !rawArgs.includes('--patch') && !rawArgs.includes('--help') && !rawArgs.includes('-h') && !rawArgs.includes('-V') && !rawArgs.includes('--version') && rawArgs.length > 0) {
  finalArgs.unshift('--patch', overlayPath);
}

const child = spawn(process.execPath, [dshBin, ...finalArgs], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: {
    ...process.env,
    DSH_BRAND: 'ARCline',
    DSH_CLIENT_TITLE: 'ARCline',
  },
});

const stdoutTransform = createBrandTransform();
const stderrTransform = createBrandTransform();

child.stdout.pipe(stdoutTransform).pipe(process.stdout);
child.stderr.pipe(stderrTransform).pipe(process.stderr);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
