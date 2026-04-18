export const config = {
  runtime: "edge",
};

import { MODEL_LIST, jsonResponse, optionsResponse } from "../_lib/deepseek.js";

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  return jsonResponse({
    object: "list",
    data: MODEL_LIST,
  });
}
