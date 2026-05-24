import { BadRequestException } from '@nestjs/common';
import type { AiProviderInterface } from './ai-provider.interface.js';
import { OpenAIProvider } from './openai.provider.js';
import { GeminiProvider } from './gemini.provider.js';
import { ClaudeProvider } from './claude.provider.js';

/**
 * Factory that instantiates provider singletons.
 * Providers now support dynamic API keys passed from the frontend,
 * so isConfigured only checks env-level keys.
 */
export class AiProviderFactory {
  private static providers: Map<string, AiProviderInterface> = new Map();

  /**
   * Get a provider instance. Does NOT check isConfigured — the caller
   * is responsible for supplying an API key if none is in env.
   */
  static getProvider(name: string): AiProviderInterface {
    const key = name.toUpperCase();

    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }

    let provider: AiProviderInterface;

    switch (key) {
      case 'OPENAI':
        provider = new OpenAIProvider();
        break;
      case 'GEMINI':
        provider = new GeminiProvider();
        break;
      case 'CLAUDE':
        provider = new ClaudeProvider();
        break;
      default:
        throw new BadRequestException(
          `Unknown AI provider: ${name}. Supported: OPENAI, GEMINI, CLAUDE`,
        );
    }

    this.providers.set(key, provider);
    return provider;
  }

  /**
   * Returns providers that have env-level API keys configured.
   */
  static getEnvConfiguredProviders(): string[] {
    const all = [
      new OpenAIProvider(),
      new GeminiProvider(),
      new ClaudeProvider(),
    ];
    return all.filter((p) => p.isConfigured).map((p) => p.name);
  }

  /**
   * Returns all supported provider names.
   */
  static getAllProviders(): string[] {
    return ['OPENAI', 'GEMINI', 'CLAUDE'];
  }
}
