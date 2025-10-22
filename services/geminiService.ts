import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import { AgentConfig } from '../types';

interface ApiKeys {
  openai: string;
  gemini: string;
  grok: string;
}

// This service now makes real API calls.
export const runProvider = async (
  config: AgentConfig,
  user_prompt: string,
  apiKeys: ApiKeys
): Promise<string> => {
  console.log(`Running provider: ${config.provider}`);
  
  switch (config.provider) {
    case 'gemini':
      if (!apiKeys.gemini) throw new Error("Gemini API key is not set.");
      try {
        const ai = new GoogleGenAI({ apiKey: apiKeys.gemini });
        const response = await ai.models.generateContent({
            model: config.model,
            // FIX: Use the explicit, structured format for 'contents' for better reliability.
            contents: [{ role: "user", parts: [{ text: user_prompt }] }],
            config: {
                systemInstruction: config.system_prompt,
                temperature: config.params.temperature,
                topP: config.params.top_p,
                maxOutputTokens: config.params.max_tokens,
            },
        });
        
        const responseText = response.text;

        // Provide more specific feedback if the response is empty.
        if (!responseText) {
            if (response.candidates && response.candidates.length > 0) {
                const finishReason = response.candidates[0].finishReason;
                if (finishReason === 'SAFETY') {
                    return "[Response blocked due to safety settings. The document's content may have been flagged as harmful.]";
                }
            }
            return "[Empty response from Gemini. The model may not have generated any content or the response was blocked.]";
        }

        return responseText;

      } catch (error) {
        console.error("Gemini API Error:", JSON.stringify(error, null, 2));
        throw new Error(`Gemini API Error: ${error.message || 'An unknown error occurred'}`);
      }

    case 'openai':
      if (!apiKeys.openai) throw new Error("OpenAI API key is not set.");
      try {
        const openai = new OpenAI({ apiKey: apiKeys.openai, dangerouslyAllowBrowser: true });
        const completion = await openai.chat.completions.create({
          model: config.model,
          messages: [
            { role: "system", content: config.system_prompt },
            { role: "user", content: user_prompt },
          ],
          temperature: config.params.temperature,
          max_tokens: config.params.max_tokens,
          top_p: config.params.top_p,
        });
        return completion.choices[0]?.message?.content || "No response from OpenAI.";
      } catch (error) {
        console.error("OpenAI API Error:", error);
        throw new Error(`OpenAI API Error: ${error.message}`);
      }

    case 'grok':
      if (!apiKeys.grok) throw new Error("Grok (xAI) API key is not set.");
      try {
        const grok = new OpenAI({
          apiKey: apiKeys.grok,
          baseURL: "https://api.x.ai/v1",
          dangerouslyAllowBrowser: true,
        });
        
        const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: 'text', text: user_prompt }];

        if (config.image_url) {
            content.unshift({ type: 'image_url', image_url: { url: config.image_url } });
        }

        const completion = await grok.chat.completions.create({
          model: config.model,
          messages: [
            { role: "system", content: config.system_prompt },
            { role: "user", content },
          ],
          temperature: config.params.temperature,
          max_tokens: config.params.max_tokens,
          top_p: config.params.top_p,
        });
        return completion.choices[0]?.message?.content || "No response from Grok.";
      } catch (error) {
        console.error("Grok API Error:", error);
        throw new Error(`Grok API Error: ${error.message}`);
      }

    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
};