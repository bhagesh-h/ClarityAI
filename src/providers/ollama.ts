import { AIProvider, ProviderConfig, GenerateRequest, GenerateResult } from "../types";
import { SYSTEM_PROMPT, buildUserPrompt } from "../core/prompts";

export class OllamaProvider implements AIProvider {
  validateConfig(config: ProviderConfig) {
    if (!config.baseUrl) return { valid: false, error: "Base URL is required (e.g. http://localhost:11434)" };
    if (!config.modelName) return { valid: false, error: "Model Name is required" };
    return { valid: true };
  }

  async testConnection(config: ProviderConfig) {
    try {
      const baseUrl = config.baseUrl || "http://localhost:11434";
      if (!baseUrl.startsWith('http')) {
        return { success: false, message: "Base URL must include protocol (e.g. http://)" };
      }
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) throw new Error("Failed to reach Ollama");
      return { success: true, message: "Ollama is reachable" };
    } catch (e: any) {
      return { success: false, message: "Could not connect to Ollama. Ensure it's running and CORS is configured (OLLAMA_ORIGINS=*)." };
    }
  }

  async generate(input: GenerateRequest): Promise<GenerateResult> {
    const userPrompt = buildUserPrompt(input.content, input.contentType, input.url, input.title, input.selection);
    const baseUrl = input.config.baseUrl || "http://localhost:11434";
    
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: input.config.modelName,
        prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
        stream: false,
        format: "json"
      })
    });

    if (!response.ok) {
      let error = await response.text();
      // If the error looks like HTML/JS source, it's likely a misconfiguration
      if (error.includes('<html') || error.includes('__vite')) {
        throw new Error("Invalid response from Ollama. Check your Base URL (must be absolute).");
      }
      if (error.length > 200) error = error.substring(0, 200) + "...";
      throw new Error(`Ollama error: ${error}`);
    }

    const data = await response.json();
    const text = data.response;
    
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
