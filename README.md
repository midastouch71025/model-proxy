# 🚀 DeepSeek Payload Normalization Proxy (Vercel Edition)

A high-performance, serverless proxy designed to bridge the compatibility gap between **Cursor** and the **DeepSeek API**, optimized for **Vercel Edge Functions**.

## 📖 The Problem
Modern versions of Cursor send chat messages using an array format for the `content` field. DeepSeek's API currently expects a simple **string**. This proxy normalizes the payload and handles the connection, resolving `ssrf_blocked` errors that occur when Cursor tries to reach a local proxy.

## ✨ Features
- **Vercel Edge Optimized**: Ultra-low latency global deployment.
- **Full Streaming Support**: Real-time token streaming (SSE).
- **No SSRF Blocks**: By deploying to a public URL on Vercel, Cursor can reach the proxy without security blocks.
- **Payload Normalization**: Automatically converts OpenAI-style content arrays to strings.

## 🛠️ Setup & Deployment

### 1. Local Development
```bash
npm install
npm run dev # Runs vercel dev
```

### 2. Deploy to Vercel
1.  **Push to GitHub**: Push this repository to your GitHub.
2.  **Import to Vercel**: Connect the repository to Vercel.
3.  **Set Environment Variables**: In Vercel Project Settings, add:
    - `DEEPSEEK_API_KEY`: Your DeepSeek API Key.
4.  **Deploy**: Vercel will give you a public URL (e.g., `https://your-proxy.vercel.app`).

---

## 💻 Cursor Configuration

To use the proxy with Cursor:

1.  Open **Cursor Settings** -> **Models**.
2.  Set the **Base URL** to your Vercel URL + `/v1`:
    `https://your-proxy.vercel.app/v1`
3.  Set the model name to `deepseek-chat` or `deepseek-reasoner`.

---

## 📄 License
MIT
