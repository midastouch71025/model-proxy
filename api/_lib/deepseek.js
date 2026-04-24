export const MODEL_ALIASES = {
  "deepseek-chat": "deepseek-chat",
  "deepseek-v3": "deepseek-chat",
  "deepseek-reasoner": "deepseek-reasoner",
  "deepseek-r1": "deepseek-reasoner",
  "glm-4.6": "GLM-4.6",
  "glm-4.7": "GLM-4.7",
  "glm-4.7-flash": "GLM-4.7-Flash",
};

export const MODEL_LIST = [
  createModel("deepseek-chat", "deepseek"),
  createModel("deepseek-v3", "deepseek"),
  createModel("deepseek-reasoner", "deepseek"),
  createModel("deepseek-r1", "deepseek"),
  createModel("GLM-4.6", "zhipu"),
  createModel("GLM-4.7", "zhipu"),
  createModel("GLM-4.7-Flash", "zhipu"),
];

const ALLOWED_ORIGIN = "*";
const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization";

function createModel(id, ownedBy = "deepseek") {
  return {
    id,
    object: "model",
    created: 1700000000,
    owned_by: ownedBy,
  };
}

export function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    ...extra,
  };
}

export function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders({
      "Content-Type": "application/json",
      ...extraHeaders,
    }),
  });
}

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return messages;

  return messages.map((msg) => {
    let content = msg.content;

    if (Array.isArray(content)) {
      content = content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object") {
            if (part.type === "text") return part.text || "";
            if (typeof part.text === "string") return part.text;
            return JSON.stringify(part);
          }
          return "";
        })
        .join("\n");
    }

    return { ...msg, content };
  });
}

export function getProvider(model) {
  if (!model) return "deepseek";
  return String(model).toLowerCase().startsWith("glm-") ? "glm" : "deepseek";
}

export function normalizeModel(model) {
  if (!model) return "deepseek-chat";
  const key = String(model).toLowerCase();
  return MODEL_ALIASES[key] ?? "deepseek-chat";
}

export function findModel(modelId) {
  if (!modelId) return null;
  const key = String(modelId).toLowerCase();
  return MODEL_LIST.find((model) => model.id.toLowerCase() === key) || null;
}

export function stripUnsupportedParams(body) {
  const unsupported = ["parallel_tool_calls"];
  const nextBody = { ...body };

  for (const param of unsupported) {
    delete nextBody[param];
  }

  return nextBody;
}

export function toChatCompletionsBody(body) {
  const nextBody = { ...body };
  nextBody.model = normalizeModel(body.model);
  nextBody.messages = normalizeMessages(body.messages);
  return stripUnsupportedParams(nextBody);
}

export function responsesInputToMessages(input, instructions) {
  const messages = [];

  if (typeof instructions === "string" && instructions.trim()) {
    messages.push({
      role: "system",
      content: instructions,
    });
  }

  if (typeof input === "string") {
    messages.push({
      role: "user",
      content: input,
    });
    return messages;
  }

  if (!Array.isArray(input)) {
    return messages;
  }

  for (const item of input) {
    if (!item || typeof item !== "object") continue;

    if (item.type === "message") {
      messages.push({
        role: item.role || "user",
        content: normalizeResponseContent(item.content),
      });
      continue;
    }

    if (item.role && item.content !== undefined) {
      messages.push({
        role: item.role,
        content: normalizeResponseContent(item.content),
      });
      continue;
    }

    if (item.type === "input_text" && typeof item.text === "string") {
      messages.push({
        role: "user",
        content: item.text,
      });
    }
  }

  return messages;
}

function normalizeResponseContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      if (part.type === "input_text" || part.type === "output_text") {
        return part.text || "";
      }
      if (part.type === "text") return part.text || "";
      return "";
    })
    .join("\n");
}

export async function callDeepSeekChatCompletions(body, apiKey) {
  return fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

export async function callGLMChatCompletions(body, apiKey) {
  return fetch("https://api.z.ai/api/coding/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

export async function callChatCompletions(body, env) {
  const provider = getProvider(body.model);
  if (provider === "glm") {
    if (!env.GLM_API_KEY) throw new Error("GLM_API_KEY is not set");
    return callGLMChatCompletions(body, env.GLM_API_KEY);
  }
  if (!env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not set");
  return callDeepSeekChatCompletions(body, env.DEEPSEEK_API_KEY);
}

export function chatCompletionToResponseEnvelope(chatPayload) {
  const firstChoice = Array.isArray(chatPayload.choices) ? chatPayload.choices[0] : null;
  const message = firstChoice?.message;
  const text = typeof message?.content === "string" ? message.content : "";

  return {
    id: chatPayload.id || `resp_${Date.now()}`,
    object: "response",
    created_at: chatPayload.created || Math.floor(Date.now() / 1000),
    model: chatPayload.model || "deepseek-chat",
    output: [
      {
        id: `msg_${Date.now()}`,
        type: "message",
        role: message?.role || "assistant",
        content: [
          {
            type: "output_text",
            text,
            annotations: [],
          },
        ],
      },
    ],
    output_text: text,
    usage: chatPayload.usage || undefined,
  };
}
