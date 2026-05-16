import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  AiProviderInterface,
  AiGenerationRequest,
  AiGenerationResponse,
} from './ai-provider.interface.js';
import { PromptBuilder } from './prompt-builder.js';

export class GeminiProvider implements AiProviderInterface {
  readonly name = 'GEMINI';
  private defaultModel = 'gemini-2.0-flash';

  get isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  private makeClient(apiKey?: string): GoogleGenerativeAI {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Gemini API key not provided');
    return new GoogleGenerativeAI(key);
  }

  async verifyKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const client = new GoogleGenerativeAI(apiKey);
      // Try to list models as a verification step
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
      await model.generateContent('Say "ok"');
      return { valid: true };
    } catch (e: any) {
      return { valid: false, error: e.message || 'Invalid API key' };
    }
  }

  async listModels(apiKey: string): Promise<{ models: { id: string; name: string }[] }> {
    // Gemini SDK doesn't expose a model list API directly; use the REST endpoint
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch models');

      const models = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name.replace('models/', ''),
        }));
      return { models };
    } catch (e: any) {
      throw new Error(`Failed to list Gemini models: ${e.message}`);
    }
  }

  async generate(request: AiGenerationRequest, apiKey?: string, modelId?: string): Promise<AiGenerationResponse> {
    const startTime = Date.now();
    const client = this.makeClient(apiKey);
    const modelName = modelId || this.defaultModel;

    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 16000,
        responseMimeType: 'application/json',
      },
    });

    const systemPrompt = PromptBuilder.buildSystemPrompt();
    const userPrompt = PromptBuilder.buildUserPrompt(request);

    const result = await model.generateContent({
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    });

    const latencyMs = Date.now() - startTime;
    const response = result.response;
    const content = response.text();

    let questions: any[];
    try {
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : parsed.questions || [parsed];
    } catch {
      throw new Error(`Gemini returned invalid JSON: ${content.substring(0, 200)}`);
    }

    const usage = response.usageMetadata;

    return {
      questions,
      usage: {
        promptTokens: usage?.promptTokenCount || 0,
        completionTokens: usage?.candidatesTokenCount || 0,
        totalTokens: usage?.totalTokenCount || 0,
      },
      model: modelName,
      latencyMs,
    };
  }
}
