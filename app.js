let matches = [];
let historyRows = [];
let serieA = null;

const leagues = ["Serie A", "Serie B", "Serie C Girone A", "Serie C Girone B", "Serie C Girone C", "Premier League", "LaLiga", "Bundesliga", "Ligue 1", "Primeira Liga", "Eredivisie", "Süper Lig"];
const dataFiles = {
  matches: "data/partite-oggi.json",
  predictions: "data/pronostici.json",
  history: "data/storico.json",
  serieA: "data/campionati/serie-a.json"
};

const content = document.querySelector("#app-content");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");

async function loadJson(path, label) {
  let response;
  try {
    response = await fetch(path, { cache: "no-store" });
  } catch {
    throw new Error(`Impossibile caricare ${label}. Controlla la connessione o avvia il sito tramite un server locale.`);
  }

  if (!response.ok) {
    throw new Error(`Il file ${label} non è disponibile (errore ${response.status}).`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Il file ${label} contiene dati JSON non validi.`);
  }
}

function validateArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`Il file ${label} non contiene l'elenco previsto.`);
  return value;
}

function mergeMatchData(fixtures, predictions) {
  const predictionsById = new Map(predictions.map((prediction) => [prediction.partitaId, prediction]));

  return fixtures.map((fixture) => {
    const prediction = predictionsById.get(fixture.id);
    if (!prediction) throw new Error(`Manca il pronostico dimostrativo per ${fixture.casa} – ${fixture.trasferta}.`);

    return {
      id: fixture.id,
      home: fixture.casa,
      away: fixture.trasferta,
      league: fixture.campionato,
      date: fixture.data,
      time: fixture.orario,
      picks: {
        oneXTwo: prediction.esiti.unoXDue,
        double: prediction.esiti.doppiaChance,
        over15: prediction.esiti.underOver15,
        over25: prediction.esiti.underOver25,
        over35: prediction.esiti.underOver35,
        goal: prediction.esiti.golNoGol
      },
      confidence: prediction.affidabilita,
      reason: prediction.motivazione,
      form: {
        home5: fixture.statistiche.forma.casa5,
        away5: fixture.statistiche.forma.trasferta5,
        home10: fixture.statistiche.forma.casa10,
        away10: fixture.statistiche.forma.trasferta10
      },
      totals: {
        home: fixture.statistiche.gol.casa,
        away: fixture.statistiche.gol.trasferta
      },
      venue: {
        home: fixture.statistiche.rendimento.casa,
        away: fixture.statistiche.rendimento.trasferta
      },
      rates: {
        over15: fixture.statistiche.percentuali.over15,
        over25: fixture.statistiche.percentuali.over25,
        over35: fixture.statistiche.percentuali.over35,
        goal: fixture.statistiche.percentuali.gol,
        noGoal: fixture.statistiche.percentuali.noGol
      },
      xg: {
        home: fixture.statistiche.xg.casa,
        away: fixture.statistiche.xg.trasferta,
        xgaHome: fixture.statistiche.xg.xgaCasa,
        xgaAway: fixture.statistiche.xg.xgaTrasferta
      },
      odds: [fixture.statistiche.quote.uno, fixture.statistiche.quote.ics, fixture.statistiche.quote.due],
      advised: prediction.consigliati,
      combo: prediction.combinato
    };
  });
}

function showDataError(message) {
  document.querySelectorAll(".app-view").forEach((view) => {
    view.hidden = view.dataset.page !== "partite";
  });
  document.querySelector("#matches-grid").innerHTML = `
    <div class="data-error" role="alert">
      <strong>Dati non disponibili</strong>
      <p>${message}</p>
      <p>Verifica i file nella cartella <code>data</code> e ricarica la pagina.</p>
    </div>
  `;
}

function pickMarkup(label, value) {
  return `<div class="pick"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderMatches() {
  document.querySelector("#matches-grid").innerHTML = matches.map((match) => `
    <article class="match-card">
      <div class="match-top">
        <span class="competition">${match.league}</span>
        <span class="match-date">${match.date} · <strong>${match.time}</strong></span>
      </div>
      <div class="teams">
        <span class="team">${match.home}</span><span class="versus" aria-label="contro">VS</span><span class="team">${match.away}</span>
      </div>
      <div class="picks expanded-picks" aria-label="Pronostici">
        ${pickMarkup("Esito 1X2", match.picks.oneXTwo)}
        ${pickMarkup("Doppia chance", match.picks.double)}
        ${pickMarkup("U/O 1,5", match.picks.over15)}
        ${pickMarkup("U/O 2,5", match.picks.over25)}
        ${pickMarkup("U/O 3,5", match.picks.over35)}
        ${pickMarkup("Gol / No Gol", match.picks.goal)}
      </div>
      <div class="card-bottom">
        <p class="reason">${match.reason}</p>
        <div class="confidence" aria-label="Affidabilità ${match.confidence} percento">
          <div class="confidence-row"><strong>${match.confidence}%</strong><span>affidabilità</span></div>
          <div class="confidence-bar" aria-hidden="true"><i style="width:${match.confidence}%"></i></div>
        </div>
      </div>
      <button class="analysis-button" type="button" data-match="${match.id}">Analizza partita <span aria-hidden="true">→</span></button>
    </article>
  `).join("");
}

function renderLeagues() {
  document.querySelector("#leagues-grid").innerHTML = leagues.map((league, index) => `
    <article class="league-card">
      <span class="league-number">${String(index + 1).padStart(2, "0")}</span>
      <div>
        <span class="kicker">${league === serieA?.nome ? `${serieA.paese} · ${serieA.stagione}` : "Campionato"}</span>
        <h3>${league}</h3>
      </div>
      <span class="league-arrow" aria-hidden="true">↗</span>
    </article>
  `).join("");
}

function renderPredictions() {
  document.querySelector("#predictions-grid").innerHTML = matches.map((match) => `
    <article class="prediction-row">
      <div><span class="competition">${match.league}</span><h3>${match.home} – ${match.away}</h3></div>
      <div class="prediction-pills"><span>${match.picks.oneXTwo}</span><span>${match.picks.over25}</span><span>${match.picks.goal}</span></div>
      <strong>${match.confidence}%</strong>
      <button type="button" data-match="${match.id}" class="text-button">Dettagli →</button>
    </article>
  `).join("");
}

function renderHistory() {
  document.querySelector("#history-body").innerHTML = historyRows.map((row) => `
    <tr>
      <td data-label="Partita"><strong>${row.partita}</strong></td>
      <td data-label="Pronostico">${row.pronostico}</td>
      <td data-label="Risultato">${row.risultatoFinale}</td>
      <td data-label="Esito"><span class="result-badge ${row.esito === "Vinto" ? "won" : "lost"}">${row.esito}</span></td>
      <td data-label="Quota">${row.quota}</td>
      <td data-label="Data">${row.data}</td>
    </tr>
  `).join("");
}

function statCard(title, leftLabel, leftValue, rightLabel, rightValue) {
  return `<article class="detail-card"><span class="kicker">${title}</span><div class="split-stat"><div><span>${leftLabel}</span><strong>${leftValue}</strong></div><div><span>${rightLabel}</span><strong>${rightValue}</strong></div></div></article>`;
}

function rateBar(label, value) {
  return `<div class="rate-row"><span>${label}</span><div><i style="width:${value}%"></i></div><strong>${value}%</strong></div>`;
}

function renderDetail(match) {
  document.querySelector("#match-detail").innerHTML = `
    <button class="back-button" type="button" data-view="partite">← Torna alle partite</button>
    <div class="detail-hero">
      <div><span class="eyebrow">${match.league} · ${match.date} · ${match.time}</span><h2>${match.home} <em>VS</em> ${match.away}</h2></div>
      <div class="detail-confidence"><strong>${match.confidence}%</strong><span>affidabilità</span></div>
    </div>
    <div class="detail-grid">
      ${statCard("Ultime 5 partite", match.home, match.form.home5, match.away, match.form.away5)}
      ${statCard("Ultime 10 · V / N / P", match.home, match.form.home10, match.away, match.form.away10)}
      ${statCard("Gol fatti e subiti", match.home, match.totals.home, match.away, match.totals.away)}
      ${statCard("Casa e trasferta", match.home, match.venue.home, match.away, match.venue.away)}
      <article class="detail-card rates-card">
        <span class="kicker">Percentuali Under / Over e Gol</span>
        ${rateBar("Over 1,5", match.rates.over15)}
        ${rateBar("Over 2,5", match.rates.over25)}
        ${rateBar("Over 3,5", match.rates.over35)}
        ${rateBar("Gol", match.rates.goal)}
        ${rateBar("No Gol", match.rates.noGoal)}
      </article>
      <article class="detail-card">
        <span class="kicker">Expected goals · Demo</span>
        <div class="metric-grid">
          <div><span>xG ${match.home}</span><strong>${match.xg.home}</strong></div>
          <div><span>xGA ${match.home}</span><strong>${match.xg.xgaHome}</strong></div>
          <div><span>xG ${match.away}</span><strong>${match.xg.away}</strong></div>
          <div><span>xGA ${match.away}</span><strong>${match.xg.xgaAway}</strong></div>
        </div>
      </article>
      <article class="detail-card odds-card">
        <span class="kicker">Quote 1X2 · Demo</span>
        <div class="odds"><div><span>1</span><strong>${match.odds[0]}</strong></div><div><span>X</span><strong>${match.odds[1]}</strong></div><div><span>2</span><strong>${match.odds[2]}</strong></div></div>
      </article>
      <article class="detail-card recommendations">
        <span class="kicker">3 pronostici consigliati</span>
        <ol>${match.advised.map((item) => `<li>${item}</li>`).join("")}</ol>
      </article>
      <article class="detail-card combo-card">
        <span class="kicker">Pronostico combinato</span><strong>${match.combo}</strong>
      </article>
      <article class="detail-card explanation-card">
        <span class="kicker">Spiegazione dettagliata</span>
        <h3>La lettura della partita</h3>
        <p>${match.reason} I valori dimostrativi delle ultime dieci gare indicano una maggiore continuità della squadra di casa, mentre il confronto tra xG e xGA suggerisce occasioni per entrambe. Le percentuali offensive sostengono i mercati consigliati, ma il dato casa/trasferta invita a coprire l'esito principale.</p>
        <p class="demo-warning">Questa analisi utilizza esclusivamente dati inventati a scopo dimostrativo.</p>
      </article>
    </div>
    <button class="back-button bottom-back" type="button" data-view="partite">← Torna alle partite</button>
  `;
}

function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  navigation.classList.remove("open");
  document.body.classList.remove("menu-open");
}

function showView(name, updateHash = true) {
  document.querySelectorAll(".app-view").forEach((view) => {
    const active = view.dataset.page === name;
    view.hidden = !active;
    view.classList.toggle("active-view", active);
  });
  navigation.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  closeMenu();
  if (updateHash) window.history.replaceState(null, "", `#${name}`);
  content.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openMatch(id) {
  const match = matches.find((item) => item.id === id);
  if (!match) return;
  renderDetail(match);
  showView("dettaglio");
}

async function initializeApp() {
  try {
    const [matchesData, predictionsData, historyData, serieAData] = await Promise.all([
      loadJson(dataFiles.matches, "partite-oggi.json"),
      loadJson(dataFiles.predictions, "pronostici.json"),
      loadJson(dataFiles.history, "storico.json"),
      loadJson(dataFiles.serieA, "campionati/serie-a.json")
    ]);

    matches = mergeMatchData(
      validateArray(matchesData.partite, "partite-oggi.json"),
      validateArray(predictionsData.pronostici, "pronostici.json")
    );
    historyRows = validateArray(historyData.risultati, "storico.json");
    serieA = serieAData;

    renderMatches();
    renderLeagues();
    renderPredictions();
    renderHistory();
    showView(["partite", "campionati", "pronostici", "storico"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "partite", false);
  } catch (error) {
    console.error("Errore nel caricamento dei dati:", error);
    showDataError(error.message);
  }
}

menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  navigation.classList.toggle("open", !open);
  document.body.classList.toggle("menu-open", !open);
});

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  const matchButton = event.target.closest("[data-match]");
  if (matchButton) openMatch(matchButton.dataset.match);
  else if (viewButton) showView(viewButton.dataset.view);
});

window.addEventListener("resize", () => { if (window.innerWidth > 820) closeMenu(); });
window.addEventListener("popstate", () => {
  const requested = location.hash.slice(1);
  if (["partite", "campionati", "pronostici", "storico"].includes(requested)) showView(requested, false);
});

document.querySelector("#last-update").textContent = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
}).format(new Date()).replace(" alle", " ·");

initializeApp();
