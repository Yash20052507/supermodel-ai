import type { SkillPack, Message, CustomProvider } from '../types.ts';
import { GoogleGenAI, Type } from '@google/genai';

interface ApiKeys {
    google?: string;
    openai?: string;
    anthropic?: string;
}

// Explicit types for Gemini API content to ensure type safety.
type TextPart = { text: string; inlineData?: never };
type InlineDataPart = { text?: never; inlineData: { mimeType: string; data: string; } };
type Part = TextPart | InlineDataPart;

interface Content {
  role: string;
  parts: Part[];
}


/**
 * Main dispatcher function. Determines the provider and calls the appropriate
 * streaming function.
 */
export async function* generateResponseStream(
    activeSkillPacks: SkillPack[],
    conversationHistory: Message[],
    apiKeys: ApiKeys,
    customProviders: CustomProvider[],
    signal?: AbortSignal
): AsyncGenerator<{ chunk?: string; groundingChunks?: any[] }> {
    const primaryPack = activeSkillPacks[0];
    if (!primaryPack) {
        throw new Error("At least one skill pack must be active.");
    }

    const provider = primaryPack.provider;

    if (provider === 'google' || provider === 'google_search') {
        const apiKey = apiKeys.google;
        if (!apiKey) throw new Error("Google API Key is missing.");
        yield* _generateGoogleStream(primaryPack, conversationHistory, apiKey);
    } else if (provider === 'openai') {
        const apiKey = apiKeys.openai;
        if (!apiKey) throw new Error("OpenAI API Key is missing.");
        yield* _generateOpenAICompatibleStream(primaryPack, conversationHistory, 'https://api.openai.com/v1/chat/completions', signal, apiKey);
    } else if (provider === 'anthropic') {
        const apiKey = apiKeys.anthropic;
        if (!apiKey) throw new Error("Anthropic API Key is missing.");
        yield* _generateAnthropicStream(primaryPack, conversationHistory, apiKey, signal);
    } else if (provider === 'local') {
        const localUrl = localStorage.getItem('supermodel_ollama_url') || 'http://localhost:11434';
        yield* _generateOpenAICompatibleStream(primaryPack, conversationHistory, `${localUrl}/v1/chat/completions`, signal);
    } else {
        const customProvider = customProviders.find(p => p.name === provider);
        if (!customProvider) {
            throw new Error(`Custom provider "${provider}" not found. Please configure it in the settings.`);
        }
        const cleanBaseURL = customProvider.baseURL.endsWith('/') ? customProvider.baseURL.slice(0, -1) : customProvider.baseURL;
        yield* _generateOpenAICompatibleStream(
            primaryPack,
            conversationHistory,
            `${cleanBaseURL}/chat/completions`,
            signal,
            customProvider.apiKey
        );
    }
}

/**
 * Handles streaming responses from Google's Gemini API.
 */
async function* _generateGoogleStream(
    primaryPack: SkillPack,
    conversationHistory: Message[],
    apiKey: string
): AsyncGenerator<{ chunk?: string; groundingChunks?: any[] }> {
    const ai = new GoogleGenAI({ apiKey });

    const lastUserMessage = conversationHistory[conversationHistory.length - 1];
    let processedPrompt = await _preprocessPrompt(primaryPack, lastUserMessage.content);

    const systemInstruction = `You are SuperModel AI. You are using the '${primaryPack.name}' skill. ${primaryPack.system_instructions || ''} ${primaryPack.prompt_template || ''}`;
    
    // Construct payload for multi-modal and history
    const lastUserMessageParts: Part[] = [];

    if (lastUserMessage.image_data) {
        // Correctly parse the data URI to get MIME type and base64 data
        const match = lastUserMessage.image_data.match(/^data:(image\/.+);base64,(.+)$/);
        if (match) {
            const mimeType = match[1];
            const data = match[2];
            lastUserMessageParts.push({ inlineData: { mimeType, data } });
        } else {
            console.warn("Could not parse image data URI, skipping image.");
        }
    }
    lastUserMessageParts.push({ text: processedPrompt });


    const contents: Content[] = conversationHistory
      .slice(0, -1) // Exclude the last message which we handle separately
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }] // History messages are text only
      }));
    
    contents.push({ role: 'user', parts: lastUserMessageParts });

    const config: { systemInstruction: string; thinkingConfig?: { thinkingBudget: number }; tools?: any[] } = { systemInstruction };
    if (primaryPack.low_latency) {
        config.thinkingConfig = { thinkingBudget: 0 };
    }
    if (primaryPack.provider === 'google_search') {
        config.tools = [{ googleSearch: {} }];
    }

    try {
        const response = await ai.models.generateContentStream({
            model: primaryPack.base_model,
            contents: contents,
            config: config
        });
        
        let groundingSent = false;
        for await (const chunk of response) {
            if (chunk.text) {
                yield { chunk: chunk.text };
            }
            const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks && groundingChunks.length > 0 && !groundingSent) {
                yield { groundingChunks };
                groundingSent = true;
            }
        }
    } catch (error) {
        console.error("Error calling Gemini API stream:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
            throw new Error(`API call failed: The provided Google API Key is not valid.`);
        }
        throw error;
    }
}

/**
 * Handles streaming responses from any OpenAI-compatible API, including Ollama's local server.
 */
async function* _generateOpenAICompatibleStream(
    primaryPack: SkillPack,
    conversationHistory: Message[],
    apiUrl: string,
    signal?: AbortSignal,
    apiKey?: string
): AsyncGenerator<{ chunk?: string; groundingChunks?: any[] }> {
    const lastUserMessage = conversationHistory[conversationHistory.length - 1];
    const processedPrompt = await _preprocessPrompt(primaryPack, lastUserMessage.content);

    const systemInstruction = `You are SuperModel AI. You are using the '${primaryPack.name}' skill. ${primaryPack.system_instructions || ''} ${primaryPack.prompt_template || ''}`;
    
    const historyMessages = conversationHistory.slice(0, -1)
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
        }));
        
    const lastMessageForApi = {
        role: lastUserMessage.role as 'user' | 'assistant',
        content: processedPrompt
    };

    const messages = [
        { role: 'system', content: systemInstruction },
        ...historyMessages,
        lastMessageForApi
    ];

    try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: primaryPack.base_model,
                messages: messages,
                stream: true,
            }),
            signal: signal, // Pass the abort signal to fetch
        });
        
        if (!response.ok) {
            const errorBody = await response.json();
            const errorMsg = errorBody?.error?.message || response.statusText;
            if (primaryPack.provider === 'local') throw new Error(`Local model error: ${errorMsg}`);
            throw new Error(`${primaryPack.provider} API error: ${errorMsg}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last, possibly incomplete, line

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    if (jsonStr.trim() === '[DONE]') {
                        return;
                    }
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            yield { chunk: content };
                        }
                    } catch (e) {
                        console.warn('Failed to parse stream chunk:', line);
                    }
                }
            }
        }
    } catch (error: any) {
         if (error.name === 'AbortError') {
            console.log('Stream generation aborted by user.');
            return; // Exit gracefully
        }
         if (primaryPack.provider === 'local' && error instanceof TypeError && error.message.includes('fetch')) {
             throw new Error("Connection failed: Could not connect to the local AI server. Ensure Ollama is running and accessible at http://localhost:11434.");
        }
        throw error;
    }
}

/**
 * Handles streaming responses from Anthropic's Claude API.
 */
async function* _generateAnthropicStream(
    primaryPack: SkillPack,
    conversationHistory: Message[],
    apiKey: string,
    signal?: AbortSignal
): AsyncGenerator<{ chunk?: string; groundingChunks?: any[] }> {
    const apiUrl = 'https://api.anthropic.com/v1/messages';
    const lastUserMessage = conversationHistory[conversationHistory.length - 1];
    const processedPrompt = await _preprocessPrompt(primaryPack, lastUserMessage.content);

    const systemInstruction = `You are SuperModel AI. You are using the '${primaryPack.name}' skill. ${primaryPack.system_instructions || ''} ${primaryPack.prompt_template || ''}`;

    const historyMessages = conversationHistory.slice(0, -1)
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
        }));

    const lastMessageForApi = {
        role: lastUserMessage.role as 'user' | 'assistant',
        content: processedPrompt
    };
    
    const messages = [...historyMessages, lastMessageForApi];

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: primaryPack.base_model,
                system: systemInstruction,
                messages: messages,
                max_tokens: 4096,
                stream: true,
            }),
            signal: signal,
        });

        if (!response.ok) {
            const errorBody = await response.json();
            const errorMsg = errorBody?.error?.message || response.statusText;
            throw new Error(`Anthropic API error: ${errorMsg}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.type === 'content_block_delta' && parsed.delta.type === 'text_delta') {
                            yield { chunk: parsed.delta.text };
                        }
                    } catch (e) {
                        console.warn('Failed to parse Anthropic stream chunk:', line);
                    }
                }
            }
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('Anthropic stream generation aborted by user.');
            return;
        }
        throw error;
    }
}

// --- NEW: Non-streaming response generation for Skill Testing ---

/**
 * Executes a skill's logic for a single input and returns a single response string.
 * Used for the "Run Tests" feature in the Skill Builder.
 */
export const testSkillExecution = async (
    skillData: Partial<SkillPack>,
    input: string,
    apiKeys: ApiKeys,
    customProviders: CustomProvider[]
): Promise<string> => {
    // 1. Pre-process the input
    const processedInput = await _preprocessPrompt(skillData as SkillPack, input);

    // 2. Create a minimal mock conversation history
    const mockHistory: Message[] = [{
        id: 'test-user-msg',
        session_id: 'test-session',
        content: processedInput,
        role: 'user',
        timestamp: new Date().toISOString()
    }];

    // 3. Call the AI for a single, non-streamed response
    const aiResponse = await _generateSingleResponse(skillData as SkillPack, mockHistory, apiKeys, customProviders);

    // 4. Post-process the full response
    const finalOutput = await postprocessResponse(skillData as SkillPack, aiResponse);

    return finalOutput;
};

/**
 * Internal dispatcher for single (non-streamed) responses.
 */
async function _generateSingleResponse(
    primaryPack: SkillPack,
    conversationHistory: Message[],
    apiKeys: ApiKeys,
    customProviders: CustomProvider[]
): Promise<string> {
    const provider = primaryPack.provider;

    if (provider === 'google' || provider === 'google_search') {
        const apiKey = apiKeys.google;
        if (!apiKey) throw new Error("Google API Key is missing.");
        return await _generateGoogleSingle(primaryPack, conversationHistory, apiKey);
    } else if (provider === 'openai') {
        const apiKey = apiKeys.openai;
        if (!apiKey) throw new Error("OpenAI API Key is missing.");
        return await _generateOpenAICompatibleSingle(primaryPack, conversationHistory, 'https://api.openai.com/v1/chat/completions', apiKey);
    } else if (provider === 'anthropic') {
        const apiKey = apiKeys.anthropic;
        if (!apiKey) throw new Error("Anthropic API Key is missing.");
        return await _generateAnthropicSingle(primaryPack, conversationHistory, apiKey);
    } else if (provider === 'local') {
        const localUrl = localStorage.getItem('supermodel_ollama_url') || 'http://localhost:11434';
        return await _generateOpenAICompatibleSingle(primaryPack, conversationHistory, `${localUrl}/v1/chat/completions`);
    } else {
        const customProvider = customProviders.find(p => p.name === provider);
        if (!customProvider) throw new Error(`Custom provider "${provider}" not found.`);
        const cleanBaseURL = customProvider.baseURL.endsWith('/') ? customProvider.baseURL.slice(0, -1) : customProvider.baseURL;
        return await _generateOpenAICompatibleSingle(
            primaryPack,
            conversationHistory,
            `${cleanBaseURL}/chat/completions`,
            customProvider.apiKey
        );
    }
}

async function _generateGoogleSingle(
    primaryPack: SkillPack,
    conversationHistory: Message[],
    apiKey: string
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    const lastUserMessage = conversationHistory[conversationHistory.length - 1];
    const systemInstruction = `You are SuperModel AI. You are using the '${primaryPack.name}' skill. ${primaryPack.system_instructions || ''} ${primaryPack.prompt_template || ''}`;
    
    const contents: Content[] = conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    try {
        const response = await ai.models.generateContent({
            model: primaryPack.base_model,
            contents: contents,
            config: { systemInstruction }
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
            throw new Error(`API call failed: The provided Google API Key is not valid.`);
        }
        throw error;
    }
}

async function _generateOpenAICompatibleSingle(
    primaryPack: SkillPack,
    conversationHistory: Message[],
    apiUrl: string,
    apiKey?: string
): Promise<string> {
    const systemInstruction = `You are SuperModel AI. You are using the '${primaryPack.name}' skill. ${primaryPack.system_instructions || ''} ${primaryPack.prompt_template || ''}`;
    const messages = [
        { role: 'system', content: systemInstruction },
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content }))
    ];

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: primaryPack.base_model,
            messages: messages,
            stream: false,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        const errorMsg = errorBody?.error?.message || response.statusText;
        throw new Error(`${primaryPack.provider} API error: ${errorMsg}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

async function _generateAnthropicSingle(
    primaryPack: SkillPack,
    conversationHistory: Message[],
    apiKey: string
): Promise<string> {
     const systemInstruction = `You are SuperModel AI. You are using the '${primaryPack.name}' skill. ${primaryPack.system_instructions || ''} ${primaryPack.prompt_template || ''}`;
     const messages = conversationHistory.map(msg => ({ role: msg.role as 'user'|'assistant', content: msg.content }));
     
     const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: primaryPack.base_model,
            system: systemInstruction,
            messages: messages,
            max_tokens: 4096,
            stream: false,
        }),
    });
    
    if (!response.ok) {
        const errorBody = await response.json();
        const errorMsg = errorBody?.error?.message || response.statusText;
        throw new Error(`Anthropic API error: ${errorMsg}`);
    }
    const data = await response.json();
    return data.content?.[0]?.text || '';
}


/**
 * Executes pre-processing code if the skill pack is code-enhanced.
 */
async function _preprocessPrompt(skillPack: SkillPack, prompt: string): Promise<string> {
    if (skillPack.skill_type === 'code-enhanced' && skillPack.preprocessing_code) {
        try {
            const preprocess = new Function('prompt', skillPack.preprocessing_code);
            const result = preprocess(prompt);
            if (typeof result !== 'string') throw new Error("Pre-processing script did not return a string.");
            return result;
        } catch (error) {
            console.error("Error executing pre-processing code:", error);
            throw new Error(`Skill Pack Error (Pre-processing): ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return prompt;
}

/**
 * Executes post-processing code on a fully generated AI response.
 */
export const postprocessResponse = async (skillPack: SkillPack, fullResponse: string): Promise<string> => {
     if (skillPack.skill_type === 'code-enhanced' && skillPack.postprocessing_code) {
        try {
            const postprocess = new Function('response', skillPack.postprocessing_code);
            const result = postprocess(fullResponse);
            if (typeof result !== 'string') {
                throw new Error("Post-processing script did not return a string.");
            }
            return result;
        } catch (error) {
            console.error("Error executing post-processing code:", error);
            throw new Error(`Skill Pack Error (Post-processing): ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return fullResponse;
};

/**
 * Recommends the best skill for a given prompt using the Gemini API.
 */
export const recommendSkill = async (
    prompt: string,
    history: Message[],
    availableSkills: SkillPack[],
    apiKeys: ApiKeys
): Promise<string | null> => {
    const googleApiKey = apiKeys.google;
    // This function uses the user-provided Gemini key for internal routing.
    if (!googleApiKey) {
        console.error("Google API Key is not configured for skill recommendation.");
        return availableSkills.find(s => s.category === 'General')?.id || null;
    }
    if (availableSkills.length === 0) return null;

    const ai = new GoogleGenAI({ apiKey: googleApiKey });
    
    const skillList = availableSkills.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        isInstalled: s.isInstalled,
    }));

    const systemInstruction = `You are an intelligent AI task router. Your job is to analyze the user's latest prompt in the context of the recent conversation history and select the most appropriate tool (Skill Pack) to handle the request.

Prioritization Rules:
1. If an **installed** skill ('isInstalled: true') is a good fit, strongly prefer it over a non-installed one.
2. The 'General' skill (ID: 68415a52-ced4-4aeb-b1aa-01f000000000) should be used only as a last resort if no other skill is a clear match.

Respond ONLY with a JSON object containing the ID of the best skill. Do not add any extra explanation or conversational text.`;
    
    let historyText = "No previous messages in this session.";
    if (history && history.length > 0) {
        historyText = history.map(m => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.content.substring(0, 200)}...`).join('\n---\n');
    }

    const contents = `RECENT CONVERSATION HISTORY:
${historyText}

LATEST USER PROMPT: "${prompt}"

AVAILABLE TOOLS (note the 'isInstalled' status):
${JSON.stringify(skillList, null, 2)}`;


    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { skillId: { type: Type.STRING } },
                    required: ['skillId'],
                },
            },
        });

        const parsed = JSON.parse(response.text.trim());
        if (parsed?.skillId && availableSkills.some(s => s.id === parsed.skillId)) {
            return parsed.skillId;
        }
        
        return availableSkills.find(s => s.category === 'General')?.id || availableSkills[0].id;
    } catch (error) {
        console.error("Error in recommendSkill API call:", error);
        return availableSkills.find(s => s.category === 'General')?.id || availableSkills[0].id;
    }
};

/**
 * Tests the connection to a local Ollama server.
 */
export const testLocalConnection = async (url: string): Promise<{ ok: boolean, error?: string }> => {
    try {
        // We target a common info endpoint for Ollama, which is more reliable than the root.
        const testUrl = new URL(url);
        testUrl.pathname = (testUrl.pathname.endsWith('/') ? testUrl.pathname : testUrl.pathname + '/') + 'api/tags';

        const response = await fetch(testUrl.toString(), { method: 'GET' });
        
        if (response.ok) {
            return { ok: true };
        }
        
        // Fallback for non-Ollama servers: try the root URL.
        if (response.status === 404) {
             const rootResponse = await fetch(url, { method: 'GET' });
             if(rootResponse.ok) return { ok: true };
        }

        return { ok: false, error: `Server responded with status ${response.status}. Check the URL.` };
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return { ok: false, error: 'Could not connect to the server. Check the URL and ensure Ollama is running.' };
        }
        return { ok: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' };
    }
};
