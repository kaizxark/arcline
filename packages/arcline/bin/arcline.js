#!/usr/bin/env node

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Check Node.js version
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

const child = spawn(process.execPath, [dshBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DSH_BRAND: 'ARCline',
  },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
