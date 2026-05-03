import { AIProvider, ProviderConfig, GenerateRequest, GenerateResult } from "../types";
import { SYSTEM_PROMPT, buildUserPrompt } from "../core/prompts";

export class OpenRouterProvider implements AIProvider {
  validateConfig(config: ProviderConfig) {
    if (!config.apiKey) return { valid: false, error: "API Key is required" };
    if (!config.modelName) return { valid: false, error: "Model Name is required" };
    return { valid: true };
  }

  async testConnection(config: ProviderConfig) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
        }
      });
      if (response.status === 401) return { success: false, message: "Invalid API Key" };
      return { success: true, message: "OpenRouter connection successful" };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to connect" };
    }
  }

  async generate(input: GenerateRequest): Promise<GenerateResult> {
    const userPrompt = buildUserPrompt(input.content, input.contentType, input.url, input.title, input.selection);
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${input.config.apiKey}`,
        'HTTP-Referer': 'https://clarity-ai.extension', // Required by OpenRouter
        'X-Title': 'Clarity AI Extension'
      },
      body: JSON.stringify({
        model: input.config.modelName,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      let error = await response.text();
      if (response.status === 500) {
        throw new Error(`OpenRouter Server Error (500). The selected model might be overloaded or unavailable. Try a different model like 'meta-llama/llama-3.1-8b-instruct'.`);
      }
      if (error.length > 200) error = error.substring(0, 200) + "...";
      throw new Error(`OpenRouter error: ${error}`);
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content;
    
    if (!text) {
      throw new Error("Empty response from AI provider");
    }

    try {
      // Handle cases where the model might wrap JSON in markdown code blocks or add preamble
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                        text.match(/```([\s\S]*?)```/) || 
                        text.match(/\{[\s\S]*\}/);
      
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
