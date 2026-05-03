/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ContentType = 'email' | 'article' | 'pdf' | 'youtube' | 'research' | 'generic' | 'selected-text';

export interface ReferenceMetadata {
  title?: string;
  authors?: string[];
  publicationDate?: string;
  publisher?: string;
  url?: string;
  doi?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  isbn?: string;
  accessDate?: string;
}

export interface ExplanationData {
  markdown: string;
  keyPoints: string[];
  keyEntities: string[];
  keyClaims: string[];
  openQuestions: string[];
  actionItems: string[];
}

export interface NextReplyData {
  subject: string;
  body: string;
  style: 'professional';
}

export interface GenerateResult {
  summary: string;
  explanation: ExplanationData;
  nextReply?: NextReplyData;
  referenceMetadata: ReferenceMetadata;
  languageDetected: string;
  contentType: ContentType;
  confidence: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  providerType: 'google' | 'anthropic' | 'openai' | 'openrouter' | 'ollama' | 'custom';
  apiKey?: string;
  modelName: string;
  baseUrl?: string;
  customHeaders?: Record<string, string>;
}

export interface GenerateRequest {
  content: string;
  contentType: ContentType;
  config: ProviderConfig;
  url: string;
  title: string;
  selection?: string;
}

export interface AIProvider {
  validateConfig(config: ProviderConfig): { valid: boolean; error?: string };
  testConnection(config: ProviderConfig): Promise<{ success: boolean; message: string }>;
  generate(input: GenerateRequest): Promise<GenerateResult>;
}
