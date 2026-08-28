const ALLOWED_ORIGIN = "https://janssensam07-lang.github.io";

function withCors(response) {
  response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    // Health-check om te bevestigen dat de Worker gekoppeld en deploybaar is.
    // De echte veganiseer-route (Claude API-aanroep) komt in fase 4.
    if (url.pathname === "/ping") {
      return withCors(Response.json({ ok: true, service: "veganiseer-worker" }));
    }

    return withCors(new Response("Not found", { status: 404 }));
  },
};
