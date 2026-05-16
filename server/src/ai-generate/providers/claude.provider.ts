import Anthropic from '@anthropic-ai/sdk';
import type {
  AiProviderInterface,
  AiGenerationRequest,
  AiGenerationResponse,
} from './ai-provider.interface.js';
import { PromptBuilder } from './prompt-builder.js';

export class ClaudeProvider implements AiProviderInterface {
  readonly name = 'CLAUDE';
  private defaultModel =
    process.env.CLAUDE_DEFAULT_MODEL || 'claude-sonnet-4-20250514';

  get isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  private makeClient(apiKey?: string): Anthropic {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('Anthropic API key not provided');
    return new Anthropic({ apiKey: key });
  }

  async verifyKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      });
      return { valid: true };
    } catch (e: any) {
      return { valid: false, error: e.message || 'Invalid API key' };
    }
  }

  async listModels(
    apiKey: string,
  ): Promise<{ models: { id: string; name: string }[] }> {
    try {
      const client = new Anthropic({ apiKey });
      const response = await client.models.list({ limit: 100 });
      const models = (response.data || []).map((m: any) => ({
        id: m.id,
        name: m.display_name || m.id,
      }));
      return { models };
    } catch (e: any) {
      // Fallback: return known models if API doesn't support listing
      return {
        models: [
          { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
          { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        ],
      };
    }
  }

  async generate(
    request: AiGenerationRequest,
    apiKey?: string,
    model?: string,
  ): Promise<AiGenerationResponse> {
    const startTime = Date.now();
    const client = this.makeClient(apiKey);
    const modelName = model || this.defaultModel;

    const response = await client.messages.create({
      model: modelName,
      max_tokens: 16000,
      temperature: 0.7,
      system: PromptBuilder.buildSystemPrompt(),
      messages: [
        { role: 'user', content: PromptBuilder.buildUserPrompt(request) },
      ],
    });

    const latencyMs = Date.now() - startTime;

    const textBlock = response.content.find((b) => b.type === 'text');
    const rawContent = textBlock && 'text' in textBlock ? textBlock.text : '[]';

    // Claude sometimes wraps JSON in code fences; strip them
    const content = rawContent
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    let questions: any[];
    try {
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : parsed.questions || [parsed];
    } catch {
      throw new Error(
        `Claude returned invalid JSON: ${content.substring(0, 200)}`,
      );
    }

    return {
      questions,
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens:
          (response.usage?.input_tokens || 0) +
          (response.usage?.output_tokens || 0),
      },
      model: modelName,
      latencyMs,
    };
  }
}
