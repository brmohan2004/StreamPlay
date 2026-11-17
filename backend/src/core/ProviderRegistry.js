import { ProviderAdapter } from './ProviderAdapter.js';

export class ProviderRegistry {
  constructor() {
    this._providers = new Map();
  }

  register(adapter) {
    if (!(adapter instanceof ProviderAdapter)) {
      throw new TypeError('Registered provider must extend ProviderAdapter.');
    }
    this._providers.set(adapter.id, adapter);
    return this;
  }

  unregister(providerId) {
    return this._providers.delete(String(providerId));
  }

  getProvider(providerId) {
    return this._providers.get(String(providerId)) ?? null;
  }

  setEnabled(providerId, enabled) {
    const provider = this._providers.get(String(providerId));
    if (!provider) return false;
    provider.enabled = Boolean(enabled);
    return true;
  }

  getEnabledProviders() {
    return [...this._providers.values()]
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  listProviders() {
    return [...this._providers.values()]
      .sort((a, b) => a.priority - b.priority)
      .map((p) => p.getMetadata());
  }
}
