const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");

initializeApp();

// Health-check om te bevestigen dat Functions gekoppeld en deploybaar is.
// De echte veganiseer-functie (Claude API-aanroep) komt in fase 4.
exports.ping = onRequest((req, res) => {
  res.json({ ok: true, service: "veganiseer-functions" });
});
