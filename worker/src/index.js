import { CO2_FACTORS, computeCo2 } from "./co2-data.js";
import SUBSTITUTION_KNOWLEDGE from "./substitution-knowledge.json";

const ALLOWED_ORIGINS = new Set(["https://janssensam07-lang.github.io"]);

function corsHeaders(origin) {
  const allowOrigin =
    ALLOWED_ORIGINS.has(origin) || (origin && origin.startsWith("http://localhost"))
      ? origin
      : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function withCors(response, origin) {
  const headers = corsHeaders(origin);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

const SYSTEM_PROMPT = `Je bent een culinaire expert gespecialiseerd in het veganistisch maken van recepten.
Je vervangt dierlijke ingrediënten NOOIT door ze simpelweg weg te laten of door een plat
1-op-1 substituut (zoals "cashew in plaats van spek" zonder onderbouwing).

Redeneer in twee fasen voor elk dierlijk ingrediënt (intern — toon alleen het eindresultaat):

FASE 1 — Analyseer welke functionele rol(len) het ingrediënt in DIT specifieke recept vervult:
vet (mondgevoel/sappigheid), eiwit/binding (structuur/coagulatie), umami (hartige diepte),
zuur (frisheid/balans), vocht/emulsie, textuur/bite (knapperig/romig/taai), kleur/browning
(Maillard-reactie/karamellisatie), rokerigheid.

FASE 2 — Kies pas dán een vervanging die zoveel mogelijk van die rollen dekt. Dit mag een
COMBINATIE van twee ingrediënten zijn (bv. gerookte paprikapoeder + gebakken shiitake voor het
rokerige/umami/knapperige van spek) in plaats van één enkel substituut.

Gebruik als vertrekpunt (niet als beperking) deze kennisbank van functionele categorieën met
bewezen vegan opties: ${JSON.stringify(SUBSTITUTION_KNOWLEDGE)}
Kijk eerst of een categorie hierin aansluit bij de rollen die je in fase 1 vond, en bouw
daaromheen de concrete uitwerking. Past geen categorie goed, verzin dan zelf een functioneel
onderbouwde vervanging.

Voorbeelden van de kwaliteit die je moet leveren (functionele redenering, geen 1-op-1):

Voorbeeld 1 — Carbonara-saus (eidooier + Parmezaanse kaas): eidooier geeft eiwit/binding
(romige coagulatie) en vet; Parmezaan geeft umami en zoute hardheid. Vervanging: cashew-emulsie
(dekt vet + romige binding) gecombineerd met nutritionele gist en witte miso (dekt umami en
zoutigheid). Uitleg: "De cashew-emulsie geeft dezelfde vetrijke romigheid als eidooier, terwijl
miso en nutritionele gist de umami en zoute diepte van Parmezaan vervangen door hun
fermentatiesmaak."

Voorbeeld 2 — Spek/pancetta in een saus: geeft rokerig vet, zoute umami en knapperige textuur
bij bakken. Vervanging: gerookte paprikapoeder (dekt rokerigheid) + gemarineerde, gebakken
tempeh (dekt eiwit, umami en crunch). Uitleg: "Tempeh krijgt bij bakken een vergelijkbare
krokante bite als spek, en gerookte paprika voegt de rooksmaak toe die spek normaal geeft."

Voorbeeld 3 — Boter in gebakken groenten: geeft vet voor mondgevoel en browning. Vervanging:
kokosolie. Uitleg: "Kokosolie heeft een vergelijkbaar smeltpunt en zorgt voor dezelfde bruining
als boter, met een vergelijkbare rijkheid."

De "explanation" bij elke vervanging moet de functionele logica benoemen (welke rol(len)
behouden blijven), niet alleen "dit is een goede vervanger".

Voor ELK ingrediënt (zowel origineel als veganistisch) schat je ook het gewicht in gram voor
de gegeven portiegrootte (of 1 portie als dat niet duidelijk is), en ken je exact één
CO2-categorie toe uit deze vaste lijst: ${Object.keys(CO2_FACTORS).join(", ")}.
Kies de categorie die het ingrediënt het beste dekt; gebruik "other" alleen als niets past.

Antwoord UITSLUITEND met geldige JSON, exact volgens dit schema, zonder markdown-codeblok
en zonder tekst erbuiten:

{
  "name": "Naam van het gerecht",
  "original": {
    "ingredients": [{"text": "ingrediënt", "grams": 200, "co2Category": "pork"}],
    "steps": ["stap 1", "stap 2"]
  },
  "vegan": {
    "ingredients": [{"text": "ingrediënt", "swapped": true of false, "grams": 200, "co2Category": "tempeh"}],
    "steps": ["stap 1", "stap 2"]
  },
  "replacements": [
    {"icon": "een enkele passende emoji", "title": "Origineel ingrediënt → vervanging", "explanation": "korte culinaire uitleg waarom dit werkt"}
  ]
}

"swapped": true voor elk vegan ingrediënt dat een vervanging is van een dierlijk ingrediënt,
false voor ingrediënten die ongewijzigd blijven.`;

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function veganizeRecipeText(recipeText, env) {
  const aiResponse = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: recipeText },
    ],
    max_tokens: 2048,
  });

  const raw = typeof aiResponse.response === "string" ? aiResponse.response : JSON.stringify(aiResponse.response);
  const result = extractJson(raw || "");
  if (!result || !result.original?.ingredients || !result.vegan?.ingredients) {
    return null;
  }

  result.co2 = computeCo2(result.original.ingredients, result.vegan.ingredients);
  return result;
}

async function handleVeganize(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(Response.json({ error: "Ongeldige request-body" }, { status: 400 }), origin);
  }

  const recipeText = (body.recipeText || "").trim();
  if (!recipeText) {
    return withCors(Response.json({ error: "recipeText is verplicht" }, { status: 400 }), origin);
  }

  const result = await veganizeRecipeText(recipeText, env);
  if (!result) {
    return withCors(
      Response.json({ error: "Kon geen geldig recept genereren, probeer het opnieuw" }, { status: 502 }),
      origin
    );
  }

  return withCors(Response.json(result), origin);
}

async function handleVeganizePhoto(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(Response.json({ error: "Ongeldige request-body" }, { status: 400 }), origin);
  }

  const imageDataUrl = body.imageDataUrl || "";
  if (!imageDataUrl.startsWith("data:image/")) {
    return withCors(Response.json({ error: "imageDataUrl is verplicht" }, { status: 400 }), origin);
  }

  const visionResponse = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Transcribeer het recept op deze foto exact: naam van het gerecht, alle ingrediënten met hoeveelheden, en alle bereidingsstappen. Geef uitsluitend de platte tekst terug, geen opmaak en geen extra commentaar.",
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    max_tokens: 1024,
  });

  const recipeText = (visionResponse.choices?.[0]?.message?.content || visionResponse.response || "").trim();
  if (!recipeText) {
    return withCors(
      Response.json({ error: "Kon geen recept herkennen op de foto, probeer een duidelijkere foto" }, { status: 502 }),
      origin
    );
  }

  const result = await veganizeRecipeText(recipeText, env);
  if (!result) {
    return withCors(
      Response.json({ error: "Kon geen geldig recept genereren, probeer het opnieuw" }, { status: 502 }),
      origin
    );
  }

  return withCors(Response.json(result), origin);
}

function htmlToText(html) {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(br|p|li|tr|h[1-6])[^>]*>/gi, "\n");

  return withoutNoise
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

async function handleVeganizeLink(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return withCors(Response.json({ error: "Ongeldige request-body" }, { status: 400 }), origin);
  }

  const url = (body.url || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    return withCors(Response.json({ error: "url is verplicht" }, { status: 400 }), origin);
  }

  let pageText;
  try {
    const pageResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VeganiseerBot/1.0; +https://veganiseer-api.veganiseer.workers.dev)",
      },
    });

    if (!pageResponse.ok) {
      throw new Error(`Pagina gaf status ${pageResponse.status}`);
    }

    const html = await pageResponse.text();
    pageText = htmlToText(html).slice(0, 12000);
  } catch {
    return withCors(
      Response.json(
        { error: "Kon deze pagina niet ophalen (mogelijk blokkeert de site scraping). Plak de recepttekst zelf." },
        { status: 502 }
      ),
      origin
    );
  }

  if (pageText.length < 100) {
    return withCors(
      Response.json(
        { error: "Kon geen recept op deze pagina herkennen. Plak de recepttekst zelf." },
        { status: 502 }
      ),
      origin
    );
  }

  const result = await veganizeRecipeText(pageText, env);
  if (!result) {
    return withCors(
      Response.json({ error: "Kon geen geldig recept genereren, probeer het opnieuw" }, { status: 502 }),
      origin
    );
  }

  return withCors(Response.json(result), origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin);
    }

    if (url.pathname === "/ping") {
      return withCors(Response.json({ ok: true, service: "veganiseer-worker" }), origin);
    }

    if (url.pathname === "/veganize" && request.method === "POST") {
      return handleVeganize(request, env, origin);
    }

    if (url.pathname === "/veganize-photo" && request.method === "POST") {
      return handleVeganizePhoto(request, env, origin);
    }

    if (url.pathname === "/veganize-link" && request.method === "POST") {
      return handleVeganizeLink(request, env, origin);
    }

    return withCors(new Response("Not found", { status: 404 }), origin);
  },
};
