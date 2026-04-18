export const config = {
  runtime: 'edge',
};
import {
  callDeepSeekChatCompletions,
  corsHeaders,
  jsonResponse,
  optionsResponse,
  toChatCompletionsBody,
} from "../../_lib/deepseek.js";

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const cleanedBody = toChatCompletionsBody(body);

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

    if (!DEEPSEEK_API_KEY) {
      return jsonResponse({ error: "DEEPSEEK_API_KEY is not set" }, 500);
    }

    const response = await callDeepSeekChatCompletions(cleanedBody, DEEPSEEK_API_KEY);

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, { 
        status: response.status,
        headers: corsHeaders({ 'Content-Type': 'application/json' })
      });
    }

    // Proxy the response
    const { readable, writable } = new TransformStream();
    response.body.pipeTo(writable);

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders(),
      },
    });

  } catch (error) {
    console.error('Proxy Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
