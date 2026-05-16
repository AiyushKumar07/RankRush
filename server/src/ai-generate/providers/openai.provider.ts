import OpenAI from 'openai';
import type {
  AiProviderInterface,
  AiGenerationRequest,
  AiGenerationResponse,
} from './ai-provider.interface.js';
import { PromptBuilder } from './prompt-builder.js';

export class OpenAIProvider implements AiProviderInterface {
  readonly name = 'OPENAI';
  private defaultModel = 'gpt-4o';

  get isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  private makeClient(apiKey?: string): OpenAI {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OpenAI API key not provided');
    return new OpenAI({ apiKey: key });
  }

  async verifyKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const client = new OpenAI({ apiKey });
      const models = await client.models.list();
      // If we get here, the key is valid
      return { valid: !!models.data?.length };
    } catch (e: any) {
      return { valid: false, error: e.message || 'Invalid API key' };
    }
  }

  async listModels(apiKey: string): Promise<{ models: { id: string; name: string }[] }> {
    const client = new OpenAI({ apiKey });
    const response = await client.models.list();
    const chatModels = response.data
      .filter((m) => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3') || m.id.includes('o4'))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((m) => ({ id: m.id, name: m.id }));
    return { models: chatModels };
  }

  async generate(request: AiGenerationRequest, apiKey?: string, model?: string): Promise<AiGenerationResponse> {
    const startTime = Date.now();
    const client = this.makeClient(apiKey);
    const modelName = model || this.defaultModel;

    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: PromptBuilder.buildSystemPrompt() },
        { role: 'user', content: PromptBuilder.buildUserPrompt(request) },
      ],
      temperature: 0.7,
      max_tokens: 16000,
      response_format: { type: 'json_object' },
    });

    const latencyMs = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || '[]';

    let questions: any[];
    try {
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : parsed.questions || [parsed];
    } catch {
      throw new Error(`OpenAI returned invalid JSON: ${content.substring(0, 200)}`);
    }

    return {
      questions,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: modelName,
      latencyMs,
    };
  }
}
