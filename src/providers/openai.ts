import OpenAI from "openai";
import { AIProvider, ProviderConfig, GenerateRequest, GenerateResult } from "../types";
import { SYSTEM_PROMPT, buildUserPrompt } from "../core/prompts";

export class OpenAIProvider implements AIProvider {
  validateConfig(config: ProviderConfig) {
    if (!config.apiKey) return { valid: false, error: "API Key is required" };
    if (!config.modelName) return { valid: false, error: "Model Name is required" };
    return { valid: true };
  }

  async testConnection(config: ProviderConfig) {
    try {
      const openai = new OpenAI({ 
        apiKey: config.apiKey!,
        dangerouslyAllowBrowser: true 
      });
      await openai.models.list();
      return { success: true, message: "Connection successful" };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to connect" };
    }
  }

  async generate(input: GenerateRequest): Promise<GenerateResult> {
    const openai = new OpenAI({ 
      apiKey: input.config.apiKey!,
      dangerouslyAllowBrowser: true,
      baseURL: input.config.baseUrl || undefined
    });
    
    const userPrompt = buildUserPrompt(input.content, input.contentType, input.url, input.title, input.selection);
    
    const response = await openai.chat.completions.create({
      model: input.config.modelName,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const text = response.choices[0].message.content;
    
    if (!text) {
      throw new Error("Empty response from AI provider");
    }

    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
      const cleanText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : text.trim();
      const parsed = JSON.parse(cleanText);
      return this.formatResult(parsed, input);
    } catch (e) {
      console.error("Failed to parse JSON response:", text);
      throw new Error("Invalid response format from AI provider");
    }
  }

  private formatResult(parsed: any, input: GenerateRequest): GenerateResult {
    return {
      summary: parsed.summary || "No summary available.",
      explanation: {
        markdown: parsed.explanation?.markdown || "No explanation provided.",
        keyPoints: parsed.explanation?.keyPoints || [],
        keyEntities: parsed.explanation?.keyEntities || [],
        keyClaims: parsed.explanation?.keyClaims || [],
        openQuestions: parsed.explanation?.openQuestions || [],
        actionItems: parsed.explanation?.actionItems || []
      },
      nextReply: parsed.nextReply,
      referenceMetadata: {
        title: parsed.referenceMetadata?.title || input.title,
        authors: parsed.referenceMetadata?.authors || [],
        publicationDate: parsed.referenceMetadata?.publicationDate || "",
        publisher: parsed.referenceMetadata?.publisher || "",
        url: parsed.referenceMetadata?.url || input.url,
        doi: parsed.referenceMetadata?.doi || "",
        accessDate: parsed.referenceMetadata?.accessDate || new Date().toISOString()
      },
      languageDetected: parsed.languageDetected || "English",
      contentType: parsed.contentType || input.contentType,
      confidence: parsed.confidence || 0.9
    };
  }
}
