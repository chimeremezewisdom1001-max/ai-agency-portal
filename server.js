import dns from 'dns';
dns.setDefaultResultOrder('ipv4first'); // Force Node.js to prioritize IPv4

import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const dbQuery = (text, params) => pool.query(text, params);

// Helper function to fetch Gemini with an automatic retry loop on network timeouts
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`[Network Warning] Connection dropped. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// 1. Chat logic with Gemini API
app.post('/api/chat', async (req, res) => {
  try {
    const { message, subdomain } = req.body;
    console.log(`\n[Incoming Chat Request] Subdomain: "${subdomain}" | Message: "${message}"`);

    const tenantRes = await dbQuery(
      'SELECT * FROM "Tenant" WHERE "subdomain" = $1 LIMIT 1',
      [subdomain]
    );
    const tenant = tenantRes.rows[0];

    if (!tenant) {
      console.log(`[Database Alert] Subdomain "${subdomain}" not found.`);
      return res.status(404).json({ error: 'Tenant workspace not found in database.' });
    }

    console.log(`[Database Success] Found Tenant: "${tenant.name}"`);

    // DYNAMIC KEY SELECTOR: Use tenant's custom key if they provided one, otherwise use your master key
    const activeApiKey = tenant.customGeminiKey || process.env.GEMINI_API_KEY;
    const isUsingCustomKey = tenant.customGeminiKey ? "Tenant's Custom Key" : "Master Host Key";
    console.log(`[Security Alert] Querying Gemini API using: ${isUsingCustomKey}`);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeApiKey}`;

    const apiPayload = {
      contents: [{
        role: 'user',
        parts: [
          { text: `System Instructions: ${tenant.systemPrompt}` },
          { text: `User message: ${message}` }
        ]
      }]
    };

    const response = await fetchWithRetry(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload),
    });

    const data = await response.json();
    console.log("[Google Gemini API Raw Response]:", JSON.stringify(data, null, 2));

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I am having trouble connecting to my brain right now.";

    return res.json({ reply: replyText });

  } catch (error) {
    console.error("[Server Catch Error]:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Save Lead Tickets
app.post('/api/ticket', async (req, res) => {
  try {
    const { name, phone, details, subdomain } = req.body;

    const tenantRes = await dbQuery('SELECT id FROM "Tenant" WHERE "subdomain" = $1 LIMIT 1', [subdomain]);
    const tenant = tenantRes.rows[0];

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await dbQuery(
      'INSERT INTO "Ticket" ("tenantId", "name", "phone", "details") VALUES ($1, $2, $3, $4)',
      [tenant.id, name, phone, details]
    );

    return res.json({ success: true, message: 'Lead captured!' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to save lead' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
