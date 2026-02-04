import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Lightweight health endpoints to verify the server is reachable
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/", (req, res) => res.send("UbuntuBot backend running"));

// HF model test endpoint for diagnosing access/404/403 issues
app.get("/hf-test", async (req, res) => {
  const model = req.query.model || process.env.HF_MODEL;
  const hfKey = process.env.HUGGINGFACE_API_KEY;

  if (!model) return res.status(400).json({ error: "model query parameter or HF_MODEL env var required" });
  if (!hfKey) return res.status(500).json({ error: "HUGGINGFACE_API_KEY not configured Tlabe ele boloi fela " });

  try {
    // Metadata check
    const metaRes = await fetch(`https://huggingface.co/api/models/${model}`, {
      headers: { Authorization: `Bearer ${hfKey}` },
    });
    const metaText = await metaRes.text().catch(() => "");

    // Router quick inference check (non-blocking)
    let routerStatus = null;
    let routerText = null;
    try {
      const routerRes = await fetch(`https://router.huggingface.co/models/${model}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: "Hello", parameters: { max_new_tokens: 1 } }),
      });
      routerStatus = routerRes.status;
      routerText = await routerRes.text().catch(() => "");
    } catch (err) {
      routerText = String(err.message || err);
    }

    return res.json({ model, metaStatus: metaRes.status, metaText, routerStatus, routerText });
  } catch (err) {
    console.error("HF test error:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

// TEMP: In-memory users array (later replace with a database)
const users = [];


/* --------------------- SIGN-UP ROUTE --------------------- */
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  const userExists = users.find(u => u.username === username);
  if (userExists) {
    return res.status(400).json({ message: "Username already taken!" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({ username, password: hashedPassword });

  res.json({ message: "User registered successfully!" });
});

/* --------------------- AI CHAT ROUTE --------------------- */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    console.log("[backend] Received /chat request:", typeof message === 'string' ? message.slice(0, 200) : message);

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Build prompt combining system persona + user message
    const systemPrompt = `You are UbuntuBot, a Lawyer Assistant specialized in South African law. Provide clear, concise legal information focused on South African statutes, precedent and practical next steps. Make plain when information is jurisdiction-specific and when further professional help is required. You must NOT give notarized or binding legal advice — if the user needs to take legal action, recommend they consult a qualified South African attorney and offer practical steps to find one. Keep tone professional and helpful, and always end responses with the disclaimer: 'This information is for general guidance and does not constitute legal advice.'`;

    const prompt = `${systemPrompt}\n\nUser: ${message}\nAssistant:`;

    // Call Hugging Face Inference API
    const hfModel = process.env.HF_MODEL || "tiiuae/falcon-7b-instruct";
    const hfKey = process.env.HUGGINGFACE_API_KEY;
    const defaultModel = process.env.DEFAULT_HF_MODEL || "tiiuae/falcon-7b-instruct";

    if (!hfKey) {
      console.error("Missing HUGGINGFACE_API_KEY in environment");
      return res.status(500).json({ error: "AI provider not configured" });
    }

    // Models to try in order: configured model, then default/fallback model (if different), then safe public fallbacks
    const publicFallbacks = ["gpt2", "google/flan-t5-small", "bigscience/bloom-1b1"];
    const modelsToTry = hfModel === defaultModel
      ? [hfModel, ...publicFallbacks.filter(m => m !== hfModel)]
      : [hfModel, defaultModel, ...publicFallbacks.filter(m => m !== hfModel && m !== defaultModel)];

    // Endpoints to try for each model
    const endpointsForModel = (model) => [
      `https://router.huggingface.co/models/${model}`,
      `https://api-inference.huggingface.co/models/${model}`,
    ];

    let hfRes;
    let lastErrText = "";
    let usedModel = null;

    outer: for (const model of modelsToTry) {
      // Pre-flight: check if the model exists and is accessible using HF Models API
      try {
        const metaRes = await fetch(`https://huggingface.co/api/models/${model}`, {
          headers: { Authorization: `Bearer ${hfKey}` },
        });

        if (!metaRes.ok) {
          const metaText = await metaRes.text().catch(() => "");
          // If model is not found, try next model
          if (metaRes.status === 404) {
            console.warn(`HF model ${model} not found (metadata check). Trying next model.`);
            lastErrText = `(${metaRes.status}) ${metaText}`;
            continue; // try next model
          }

          // If unauthorized or forbidden, provide a clear error
          if (metaRes.status === 401 || metaRes.status === 403) {
            console.error(`Access denied for model ${model}:`, metaText);
            return res.status(502).json({ error: `HF access error ${metaRes.status}: ${metaText}. Check HUGGINGFACE_API_KEY and model permissions.` });
          }

          // For other metadata errors log and try next model
          console.warn(`HF metadata check failed for ${model}: ${metaRes.status} ${metaText}`);
          lastErrText = `(${metaRes.status}) ${metaText}`;
          continue;
        }
      } catch (metaErr) {
        console.error(`Network error checking HF model metadata for ${model}:`, metaErr.message || metaErr);
        lastErrText = `network error: ${metaErr.message || metaErr}`;
        continue; // try next model
      }

      const endpoints = endpointsForModel(model);

      for (const endpoint of endpoints) {
        try {
          console.log(`[backend] Calling HF endpoint: ${endpoint}`);
          hfRes = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 512, top_p: 0.95 }, options: { use_cache: false } }),
          });
        } catch (netErr) {
          console.error(`Network error calling HF endpoint ${endpoint}:`, netErr.message || netErr);
          lastErrText = `network error: ${netErr.message || netErr}`;
          // try next endpoint
          continue;
        }

        if (hfRes.ok) {
          console.log(`[backend] HF endpoint succeeded: ${endpoint} (model: ${model})`);
          usedModel = model;
          break outer; // success, break out of both loops
        }

        // capture error text for debugging
        const errText = await hfRes.text().catch(() => "");
        lastErrText = `(${hfRes.status}) ${errText}`;

        // if model not found (404), break to try next model
        if (hfRes.status === 404) {
          console.warn(`HF model ${model} not found at ${endpoint}; trying next model if available`);
          break; // try next model
        }

        // if the server indicates 410 (deprecated), try the next endpoint
        if (hfRes.status === 410) {
          console.warn(`HF endpoint ${endpoint} returned 410; trying next endpoint`);
          continue;
        } else {
          // non-retryable error — stop and return
          console.error("Hugging Face error:", hfRes.status, errText);
          return res.status(502).json({ error: `HF error ${hfRes.status}: ${errText}` });
        }
      }
    }

    if (!hfRes || !hfRes.ok) {
      console.error("Hugging Face failed on all endpoints and models:", lastErrText);
      return res.status(502).json({ error: `HF error: ${lastErrText}` });
    }

    const hfData = await hfRes.json();
    // HF may return an array [{ generated_text: "..." }] or { generated_text: "..." }
    const replyText = Array.isArray(hfData)
      ? hfData[0]?.generated_text || JSON.stringify(hfData)
      : hfData.generated_text || JSON.stringify(hfData);

    // Return reply and which model was used (helps with debugging and verification)
    res.json({ reply: replyText, model: usedModel || hfModel });

  } catch (error) {
    console.error("AI error:", error);
    res.status(500).json({ error: "AI request failed" });
  }
});

/* --------------------- START SERVER --------------------- */
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
