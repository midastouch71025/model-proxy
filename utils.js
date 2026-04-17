/**
 * Normalizes a list of messages by converting any content arrays into strings.
 * This fixes the incompatibility where Cursor sends content arrays but DeepSeek expects strings.
 */
function normalizeMessages(messages) {
    if (!Array.isArray(messages)) return messages;

    return messages.map(msg => {
        let content = msg.content;

        if (Array.isArray(content)) {
            // Extract text parts and join them
            content = content
                .map(part => {
                    if (typeof part === 'string') return part;
                    if (part && typeof part === 'object') {
                        if (part.type === 'text') return part.text || '';
                        if (part.text) return part.text;
                        // Fallback for other structured parts (e.g., images/tools)
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
 * Removes parameters that DeepSeek might not support or that might cause issues.
 */
function stripUnsupportedParams(body) {
    const unsupported = ["parallel_tool_calls"];
    const newBody = { ...body };
    unsupported.forEach(param => delete newBody[param]);
    return newBody;
}

module.exports = { normalizeMessages, stripUnsupportedParams };
