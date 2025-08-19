import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "1mb" }));

// === CONFIG ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;  // BotFather token
const TELEGRAM_CHAT  = process.env.TELEGRAM_CHAT;   // your chat id
const CREATOR        = "82kez8auz13okvfvuZkLfSJhLRFjhMPVK1i25D5gDrjY";

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) {
  console.warn("Set TELEGRAM_TOKEN and TELEGRAM_CHAT env vars on Render.");
}

async function notify(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT,
      text,
      disable_web_page_preview: true
    })
  });
}

// Helius will POST here
app.post("/helius", async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];

    for (const ev of events) {
      // Preferred: decoded pump.fun event
      const pf = ev?.events?.pumpFun;
      if (pf?.eventType === "create" && pf?.creator === CREATOR) {
        const { mint, name, symbol } = pf;
        await notify(
          `🆕 New Pump.fun token by followed creator\n` +
          `Name: ${name ?? "N/A"} (${symbol ?? "N/A"})\n` +
          `Mint: ${mint}\n` +
          `Link: https://pump.fun/${mint}`
        );
        continue;
      }

      // Fallback: detect via logs if decoded event missing
      const logs = ev?.meta?.logMessages || ev?.logs || [];
      const accounts = ev?.transaction?.message?.accountKeys || [];
      const looksLikeCreate = Array.isArray(logs) &&
        logs.some(l => typeof l === "string" && l.toLowerCase().includes("event: create"));

      if (looksLikeCreate && accounts.includes(CREATOR)) {
        const mint =
          ev?.events?.token?.mint ||
          ev?.tokenTransfers?.[0]?.mint ||
          ev?.transaction?.meta?.postTokenBalances?.[0]?.mint ||
          "unknown";
        await notify(
          `🆕 New Pump.fun token (logs) by followed creator\n` +
          `Mint: ${mint}\n` +
          `Link: https://pump.fun/${mint}`
        );
      }
    }
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.get("/", (_req, res) => res.send("OK"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Listening on", PORT));
