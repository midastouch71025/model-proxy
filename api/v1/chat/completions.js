export const config = {
  runtime: 'edge',
};
import {
  callChatCompletions,
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

    const response = await callChatCompletions(cleanedBody, process.env);

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, {
        status: response.status,
        headers: corsHeaders({ 'Content-Type': 'application/json' })
      });
    }

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
