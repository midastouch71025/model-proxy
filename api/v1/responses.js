export const config = {
  runtime: "edge",
};

import {
  callChatCompletions,
  chatCompletionToResponseEnvelope,
  corsHeaders,
  jsonResponse,
  normalizeModel,
  optionsResponse,
  responsesInputToMessages,
  stripUnsupportedParams,
} from "../_lib/deepseek.js";

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();

    const chatBody = stripUnsupportedParams({
      model: normalizeModel(body.model),
      stream: false,
      temperature: body.temperature,
      max_tokens: body.max_output_tokens,
      tools: body.tools,
      tool_choice: body.tool_choice,
      messages: responsesInputToMessages(body.input, body.instructions),
    });

    const upstream = await callChatCompletions(chatBody, process.env);
    const text = await upstream.text();

    if (!upstream.ok) {
      return new Response(text, {
        status: upstream.status,
        headers: corsHeaders({ "Content-Type": "application/json" }),
      });
    }

    const chatPayload = JSON.parse(text);
    const responsePayload = chatCompletionToResponseEnvelope(chatPayload);
    return jsonResponse(responsePayload);
  } catch (error) {
    console.error("Responses Proxy Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
}
