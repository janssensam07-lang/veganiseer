const LOADING_MESSAGES = [
  "Recept wordt geanalyseerd...",
  "Ingrediënten worden herkend...",
  "Vervangingen worden bedacht...",
  "Smaken worden afgewogen...",
  "Veganistische versie wordt samengesteld..."
];

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

  renderCo2(data.co2);
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
