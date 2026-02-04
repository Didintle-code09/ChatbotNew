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

    // Allow an optional model override from the client for testing (e.g., { model: 'openai/gpt-oss-120b:fireworks-ai' })
    const requestedModel = req.body?.model;
    if (requestedModel && !modelsToTry.includes(requestedModel)) {
      modelsToTry.unshift(requestedModel);
      console.log(`[backend] Model override requested by client: ${requestedModel}`);
    }

    // We'll use the Router chat-completions endpoint with a messages array (OpenAI-style) which
    // supports system/user/assistant roles and cleaner continuations for longer outputs.
    const routerChatEndpoint = "https://router.huggingface.co/v1/chat/completions";

    let lastErrText = "";
    let usedModel = null;

    for (const model of modelsToTry) {
      // Pre-flight: check if the model exists and is accessible using HF Models API
      try {
        const metaRes = await fetch(`https://huggingface.co/api/models/${model}`, {
          headers: { Authorization: `Bearer ${hfKey}` },
        });

        if (!metaRes.ok) {
          const metaText = await metaRes.text().catch(() => "");
          if (metaRes.status === 404) {
            console.warn(`HF model ${model} not found (metadata check). Trying next model.`);
            lastErrText = `(${metaRes.status}) ${metaText}`;
            continue; // try next model
          }

          if (metaRes.status === 401 || metaRes.status === 403) {
            console.error(`Access denied for model ${model}:`, metaText);
            return res.status(502).json({ error: `HF access error ${metaRes.status}: ${metaText}. Check HUGGINGFACE_API_KEY and model permissions.` });
          }

          console.warn(`HF metadata check failed for ${model}: ${metaRes.status} ${metaText}`);
          lastErrText = `(${metaRes.status}) ${metaText}`;
          continue;
        }
      } catch (metaErr) {
        console.error(`Network error checking HF model metadata for ${model}:`, metaErr.message || metaErr);
        lastErrText = `network error: ${metaErr.message || metaErr}`;
        continue; // try next model
      }

      // Build messages array like your working snippet
      const messagesPayload = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ];

      try {
        console.log(`[backend] Calling HF Router chat-completions with model ${model}`);
        let hfRes = await fetch(routerChatEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, messages: messagesPayload, max_tokens: 1024, temperature: 0.7 }),
        });

        if (!hfRes.ok) {
          const errText = await hfRes.text().catch(() => "");
          lastErrText = `(${hfRes.status}) ${errText}`;

          // Try next model for 404/410
          if (hfRes.status === 404 || hfRes.status === 410) {
            console.warn(`Router returned ${hfRes.status} for model ${model}; trying next model if available`);
            continue;
          }

          // Unauthorized / forbidden should be surfaced clearly
          if (hfRes.status === 401 || hfRes.status === 403) {
            return res.status(502).json({ error: `HF access error ${hfRes.status}: ${errText}. Check HUGGINGFACE_API_KEY and model permissions.` });
          }

          // Other errors - return details
          return res.status(502).json({ error: `HF router error ${hfRes.status}: ${errText}`, hfStatus: hfRes.status, hfBody: errText });
        }

        // Parse router chat response
        const data = await hfRes.json();
        const firstChoice = data?.choices && data.choices[0] ? data.choices[0] : null;
        let reply = firstChoice?.message?.content ?? firstChoice?.text ?? (data?.generated_text ?? "");
        let finishReason = firstChoice?.finish_reason ?? null;

        // If reply exists, attempt continuation automatically up to 3 times if truncated
        let continuationAttempts = 0;
        while (finishReason === "length" && continuationAttempts < 3) {
          continuationAttempts++;
          console.log(`[backend] Continuation attempt ${continuationAttempts} for model ${model}`);

          const contMessages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
            { role: "assistant", content: reply },
            { role: "user", content: "Continue from where you left off. Keep the same formatting." },
          ];

          const contRes = await fetch(routerChatEndpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ model, messages: contMessages, max_tokens: 1024 }),
          });

          if (!contRes.ok) break; // stop trying continuation

          const contData = await contRes.json().catch(() => null);
          const contChoice = contData?.choices && contData.choices[0] ? contData.choices[0] : null;
          const contReply = contChoice?.message?.content ?? contChoice?.text ?? "";
          finishReason = contChoice?.finish_reason ?? null;

          if (!contReply) break;

          reply = `${reply}\n\n${contReply}`;
        }

        // Success — return reply and model
        usedModel = model;
        return res.json({ reply, model: usedModel });

      } catch (netErr) {
        console.error(`Network error calling HF router chat for model ${model}:`, netErr.message || netErr);
        lastErrText = `network error: ${netErr.message || netErr}`;
        continue; // try next model
      }
    }

    // If we get here, nothing worked for any model
    console.error("Hugging Face failed on all models:", lastErrText);
    if (process.env.DEV_MOCK === "true") {
      console.warn("DEV_MOCK enabled - returning mock reply instead of error");
      return res.json({ reply: "MOCK: I couldn't reach the AI provider, but I can still help with basic info. Try asking 'How do I file a complaint?'", model: "mock" });
    }

    return res.status(502).json({ error: `HF error: ${lastErrText}`, hfStatus: null, hfBody: lastErrText });

  } catch (error) {
    console.error("AI error:", error);
    res.status(500).json({ error: "AI request failed" });
  }
});

/* --------------------- START SERVER --------------------- */
const server = app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

// Diagnostics: log uncaught errors and exits to help root-cause intermittent exit
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason);
});
process.on('exit', (code) => {
  console.error('Process exit with code', code);
});

// Optional: gracefully close server on SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});
