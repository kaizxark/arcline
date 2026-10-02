import { join } from 'node:path';
import { homedir } from 'node:os';
import Conf from 'conf';
import type { AppConfig, ProviderConfig } from '../core/types.js';

const DEFAULT_CONFIG: AppConfig = {
  providers: {},
  preferences: {
    theme: 'dark',
    debug: false,
    autoSelectModel: false,
  },
};

export class ConfigManager {
  private store: Conf<AppConfig>;
  private configPath: string;

  constructor() {
    this.configPath = join(homedir(), '.config', 'arcline');
    this.store = new Conf<AppConfig>({
      projectName: 'arcline',
      projectVersion: '0.1.0',
      configName: 'config',
      defaults: DEFAULT_CONFIG,
      migrations: {
        '0.1.0': (store: Conf<AppConfig>) => {
          if (!store.has('preferences')) {
            store.set('preferences', DEFAULT_CONFIG.preferences);
          }
        },
      },
    });
  }

  getConfig(): AppConfig {
    return this.store.store;
  }

  getProviders(): Record<string, ProviderConfig> {
    return this.store.get('providers', {});
  }

  getProvider(name: string): ProviderConfig | undefined {
    const providers = this.getProviders();
    return providers[name];
  }

  getActiveProvider(): ProviderConfig | undefined {
    const config = this.getConfig();
    if (!config.activeProvider) return undefined;
    return this.getProvider(config.activeProvider);
  }

  setProvider(name: string, config: ProviderConfig): void {
    const providers = this.getProviders();
    providers[name] = { ...config, name };
    this.store.set('providers', providers);
    this.store.set('activeProvider', name);
  }

  removeProvider(name: string): void {
    const providers = this.getProviders();
    delete providers[name];
    this.store.set('providers', providers);
    const config = this.getConfig();
    if (config.activeProvider === name) {
      this.store.delete('activeProvider');
    }
  }

  setActiveProvider(name: string): void {
    const providers = this.getProviders();
    if (!providers[name]) {
      throw new Error(`Provider "${name}" not found`);
    }
    this.store.set('activeProvider', name);
  }

  getPreferences() {
    return this.store.get('preferences', DEFAULT_CONFIG.preferences);
  }

  setPreferences(preferences: Partial<AppConfig['preferences']>): void {
    const current = this.getPreferences();
    this.store.set('preferences', { ...current, ...preferences });
  }

  getDebugMode(): boolean {
    return this.getPreferences().debug ?? false;
  }

  setDebugMode(enabled: boolean): void {
    this.setPreferences({ debug: enabled });
  }

  getConfigPath(): string {
    return this.configPath;
  }

  clear(): void {
    this.store.clear();
  }

  hasProvider(name: string): boolean {
    return name in this.getProviders();
  }

  listProviderNames(): string[] {
    return Object.keys(this.getProviders());
  }
}

export const configManager = new ConfigManager();