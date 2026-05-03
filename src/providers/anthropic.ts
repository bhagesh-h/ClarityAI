import { AIProvider, ProviderConfig, GenerateRequest, GenerateResult } from "../types";
import { SYSTEM_PROMPT, buildUserPrompt } from "../core/prompts";

export class AnthropicProvider implements AIProvider {
  validateConfig(config: ProviderConfig) {
    if (!config.apiKey) return { valid: false, error: "API Key is required" };
    if (!config.modelName) return { valid: false, error: "Model Name is required" };
    return { valid: true };
  }

  async testConnection(config: ProviderConfig) {
    try {
      // Small test request to verify API key
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": config.apiKey!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "dangerously-allow-browser": "true"
        },
        body: JSON.stringify({
          model: config.modelName,
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }]
        })
      });
      
      if (response.status === 401) return { success: false, message: "Invalid API Key" };
      return { success: true, message: "Provider ready" };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to connect" };
    }
  }

  async generate(input: GenerateRequest): Promise<GenerateResult> {
    const userPrompt = buildUserPrompt(input.content, input.contentType, input.url, input.title, input.selection);
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": input.config.apiKey!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "dangerously-allow-browser": "true"
      },
      body: JSON.stringify({
        model: input.config.modelName,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: userPrompt }
        ],
      })
    });

    if (!response.ok) {
      let error = await response.text();
      if (error.length > 200) error = error.substring(0, 200) + "...";
      throw new Error(`Anthropic error: ${error}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    
    if (!text) {
      throw new Error("Empty response from AI provider");
    }

    try {
      // Anthropic sometimes adds preamble before JSON
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : text.trim();
      const parsed = JSON.parse(jsonStr);
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
