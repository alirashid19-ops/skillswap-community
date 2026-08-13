/**
 * leteski AI client — calls LLMs through the Rork proxy.
 * Uses Google Gemini 2.5 Flash (fast, capable, cost-effective).
 */

const TOOLKIT_URL = process.env.EXPO_PUBLIC_TOOLKIT_URL;
const TOOLKIT_SECRET = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY;

const MODEL_ID = 'google/gemini-2.5-flash';
const CHAT_ENDPOINT = `${TOOLKIT_URL}/v2/vercel/v1/chat/completions`;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

/**
 * Send a chat completion request and return the full response.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const body = {
    model: MODEL_ID,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 800,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (TOOLKIT_SECRET) {
    headers['Authorization'] = `Bearer ${TOOLKIT_SECRET}`;
  }

  const res = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[AI] chatCompletion error', res.status, text);
    throw new Error(`AI request failed (${res.status})`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

/**
 * Stream a chat completion. Calls onChunk for each token delta.
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  onChunk: (delta: string) => void,
  options?: { temperature?: number; maxTokens?: number },
): Promise<void> {
  const body = {
    model: MODEL_ID,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 800,
    stream: true,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (TOOLKIT_SECRET) {
    headers['Authorization'] = `Bearer ${TOOLKIT_SECRET}`;
  }

  const res = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    console.error('[AI] stream error', res.status, text);
    throw new Error(`AI stream failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') return;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (delta) onChunk(delta);
      } catch {
        // skip malformed chunks
      }
    }
  }
}

/**
 * Generate a compelling skill description for teachers.
 */
export async function generateSkillDescription(
  skillTitle: string,
  category: string,
  level: string,
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a helpful assistant for leteski, a skill-exchange platform. Write compelling, friendly skill descriptions for teachers. Keep it 2-3 sentences, warm and professional. Do not use markdown or headers.',
    },
    {
      role: 'user',
      content: `Write a description for a skill listing:\nTitle: ${skillTitle}\nCategory: ${category}\nLevel: ${level}\n\nWrite an engaging description that explains what students will learn and why this teacher is great.`,
    },
  ];
  const result = await chatCompletion(messages, { temperature: 0.8, maxTokens: 200 });
  return result.trim();
}

/**
 * Generate a compelling class description for teachers.
 */
export async function generateClassDescription(
  title: string,
  category: string,
  level: string,
  sessionType: string,
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a helpful assistant for leteski, a skill-exchange platform. Write compelling class descriptions. Keep it 3-4 sentences, informative and exciting. Do not use markdown or headers.',
    },
    {
      role: 'user',
      content: `Write a class description:\nTitle: ${title}\nCategory: ${category}\nLevel: ${level}\nSession type: ${sessionType}\n\nDescribe what students will learn, the structure, and why they should join.`,
    },
  ];
  const result = await chatCompletion(messages, { temperature: 0.8, maxTokens: 250 });
  return result.trim();
}

/**
 * Generate a match insight explaining why two users are a good match.
 */
export async function generateMatchInsight(
  userName: string,
  userSkills: string[],
  matchName: string,
  matchSkills: string[],
  youCanLearn: string[],
  theyCanLearn: string[],
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a friendly matchmaker assistant for leteski, a skill-exchange platform. Explain why two people are a great match in 1-2 short sentences. Be warm, specific, and encouraging. Do not use markdown.',
    },
    {
      role: 'user',
      content: `${userName} offers: ${userSkills.join(', ') || 'N/A'}\n${matchName} offers: ${matchSkills.join(', ') || 'N/A'}\n${userName} can learn from ${matchName}: ${youCanLearn.join(', ') || 'N/A'}\n${matchName} can learn from ${userName}: ${theyCanLearn.join(', ') || 'N/A'}\n\nExplain why this is a great match in 1-2 sentences.`,
    },
  ];
  const result = await chatCompletion(messages, { temperature: 0.7, maxTokens: 120 });
  return result.trim();
}
