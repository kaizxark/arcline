import type { Provider, ProviderConfig } from '../core/types.js';
import { BaseProvider, ProviderError } from './provider.js';
import { OpenAICompatibleProvider } from './openai-compatible/index.js';

export class ProviderRegistry {
  private providers: Map<string, Provider> = new Map();

  constructor() {
    this.register(new OpenAICompatibleProvider());
  }

  register(provider: Provider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): Provider | undefined {
    return this.providers.get(name);
  }

  getDefault(): Provider {
    return this.providers.get('openai-compatible')!;
  }

  list(): Provider[] {
    return Array.from(this.providers.values());
  }

  async listModels(config: ProviderConfig): Promise<Array<{ id: string; name?: string }>> {
    const provider = this.getDefault();
    try {
      const models = await provider.listModels(config);
      return models.map(m => ({ id: m.id, name: m.name }));
    } catch (error) {
      if (error instanceof ProviderError && error.code === 'PROVIDER_ERROR' && error.statusCode === 404) {
        return [];
      }
      throw error;
    }
  }
}

export const providerRegistry = new ProviderRegistry();