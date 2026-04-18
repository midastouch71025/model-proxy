export const config = {
  runtime: "edge",
};

import { findModel, jsonResponse, optionsResponse } from "../../_lib/deepseek.js";

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const id = decodeURIComponent(url.pathname.split("/").pop() || "");
  const model = findModel(id);

  if (!model) {
    return jsonResponse({
      error: {
        message: `The model '${id}' does not exist`,
        type: "invalid_request_error",
        code: "model_not_found",
      },
    }, 404);
  }

  return jsonResponse(model);
}
