const matches = [
  {
    id: "inter-atalanta", home: "Inter", away: "Atalanta", league: "Serie A", date: "27 luglio 2026", time: "20:45",
    picks: { oneXTwo: "1", double: "1X", over15: "Over 1,5", over25: "Over 2,5", over35: "Under 3,5", goal: "Gol" },
    confidence: 78, reason: "L'Inter parte favorita per qualità offensiva e rendimento interno, ma l'Atalanta può trovare la rete.",
    form: { home5: "V V P V N", away5: "V N V P V", home10: "6V · 2N · 2P", away10: "5V · 3N · 2P" },
    totals: { home: "19 fatti · 10 subiti", away: "17 fatti · 12 subiti" },
    venue: { home: "75% vittorie in casa", away: "58% punti in trasferta" },
    rates: { over15: 84, over25: 64, over35: 38, goal: 68, noGoal: 32 },
    xg: { home: "1,92", away: "1,54", xgaHome: "0,96", xgaAway: "1,18" },
    odds: ["1,72", "3,85", "4,40"],
    advised: ["1X + Over 1,5", "Gol", "Inter segna Over 1,5"], combo: "1X + Gol · quota 2,05"
  },
  {
    id: "palermo-sampdoria", home: "Palermo", away: "Sampdoria", league: "Serie B", date: "27 luglio 2026", time: "18:30",
    picks: { oneXTwo: "1", double: "1X", over15: "Over 1,5", over25: "Under 2,5", over35: "Under 3,5", goal: "No Gol" },
    confidence: 71, reason: "Il fattore campo orienta il pronostico; si prevede una gara prudente e con pochi spazi.",
    form: { home5: "V N V V P", away5: "N P V N P", home10: "5V · 3N · 2P", away10: "2V · 4N · 4P" },
    totals: { home: "14 fatti · 8 subiti", away: "9 fatti · 13 subiti" },
    venue: { home: "68% vittorie in casa", away: "31% punti in trasferta" },
    rates: { over15: 66, over25: 42, over35: 18, goal: 44, noGoal: 56 },
    xg: { home: "1,51", away: "0,94", xgaHome: "0,82", xgaAway: "1,36" },
    odds: ["1,88", "3,30", "4,25"],
    advised: ["1X", "Under 3,5", "Palermo segna per primo"], combo: "1X + Under 3,5 · quota 1,84"
  },
  {
    id: "liverpool-tottenham", home: "Liverpool", away: "Tottenham", league: "Premier League", date: "27 luglio 2026", time: "21:00",
    picks: { oneXTwo: "1", double: "1X", over15: "Over 1,5", over25: "Over 2,5", over35: "Over 3,5", goal: "Gol" },
    confidence: 82, reason: "Due attacchi propositivi: ritmo alto e occasioni da entrambe le parti favoriscono una gara ricca di gol.",
    form: { home5: "V V V N V", away5: "V P V V N", home10: "8V · 1N · 1P", away10: "6V · 2N · 2P" },
    totals: { home: "27 fatti · 9 subiti", away: "22 fatti · 16 subiti" },
    venue: { home: "86% vittorie in casa", away: "62% punti in trasferta" },
    rates: { over15: 92, over25: 78, over35: 55, goal: 74, noGoal: 26 },
    xg: { home: "2,36", away: "1,72", xgaHome: "0,88", xgaAway: "1,44" },
    odds: ["1,55", "4,50", "5,20"],
    advised: ["Over 2,5", "Gol", "Liverpool Over 1,5"], combo: "1X + Over 2,5 + Gol · quota 2,22"
  },
  {
    id: "sociedad-villarreal", home: "Real Sociedad", away: "Villarreal", league: "LaLiga", date: "28 luglio 2026", time: "19:00",
    picks: { oneXTwo: "X", double: "1X", over15: "Under 1,5", over25: "Under 2,5", over35: "Under 3,5", goal: "No Gol" },
    confidence: 67, reason: "Squadre equilibrate e attente nella prima fase di gioco: il pareggio resta lo scenario più plausibile.",
    form: { home5: "N V P N V", away5: "V N N P V", home10: "4V · 4N · 2P", away10: "4V · 3N · 3P" },
    totals: { home: "12 fatti · 9 subiti", away: "13 fatti · 12 subiti" },
    venue: { home: "61% punti in casa", away: "48% punti in trasferta" },
    rates: { over15: 58, over25: 36, over35: 14, goal: 46, noGoal: 54 },
    xg: { home: "1,28", away: "1,17", xgaHome: "0,91", xgaAway: "1,22" },
    odds: ["2,15", "3,10", "3,60"],
    advised: ["1X", "Under 2,5", "Pareggio 1° tempo"], combo: "1X + Under 3,5 · quota 1,70"
  },
  {
    id: "dortmund-lipsia", home: "Dortmund", away: "Lipsia", league: "Bundesliga", date: "28 luglio 2026", time: "17:30",
    picks: { oneXTwo: "1", double: "12", over15: "Over 1,5", over25: "Over 2,5", over35: "Over 3,5", goal: "Gol" },
    confidence: 74, reason: "Il Dortmund ha un leggero vantaggio in casa, in una sfida con transizioni rapide e diverse occasioni.",
    form: { home5: "V V P V N", away5: "V V N P V", home10: "6V · 2N · 2P", away10: "6V · 1N · 3P" },
    totals: { home: "23 fatti · 14 subiti", away: "21 fatti · 15 subiti" },
    venue: { home: "72% vittorie in casa", away: "55% punti in trasferta" },
    rates: { over15: 88, over25: 72, over35: 49, goal: 70, noGoal: 30 },
    xg: { home: "2,01", away: "1,78", xgaHome: "1,20", xgaAway: "1,35" },
    odds: ["2,02", "3,80", "3,30"],
    advised: ["Gol", "Over 2,5", "Dortmund segna Over 1,5"], combo: "Gol + Over 2,5 · quota 1,88"
  }
];

const leagues = ["Serie A", "Serie B", "Serie C Girone A", "Serie C Girone B", "Serie C Girone C", "Premier League", "LaLiga", "Bundesliga", "Ligue 1", "Primeira Liga", "Eredivisie", "Süper Lig"];
const historyRows = [
  ["Inter – Roma", "1X + Over 1,5", "2–1", "Vinto", "1,72", "20/07/2026"],
  ["Arsenal – Chelsea", "Gol", "1–1", "Vinto", "1,65", "19/07/2026"],
  ["Milan – Napoli", "1", "0–1", "Perso", "2,10", "18/07/2026"],
  ["Barcelona – Betis", "Over 2,5", "3–1", "Vinto", "1,58", "17/07/2026"],
  ["Bayern – Mainz", "1 + Over 2,5", "2–0", "Perso", "1,90", "16/07/2026"],
  ["PSG – Lille", "1", "2–0", "Vinto", "1,48", "15/07/2026"]
];

const content = document.querySelector("#app-content");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");
const viewButtons = document.querySelectorAll("[data-view]");

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
      <div><span class="kicker">Campionato</span><h3>${league}</h3></div>
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
      <td data-label="Partita"><strong>${row[0]}</strong></td>
      <td data-label="Pronostico">${row[1]}</td>
      <td data-label="Risultato">${row[2]}</td>
      <td data-label="Esito"><span class="result-badge ${row[3] === "Vinto" ? "won" : "lost"}">${row[3]}</span></td>
      <td data-label="Quota">${row[4]}</td>
      <td data-label="Data">${row[5]}</td>
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

renderMatches();
renderLeagues();
renderPredictions();
renderHistory();
showView(["partite", "campionati", "pronostici", "storico"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "partite", false);
