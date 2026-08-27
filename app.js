// ===== Dummy data: Pasta Carbonara =====
const DUMMY_RESULT = {
  name: "Pasta Carbonara",

  original: {
    ingredients: [
      "400g spaghetti",
      "200g pancetta",
      "4 eierdooiers",
      "100g Parmezaanse kaas, geraspt",
      "Versgemalen zwarte peper",
      "Zout"
    ],
    steps: [
      "Kook de spaghetti in ruim gezouten water al dente.",
      "Bak de pancetta in een droge pan tot krokant en goudbruin.",
      "Klop de eierdooiers los met de geraspte Parmezaanse kaas en veel zwarte peper.",
      "Meng de hete, uitgelekte pasta direct met de pancetta en het vet uit de pan.",
      "Haal van het vuur en roer snel het eiermengsel erdoor tot een romige saus ontstaat.",
      "Serveer direct met extra Parmezaan en peper."
    ]
  },

  vegan: {
    ingredients: [
      "400g spaghetti",
      { text: "200g gerookte tempeh of shiitake \"pancetta\"", swapped: true },
      { text: "150g geweekte cashewnoten + 2 el nutritionele gist", swapped: true },
      { text: "40g veganistische Parmezaan (of extra nutritionele gist)", swapped: true },
      "Versgemalen zwarte peper",
      "Zout",
      "Scheutje pastawater"
    ],
    steps: [
      "Kook de spaghetti in ruim gezouten water al dente, bewaar een kopje pastawater.",
      "Bak de in reepjes gesneden tempeh of shiitake krokant met een beetje rooksmaak (paprikapoeder of gerookt zout).",
      "Mix de geweekte cashewnoten met nutritionele gist, wat pastawater en peper tot een gladde, romige emulsie.",
      "Meng de hete, uitgelekte pasta direct met de tempeh/shiitake.",
      "Haal van het vuur en roer de cashew-emulsie erdoor tot een romige saus ontstaat, verdun met pastawater indien nodig.",
      "Serveer direct met veganistische Parmezaan en extra peper."
    ]
  },

  replacements: [
    {
      icon: "🥚",
      title: "Eierdooiers → cashew-emulsie",
      explanation: "Geweekte cashewnoten geven, gemixt tot een gladde pasta, dezelfde romige mondgevoel als eidooier. Nutritionele gist voegt een hartige, licht kaasachtige umami-smaak toe die de rijkheid van het ei benadert."
    },
    {
      icon: "🧀",
      title: "Parmezaanse kaas → veganistische Parmezaan / nutritionele gist",
      explanation: "Nutritionele gist heeft van nature een nootachtige, umami-rijke smaak door de gefermenteerde gist-eiwitten, wat het hartige karakter van belegen kaas goed benadert zonder zuivel."
    },
    {
      icon: "🥓",
      title: "Pancetta → gerookte tempeh of shiitake",
      explanation: "Tempeh en shiitake nemen rooksmaken goed op en krijgen bij bakken een vergelijkbare krokante bite als spek. Shiitake bevat bovendien van nature veel glutamaat, wat zorgt voor een vergelijkbare hartige umami-diepte."
    }
  ]
};

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
}

// ===== Flow: input -> loading -> result =====
function runVeganize() {
  showScreen("screen-loading");
  startLoadingCycle();

  // Simuleert verwerkingstijd; in fase 4 vervangen door een echte API-call.
  setTimeout(() => {
    stopLoadingCycle();
    renderResult(DUMMY_RESULT);
    showScreen("screen-result");
  }, 3200);
}

// ===== Event wiring =====
document.getElementById("veganize-btn").addEventListener("click", () => {
  runVeganize();
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
  runVeganize();
});

document.getElementById("restart-btn").addEventListener("click", () => {
  showScreen("screen-input");
});
