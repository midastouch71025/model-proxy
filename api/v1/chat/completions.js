export const config = {
  runtime: 'edge',
};

/**
 * Normalizes a list of messages by converting any content arrays into strings.
 */
function normalizeMessages(messages) {
    if (!Array.isArray(messages)) return messages;

    return messages.map(msg => {
        let content = msg.content;

        if (Array.isArray(content)) {
            content = content
                .map(part => {
                    if (typeof part === 'string') return part;
                    if (part && typeof part === 'object') {
                        if (part.type === 'text') return part.text || '';
                        if (part.text) return part.text;
                        return JSON.stringify(part);
                    }
                    return '';
                })
                .join('\n');
            
            console.log(`Normalized content array to string (${content.length} chars)`);
        }

        return { ...msg, content };
    });
}

/**
 * Removes parameters that DeepSeek might not support.
 */
function stripUnsupportedParams(body) {
    const unsupported = ["parallel_tool_calls"];
    const newBody = { ...body };
    unsupported.forEach(param => delete newBody[param]);
    return newBody;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    
    // Normalize messages
    body.messages = normalizeMessages(body.messages);
    
    // Clean up parameters
    const cleanedBody = stripUnsupportedParams(body);

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

    if (!DEEPSEEK_API_KEY) {
        return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY is not set' }), { status: 500 });
    }

    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(cleanedBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
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
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Proxy Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
