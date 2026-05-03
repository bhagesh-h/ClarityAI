import { GoogleGenAI } from "@google/genai";
import { AIProvider, ProviderConfig, GenerateRequest, GenerateResult } from "../types";
import { SYSTEM_PROMPT, buildUserPrompt } from "../core/prompts";

export class GoogleProvider implements AIProvider {
  validateConfig(config: ProviderConfig) {
    if (!config.apiKey) return { valid: false, error: "API Key is required" };
    if (!config.modelName) return { valid: false, error: "Model Name is required" };
    return { valid: true };
  }

  async testConnection(config: ProviderConfig) {
    try {
      const ai = new GoogleGenAI({ apiKey: config.apiKey! });
      await ai.models.generateContent({
        model: config.modelName || "gemini-3-flash-preview",
        contents: "test",
      });
      return { success: true, message: "Connection successful" };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to connect" };
    }
  }

  async generate(input: GenerateRequest): Promise<GenerateResult> {
    const ai = new GoogleGenAI({ apiKey: input.config.apiKey! });
    
    const userPrompt = buildUserPrompt(input.content, input.contentType, input.url, input.title, input.selection);
    
    const response = await ai.models.generateContent({
      model: input.config.modelName,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    
    if (!text) {
      throw new Error("Empty response from AI provider");
    }

    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
      const cleanText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : text.trim();
      const parsed = JSON.parse(cleanText);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error("AI returned invalid result object");
      }

      // Ensure required structure exists to prevent UI errors
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
    } catch (e) {
      console.error("Failed to parse JSON response:", text);
      throw new Error("Invalid response format from AI provider");
    }
  }
}
