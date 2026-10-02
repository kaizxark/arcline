export * from './types.js';
export * from './registry.js';
export * from './permissions.js';
export * from './filesystem.js';
export * from './shell.js';
export * from './git.js';

import { toolRegistry } from './registry.js';

export function getAllTools() {
  return toolRegistry.getDefinitions();
}

export function getTool(name: string) {
  return toolRegistry.get(name);
}

export { toolRegistry };