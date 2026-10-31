import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// AI Chat proxy endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { prompt, user, context } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        fallback: true,
        message: 'No GEMINI_API_KEY configured on server. Switching to deterministic engine.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const role = user?.role || 'customer';
    const isCustomer = role === 'customer';

    const systemInstruction = `You are BrightFlow's AI Revenue Assistant for a production SaaS billing system in India.
Brand: BrightFlow
Currency: Indian Rupee (₹, INR). Use format like ₹1,20,000 or ₹4.5L / ₹1.2Cr.
Date calculations reference: Asia/Kolkata timezone.

ROLE SCOPING POLICY (CRITICAL):
- Current User: ${user?.name || 'User'} (Role: ${role}, CustomerId: ${user?.customerId || 'N/A'})
${
  isCustomer
    ? `- The user is a CUSTOMER. They MUST ONLY see information pertaining to their own account (their active subscriptions, quotations, and invoices). NEVER disclose other customers' details, total company MRR, churn rate, or company revenue to a customer. If asked, politely refuse and state that customer access is scoped strictly to their own billing portal.`
    : `- The user is ${role.toUpperCase()} (Staff or Administrator). They have full access to company-wide financial metrics, MRR, ARR, forecasts, aging reports, and churn scores.`
}

Deterministic Data Context provided by server database:
${JSON.stringify(context || {})}

Tone: Direct, professional, concise, data-focused, executive.
Format responses cleanly with markdown headings, bullet points, and tables where appropriate.
Avoid conversational filler. Provide clear answers backed by the numbers above.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const responseText = response.text || 'Unable to generate response.';
    return res.json({
      text: responseText,
      fallback: false,
    });
  } catch (error: any) {
    console.error('Gemini API Error in /api/ai/chat:', error?.message || error);
    return res.json({
      fallback: true,
      error: error?.message || 'Gemini API call failed',
    });
  }
});

// Quick action executor proxy (e.g. bulk reminders)
app.post('/api/ai/action', async (req, res) => {
  const { action, params, user } = req.body;
  if (!user || user.role === 'customer') {
    return res.status(403).json({ error: 'Permission denied' });
  }

  // Acknowledge action execution
  return res.json({
    success: true,
    action,
    message: `Action "${action}" processed successfully.`,
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BrightFlow Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
