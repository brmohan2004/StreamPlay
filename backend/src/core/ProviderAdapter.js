/**
 * Abstract contract for independently configurable, legally authorized video providers.
 * Every provider adapter MUST implement:
 * - searchContent(query, options)
 * - getSources(request, options)
 * - validateSource(source, options)
 * - getSubtitles(contentId, options)
 * - getAudioTracks(contentId, options)
 */
export class ProviderAdapter {
  constructor({
    id,
    name,
    description = '',
    priority = 100,
    enabled = true,
    supportedFormats = ['mp4', 'hls', 'dash'],
  }) {
    if (!id || !name) {
      throw new Error('ProviderAdapter requires non-empty id and name.');
    }
    this.id = String(id);
    this.name = String(name);
    this.description = String(description);
    this.priority = Number(priority);
    this.enabled = Boolean(enabled);
    this.supportedFormats = [...supportedFormats];
  }

  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      priority: this.priority,
      enabled: this.enabled,
      supportedFormats: [...this.supportedFormats],
    };
  }

  async searchContent(_query, _options = {}) {
    throw new Error(`${this.constructor.name}.searchContent() not implemented.`);
  }

  async getSources(_request, _options = {}) {
    throw new Error(`${this.constructor.name}.getSources() not implemented.`);
  }

  async validateSource(_source, _options = {}) {
    throw new Error(`${this.constructor.name}.validateSource() not implemented.`);
  }

  async getSubtitles(_contentId, _options = {}) {
    throw new Error(`${this.constructor.name}.getSubtitles() not implemented.`);
  }

  async getAudioTracks(_contentId, _options = {}) {
    throw new Error(`${this.constructor.name}.getAudioTracks() not implemented.`);
  }
}
