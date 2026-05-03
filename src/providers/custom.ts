import { AIProvider, ProviderConfig, GenerateRequest, GenerateResult } from "../types";
import { SYSTEM_PROMPT, buildUserPrompt } from "../core/prompts";

export class CustomProvider implements AIProvider {
  validateConfig(config: ProviderConfig) {
    if (!config.baseUrl) return { valid: false, error: "Base URL is required" };
    return { valid: true };
  }

  async testConnection(config: ProviderConfig) {
    try {
      const baseUrl = config.baseUrl || "";
      if (!baseUrl.startsWith('http')) {
        return { success: false, message: "Base URL must include protocol (e.g. https://)" };
      }
      const response = await fetch(`${baseUrl}/health`, { method: 'GET' });
      if (!response.ok) return { success: false, message: "Host reachable but returned error" };
      return { success: true, message: "Connection successful" };
    } catch (e: any) {
      return { success: false, message: "Host unreachable" };
    }
  }

  async generate(input: GenerateRequest): Promise<GenerateResult> {
    const userPrompt = buildUserPrompt(input.content, input.contentType, input.url, input.title, input.selection);
    
    // Default to OpenAI-compatible chat completions if no path specified
    const url = input.config.baseUrl?.endsWith('/') ? input.config.baseUrl : `${input.config.baseUrl}/`;
    const endpoint = url.includes('v1') ? url : `${url}v1/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(input.config.apiKey ? { 'Authorization': `Bearer ${input.config.apiKey}` } : {}),
        ...(input.config.customHeaders || {})
      },
      body: JSON.stringify({
        model: input.config.modelName || 'default',
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      let error = await response.text();
      if (error.includes('<html') || error.includes('__vite')) {
        throw new Error("Invalid response from provider. Check your Base URL (must be absolute).");
      }
      if (error.length > 200) error = error.substring(0, 200) + "...";
      throw new Error(`Custom provider error: ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || data.response;
    
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
