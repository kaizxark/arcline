import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../src/config/index.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const testConfigDir = join(homedir(), '.config', 'arcline-test');

  beforeEach(() => {
    vi.stubGlobal('process', {
      ...process,
      env: { ...process.env, HOME: homedir() },
    });
    configManager = new ConfigManager();
    configManager.clear();
  });

  afterEach(() => {
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  it('should have default configuration', () => {
    const config = configManager.getConfig();
    expect(config.providers).toEqual({});
    expect(config.preferences).toEqual({
      theme: 'dark',
      debug: false,
      autoSelectModel: false,
    });
  });

  it('should set and get provider', () => {
    const providerConfig = {
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
      model: 'test-model',
    };

    configManager.setProvider('test', providerConfig);
    const provider = configManager.getProvider('test');

    expect(provider).toEqual({
      ...providerConfig,
      name: 'test',
    });
  });

  it('should set active provider', () => {
    const providerConfig = {
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
      model: 'test-model',
    };

    configManager.setProvider('test', providerConfig);
    configManager.setActiveProvider('test');

    const active = configManager.getActiveProvider();
    expect(active).toEqual({
      ...providerConfig,
      name: 'test',
    });
  });

  it('should remove provider', () => {
    const providerConfig = {
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
      model: 'test-model',
    };

    configManager.setProvider('test', providerConfig);
    configManager.removeProvider('test');

    expect(configManager.getProvider('test')).toBeUndefined();
  });

  it('should throw when setting unknown active provider', () => {
    expect(() => configManager.setActiveProvider('unknown')).toThrow('Provider "unknown" not found');
  });

  it('should manage preferences', () => {
    configManager.setPreferences({ debug: true, theme: 'light' });
    const prefs = configManager.getPreferences();
    expect(prefs.debug).toBe(true);
    expect(prefs.theme).toBe('light');
  });

  it('should list provider names', () => {
    configManager.setProvider('provider1', { baseUrl: 'url1', apiKey: 'key1', model: 'model1' });
    configManager.setProvider('provider2', { baseUrl: 'url2', apiKey: 'key2', model: 'model2' });

    const names = configManager.listProviderNames();
    expect(names).toContain('provider1');
    expect(names).toContain('provider2');
    expect(names.length).toBe(2);
  });

  it('should check if provider exists', () => {
    configManager.setProvider('test', { baseUrl: 'url', apiKey: 'key', model: 'model' });
    expect(configManager.hasProvider('test')).toBe(true);
    expect(configManager.hasProvider('unknown')).toBe(false);
  });
});