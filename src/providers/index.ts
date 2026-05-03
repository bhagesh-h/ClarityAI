import { AIProvider, ProviderConfig } from "../types";
import { GoogleProvider } from "./google";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { OllamaProvider } from "./ollama";
import { CustomProvider } from "./custom";
import { OpenRouterProvider } from "./openrouter";

const providers: Record<string, AIProvider> = {
  google: new GoogleProvider(),
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  ollama: new OllamaProvider(),
  custom: new CustomProvider(),
  openrouter: new OpenRouterProvider(),
};

export function getProvider(type: string): AIProvider {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Provider ${type} not supported yet or missing implementation.`);
  }
  return provider;
}
