/**
 * Provider-agnostic interface for AI question generation.
 * All providers must implement this contract to be pluggable.
 */

export interface AiGenerationRequest {
  subject: string;
  topic: string;
  subTopic?: string;
  questionTypes: { type: string; count: number }[];
  difficulty?: string;
  className?: string;
  examType?: string[];
  additionalInstructions?: string;
}

export interface AiGenerationResponse {
  questions: any[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  latencyMs: number;
}

export interface AiProviderInterface {
  readonly name: string;

  /**
   * Check if provider has an env-level API key configured.
   */
  readonly isConfigured: boolean;

  /**
   * Generate questions. An optional apiKey overrides the env key.
   */
  generate(request: AiGenerationRequest, apiKey?: string, model?: string): Promise<AiGenerationResponse>;

  /**
   * Verify that an API key is valid by making a lightweight call.
   */
  verifyKey(apiKey: string): Promise<{ valid: boolean; error?: string }>;

  /**
   * Fetch the list of available models for this provider using the given key.
   */
  listModels(apiKey: string): Promise<{ models: { id: string; name: string }[] }>;
}
