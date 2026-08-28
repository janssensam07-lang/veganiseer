const LOADING_MESSAGES = [
  "Recept wordt omgetoverd...",
  "Ingrediënten worden herkend...",
  "Slimme swaps worden bedacht...",
  "Smaken worden gebalanceerd...",
  "Veganistische versie wordt samengesteld..."
];

// ===== Gamification (localStorage) =====
const GAMIFICATION_KEY = "veganiseer_stats";
const XP_PER_RECIPE = 10;

const BADGES = [
  { id: "5_recepten", icon: "🌟", label: "5 recepten geveganiseerd", check: (s) => s.recipesCount >= 5 },
  { id: "10kg_co2", icon: "🌍", label: "10 kg CO2 bespaard", check: (s) => s.totalCo2SavedKg >= 10 },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadStats() {
  const defaults = { recipesCount: 0, xp: 0, totalCo2SavedKg: 0, streak: 0, lastVeganizedDate: null, unlockedBadges: [] };
  try {
    const raw = localStorage.getItem(GAMIFICATION_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(stats));
  } catch {
    // localStorage niet beschikbaar (privénavigatie e.d.) — sla over.
  }
}

function registerVeganizedRecipe(co2SavingsKg) {
  const stats = loadStats();
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (stats.lastVeganizedDate === yesterday) {
    stats.streak += 1;
  } else if (stats.lastVeganizedDate !== today) {
    stats.streak = 1;
  }

  stats.recipesCount += 1;
  stats.xp += XP_PER_RECIPE;
  stats.totalCo2SavedKg += Math.max(0, co2SavingsKg || 0);
  stats.lastVeganizedDate = today;

  const newBadges = BADGES.filter((b) => !stats.unlockedBadges.includes(b.id) && b.check(stats));
  stats.unlockedBadges = [...stats.unlockedBadges, ...newBadges.map((b) => b.id)];

  saveStats(stats);
  return { stats, newBadges };
}

function renderHeaderStats() {
  const stats = loadStats();
  document.getElementById("stat-streak").textContent = stats.streak;
  document.getElementById("stat-xp").textContent = stats.xp;
}

function renderGamificationSummary(xpGained, stats, newBadges) {
  const el = document.getElementById("gamification-summary");
  el.innerHTML = "";

  const chips = [
    { className: "xp-chip", html: `⭐ +${xpGained} XP` },
    { className: "streak-chip", html: `🔥 ${stats.streak} dag${stats.streak === 1 ? "" : "en"} op rij` },
  ];
  newBadges.forEach((b) => chips.push({ className: "badge-chip", html: `${b.icon} Nieuwe badge: ${b.label}` }));

  chips.forEach((chip) => {
    const span = document.createElement("span");
    span.className = `gami-chip ${chip.className}`;
    span.innerHTML = chip.html;
    el.appendChild(span);
  });
}

function launchConfetti() {
  const layer = document.getElementById("confetti-layer");
  const colors = ["#58cc02", "#ffc800", "#1cb0f6", "#ff4b4b", "#ce82ff"];

  for (let i = 0; i < 40; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), 3500);
  }
}

// ===== Screen navigation =====
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let loadingInterval = null;

function startLoadingCycle() {
  const textEl = document.getElementById("loading-text");
  let i = 0;
  textEl.textContent = LOADING_MESSAGES[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    textEl.style.opacity = 0;
    setTimeout(() => {
      textEl.textContent = LOADING_MESSAGES[i];
      textEl.style.opacity = 1;
    }, 300);
  }, 1400);
}

function stopLoadingCycle() {
  clearInterval(loadingInterval);
}

// ===== Render result screen from data =====
function renderList(el, items) {
  el.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    if (typeof item === "object" && item.swapped) {
      li.innerHTML = `<span class="swapped">${item.text}</span>`;
    } else {
      li.textContent = typeof item === "object" ? item.text : item;
    }
    el.appendChild(li);
  });
}

function renderResult(data) {
  document.getElementById("result-title").textContent = `${data.name} — Veganistisch`;
  document.getElementById("orig-name").textContent = data.name;
  document.getElementById("vegan-name").textContent = data.name;

  renderList(document.getElementById("orig-ingredients"), data.original.ingredients);
  renderList(document.getElementById("orig-steps"), data.original.steps);
  renderList(document.getElementById("vegan-ingredients"), data.vegan.ingredients);
  renderList(document.getElementById("vegan-steps"), data.vegan.steps);

  const replacementsEl = document.getElementById("replacements-list");
  replacementsEl.innerHTML = "";
  data.replacements.forEach((r) => {
    const card = document.createElement("div");
    card.className = "replacement-card";
    card.innerHTML = `
      <div class="replacement-icon">${r.icon}</div>
      <div class="replacement-body">
        <strong>${r.title}</strong>
        <p>${r.explanation}</p>
      </div>
    `;
    replacementsEl.appendChild(card);
  });

  renderMacros(data.macros);
  renderCo2(data.co2);

  const { stats, newBadges } = registerVeganizedRecipe(data.co2?.savingsKg);
  renderGamificationSummary(XP_PER_RECIPE, stats, newBadges);
  renderHeaderStats();
  launchConfetti();
}

function renderMacros(macros) {
  if (!macros) return;

  const setCell = (id, value, unit) => {
    document.getElementById(id).textContent = `${Math.round(value)}${unit}`;
  };

  setCell("macro-kcal-original", macros.original.kcal, " kcal");
  setCell("macro-kcal-vegan", macros.vegan.kcal, " kcal");
  setCell("macro-protein-original", macros.original.protein_g, " g");
  setCell("macro-protein-vegan", macros.vegan.protein_g, " g");
  setCell("macro-fat-original", macros.original.fat_g, " g");
  setCell("macro-fat-vegan", macros.vegan.fat_g, " g");
  setCell("macro-carbs-original", macros.original.carbs_g, " g");
  setCell("macro-carbs-vegan", macros.vegan.carbs_g, " g");
}

function formatKg(kg) {
  return kg.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function renderCo2(co2) {
  if (!co2) return;

  const maxKg = Math.max(co2.originalKg, co2.veganKg, 0.1);
  document.getElementById("impact-bar-original").style.width = "100%";
  document.getElementById("impact-bar-vegan").style.width = `${Math.max((co2.veganKg / maxKg) * 100, 4)}%`;
  document.getElementById("impact-value-original").textContent = `${formatKg(co2.originalKg)} kg CO₂e`;
  document.getElementById("impact-value-vegan").textContent = `${formatKg(co2.veganKg)} kg CO₂e`;

  const savingsEl = document.getElementById("impact-savings");
  if (co2.savingsKg > 0) {
    savingsEl.innerHTML = `🌍 Je bespaart <strong>${formatKg(co2.savingsKg)} kg CO₂e</strong> per portie — vergelijkbaar met <strong>${co2.savingsKm} km</strong> autorijden.`;
  } else {
    savingsEl.textContent = "🌍 Voor dit recept is er nauwelijks CO2-verschil geschat.";
  }
}

// ===== Flow: input -> loading -> result =====
const WORKER_URL = "https://veganiseer-api.veganiseer.workers.dev";

function showInputError(message) {
  const errorEl = document.getElementById("input-error");
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function hideInputError() {
  document.getElementById("input-error").hidden = true;
}

async function callVeganizeApi(path, body, errorMessage) {
  showScreen("screen-loading");
  startLoadingCycle();

  try {
    const res = await fetch(`${WORKER_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`API gaf status ${res.status}`);
    }

    const data = await res.json();
    stopLoadingCycle();
    renderResult(data);
    showScreen("screen-result");
  } catch (err) {
    stopLoadingCycle();
    showScreen("screen-input");
    showInputError(errorMessage);
    console.error(err);
  }
}

function runVeganize(recipeText) {
  hideInputError();

  if (!recipeText.trim()) {
    showInputError("Plak eerst een recept voordat je het veganiseert.");
    return;
  }

  callVeganizeApi("/veganize", { recipeText }, "Het veganiseren is mislukt. Probeer het straks nog eens.");
}

function runVeganizePhoto(imageDataUrl) {
  hideInputError();
  callVeganizeApi(
    "/veganize-photo",
    { imageDataUrl },
    "Kon geen recept herkennen op de foto. Probeer een duidelijkere foto of plak de tekst."
  );
}

function runVeganizeLink(url) {
  hideInputError();

  if (!url.trim()) {
    showInputError("Vul eerst een link naar een recept in.");
    return;
  }

  callVeganizeApi(
    "/veganize-link",
    { url },
    "Kon deze link niet verwerken (de site blokkeert mogelijk scraping). Plak de recepttekst zelf."
  );
}

// ===== Event wiring =====
document.getElementById("veganize-btn").addEventListener("click", () => {
  const recipeText = document.getElementById("recipe-input").value;
  runVeganize(recipeText);
});

document.getElementById("demo-btn").addEventListener("click", () => {
  const textarea = document.getElementById("recipe-input");
  textarea.value =
`Pasta Carbonara
Ingrediënten:
- 400g spaghetti
- 200g pancetta
- 4 eierdooiers
- 100g Parmezaanse kaas, geraspt
- Zwarte peper

Bereiding:
1. Kook de spaghetti al dente.
2. Bak de pancetta krokant.
3. Meng eierdooiers met Parmezaan.
4. Combineer alles tot een romige saus.`;
  runVeganize(textarea.value);
});

document.getElementById("link-btn").addEventListener("click", () => {
  const linkRow = document.getElementById("link-row");
  linkRow.hidden = !linkRow.hidden;
  if (!linkRow.hidden) document.getElementById("link-input").focus();
});

document.getElementById("link-submit-btn").addEventListener("click", () => {
  runVeganizeLink(document.getElementById("link-input").value);
});

document.getElementById("link-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") runVeganizeLink(event.target.value);
});

document.getElementById("photo-btn").addEventListener("click", () => {
  document.getElementById("photo-input").click();
});

document.getElementById("photo-input").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => runVeganizePhoto(reader.result);
  reader.readAsDataURL(file);
  event.target.value = "";
});

document.getElementById("restart-btn").addEventListener("click", () => {
  showScreen("screen-input");
});

renderHeaderStats();
