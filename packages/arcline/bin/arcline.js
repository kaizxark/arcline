#!/usr/bin/env node

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Transform } from 'node:stream';

const [major] = process.versions.node.split('.').map(Number);
if (major < 24) {
  console.error('\x1b[31merror:\x1b[0m ARCline requires Node.js >= 24.9.0 (current version: ' + process.version + ')');
  console.error('Please upgrade Node.js or run with nvm/fnm (e.g. `nvm use 24`).');
  process.exit(1);
}

const require = createRequire(import.meta.url);
let dshBin;

try {
  dshBin = require.resolve('@deepseek-ai/dsh/lib/bin.js');
} catch {
  try {
    dshBin = resolve(dirname(fileURLToPath(import.meta.url)), '../node_modules/@deepseek-ai/dsh/lib/bin.js');
  } catch {
    // fallback
  }
}

if (!dshBin) {
  console.error('\x1b[31merror:\x1b[0m Could not locate ARCline runtime (@deepseek-ai/dsh).');
  process.exit(1);
}

// Brand patch installed packages so the browser UI and logs show ARCline
function brandInstalledPackages(rootDir) {
  try {
    const sentinel = join(rootDir, '.arcline-branded');
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
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.html') || entry.name.endsWith('.webmanifest'))) {
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
            if (changed) {
              writeFileSync(full, content, 'utf8');
            }
          } catch {
            // ignore unwriteable files
          }
        }
      }
    }

    walk(rootDir);
    try { writeFileSync(sentinel, '1', 'utf8'); } catch {}
  } catch {
    // best-effort
  }
}

try {
  let searchDir = dirname(dshBin);
  while (searchDir && searchDir !== dirname(searchDir)) {
    if (searchDir.endsWith('@deepseek-ai') || searchDir.includes('@deepseek-ai')) {
      brandInstalledPackages(searchDir);
      break;
    }
    const candidate = join(searchDir, '@deepseek-ai');
    if (existsSync(candidate)) {
      brandInstalledPackages(candidate);
      break;
    }
    searchDir = dirname(searchDir);
  }
} catch {}

function createBrandTransform() {
  return new Transform({
    transform(chunk, _encoding, callback) {
      let str = chunk.toString();
      str = str.replaceAll('dsh web:', 'arcline web:')
               .replaceAll('dsh:', 'arcline:')
               .replaceAll('DeepSeek Harness', 'ARCline');
      callback(null, Buffer.from(str));
    }
  });
}

const child = spawn(process.execPath, [dshBin, ...process.argv.slice(2)], {
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
