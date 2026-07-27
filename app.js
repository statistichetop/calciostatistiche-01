let matches = [];
let historyRows = [];
let serieA = null;
let serieAStats = null;
let serieAStatsError = null;
let serieACalendar = null;
let serieACalendarError = null;
let serieATrend = null;

const leagues = ["Serie A", "Serie B", "Serie C Girone A", "Serie C Girone B", "Serie C Girone C", "Premier League", "LaLiga", "Bundesliga", "Ligue 1", "Primeira Liga", "Eredivisie", "Süper Lig"];
const dataFiles = {
  matches: "data/partite-oggi.json",
  predictions: "data/pronostici.json",
  history: "data/storico.json",
  serieA: "data/campionati/serie-a.json",
  serieAStats: "data/statistiche-serie-a-reali.json",
  serieACalendar: "data/calendario-serie-a-2026-27.json",
  serieATrend: "data/andamento-serie-a-reale.json"
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
    const prediction = predictionsById.get(fixture.id) || {
      esiti: {
        unoXDue: "N/D",
        doppiaChance: "N/D",
        underOver15: "N/D",
        underOver25: "N/D",
        underOver35: "N/D",
        golNoGol: "N/D"
      },
      affidabilita: 0,
      motivazione: "Questa partita non ha superato la soglia statistica minima oppure non dispone di dati sufficienti.",
      consigliati: [],
      combinato: "Non disponibile"
    };

    return {
      id: fixture.id,
      hasPrediction: predictionsById.has(fixture.id),
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
  document.querySelector("#leagues-grid").innerHTML = leagues.map((league, index) => {
    const isSerieA = league === "Serie A";
    const tag = isSerieA ? "button" : "article";
    const attributes = isSerieA ? 'type="button" data-league="serie-a"' : "";
    return `
    <${tag} class="league-card ${isSerieA ? "league-card-button" : ""}" ${attributes}>
      <span class="league-number">${String(index + 1).padStart(2, "0")}</span>
      <div>
        <span class="kicker">${isSerieA ? "DATI REALI SERIE A" : "DATI DIMOSTRATIVI"}</span>
        <h3>${league}</h3>
      </div>
      <span class="league-arrow" aria-hidden="true">↗</span>
    </${tag}>`;
  }).join("");
}

function displayValue(value, suffix = "") {
  return value === null || value === undefined ? "Non disponibile" : `${value}${suffix}`;
}

function serieAStandings() {
  if (!serieAStats?.statisticheSquadre) return [];
  return [...serieAStats.statisticheSquadre]
    .map((team) => ({
      ...team,
      points: team.vittorie * 3 + team.pareggi,
      goalDifference: team.golFatti - team.golSubiti
    }))
    .sort((first, second) =>
      second.points - first.points ||
      second.goalDifference - first.goalDifference ||
      second.golFatti - first.golFatti
    );
}

function showChampionshipsOverview() {
  document.querySelector("#championships-heading").hidden = false;
  document.querySelector("#leagues-grid").hidden = false;
  document.querySelector("#serie-a-real-content").hidden = true;
}

function serieANavigation(active) {
  return `
    <div class="serie-a-tabs" aria-label="Sezioni Serie A">
      <button type="button" data-action="serie-a-table" class="${active === "classifica" ? "active" : ""}">Classifica</button>
      <button type="button" data-action="serie-a-calendar" class="${active === "calendario" ? "active" : ""}">Calendario</button>
      <button type="button" data-action="serie-a-teams" class="${active === "squadre" ? "active" : ""}">Squadre</button>
    </div>
  `;
}

function renderSerieATable() {
  const container = document.querySelector("#serie-a-real-content");
  document.querySelector("#championships-heading").hidden = true;
  document.querySelector("#leagues-grid").hidden = true;
  container.hidden = false;

  if (serieAStatsError || !Array.isArray(serieAStats?.statisticheSquadre)) {
    container.innerHTML = `
      <button class="back-button" type="button" data-action="championships-overview">← Torna ai campionati</button>
      <div class="data-error" role="alert">
        <strong>Statistiche reali della Serie A momentaneamente non disponibili.</strong>
      </div>
    `;
    return;
  }

  const standings = serieAStandings();
  container.innerHTML = `
    <button class="back-button" type="button" data-action="championships-overview">← Torna ai campionati</button>
    <div class="real-data-heading">
      <div><span class="real-data-label">DATI REALI SERIE A</span><h2>Classifica statistica</h2></div>
      <span class="count">${standings.length} squadre · ${serieAStats.numeroPartiteUtilizzate} partite analizzate</span>
    </div>
    ${serieANavigation("classifica")}
    <div class="table-shell serie-a-table-shell">
      <table class="serie-a-table">
        <thead>
          <tr>
            <th>Pos.</th><th>Squadra</th><th>PG</th><th>V</th><th>N</th><th>P</th>
            <th>GF</th><th>GS</th><th>DR</th><th>Punti</th><th>Over 1,5</th><th>Over 2,5</th><th>Gol</th>
          </tr>
        </thead>
        <tbody>
          ${standings.map((team, index) => `
            <tr>
              <td data-label="Posizione"><strong>${index + 1}</strong></td>
              <td data-label="Squadra"><button class="team-link" type="button" data-team="${encodeURIComponent(team.nome)}">${team.nome}</button></td>
              <td data-label="Partite">${team.partiteGiocate}</td>
              <td data-label="Vittorie">${team.vittorie}</td>
              <td data-label="Pareggi">${team.pareggi}</td>
              <td data-label="Sconfitte">${team.sconfitte}</td>
              <td data-label="Gol fatti">${team.golFatti}</td>
              <td data-label="Gol subiti">${team.golSubiti}</td>
              <td data-label="Differenza reti">${team.goalDifference > 0 ? "+" : ""}${team.goalDifference}</td>
              <td data-label="Punti"><strong>${team.points}</strong></td>
              <td data-label="Over 1,5">${displayValue(team.percentualeOver15, "%")}</td>
              <td data-label="Over 2,5">${displayValue(team.percentualeOver25, "%")}</td>
              <td data-label="Gol">${displayValue(team.percentualeGol, "%")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function nextSerieAMatchday() {
  const next = serieACalendar?.giornate?.find((day) =>
    day.partite.some((match) => match.stato === "futura" || match.stato === "rinviata")
  );
  return next?.numero || 38;
}

function formatCalendarDate(date) {
  if (!date) return "Data da definire";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Rome"
  }).format(new Date(`${date}T12:00:00`));
}

function renderSerieACalendar(selectedDay = nextSerieAMatchday()) {
  const container = document.querySelector("#serie-a-real-content");
  document.querySelector("#championships-heading").hidden = true;
  document.querySelector("#leagues-grid").hidden = true;
  container.hidden = false;
  if (serieACalendarError || !Array.isArray(serieACalendar?.giornate)) {
    container.innerHTML = `
      <button class="back-button" type="button" data-action="championships-overview">← Torna ai campionati</button>
      <div class="data-error" role="alert"><strong>Calendario reale della Serie A momentaneamente non disponibile.</strong></div>`;
    return;
  }
  const dayNumber = Math.min(38, Math.max(1, Number(selectedDay) || 1));
  const day = serieACalendar.giornate.find((item) => item.numero === dayNumber);
  const nextDay = nextSerieAMatchday();
  container.innerHTML = `
    <button class="back-button" type="button" data-action="championships-overview">← Torna ai campionati</button>
    <div class="real-data-heading">
      <div><span class="real-data-label">DATI REALI SERIE A</span><h2>Calendario ${serieACalendar.stagione}</h2></div>
      <span class="count">Prossima giornata: ${nextDay}</span>
    </div>
    ${serieANavigation("calendario")}
    <div class="calendar-toolbar">
      <label for="matchday-select">Seleziona giornata</label>
      <select id="matchday-select">
        ${serieACalendar.giornate.map((item) => `<option value="${item.numero}" ${item.numero === dayNumber ? "selected" : ""}>Giornata ${item.numero}</option>`).join("")}
      </select>
      ${dayNumber === nextDay ? '<strong class="next-matchday">PROSSIMA GIORNATA</strong>' : ""}
    </div>
    <div class="calendar-list">
      ${(day?.partite || []).map((match) => `
        <article class="calendar-match">
          <div><strong>${formatCalendarDate(match.data)}</strong><span>${match.orario || "Orario da definire"}</span></div>
          <p><strong>${match.squadraCasa}</strong><span>–</span><strong>${match.squadraOspite}</strong></p>
          <span class="calendar-result">${match.risultato || (match.stato === "rinviata" ? "Rinviata" : "Da disputare")}</span>
        </article>`).join("")}
    </div>`;
}

function renderSerieATeams() {
  const container = document.querySelector("#serie-a-real-content");
  const teams = serieAStandings();
  document.querySelector("#championships-heading").hidden = true;
  document.querySelector("#leagues-grid").hidden = true;
  container.hidden = false;
  container.innerHTML = `
    <button class="back-button" type="button" data-action="championships-overview">← Torna ai campionati</button>
    <div class="real-data-heading">
      <div><span class="real-data-label">DATI REALI SERIE A</span><h2>Squadre</h2></div>
      <span class="count">${teams.length} squadre</span>
    </div>
    ${serieANavigation("squadre")}
    <div class="serie-a-team-list">
      ${teams.map((team) => `<button type="button" data-team="${encodeURIComponent(team.nome)}"><span>${team.nome}</span><small>${team.partiteGiocate} partite analizzate</small></button>`).join("")}
    </div>`;
}

function recentMatchesMarkup(matches, title) {
  return `
    <article class="detail-card recent-matches-card">
      <span class="kicker">${title}</span>
      <div class="recent-matches-list">
        ${matches.map((match) => `
          <div>
            <span class="result-badge ${match.esito === "V" ? "won" : match.esito === "P" ? "lost" : ""}">${match.esito}</span>
            <span><strong>${match.avversario}</strong><small>${match.data} · ${match.campo}</small></span>
            <strong>${match.risultato}</strong>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function percentagePair(label, overValue) {
  const underValue = typeof overValue === "number" ? Math.round((100 - overValue) * 10) / 10 : null;
  return `
    <div class="percentage-pair">
      <span>${label}</span>
      <strong>Over ${displayValue(overValue, "%")}</strong>
      <strong>Under ${displayValue(underValue, "%")}</strong>
    </div>
  `;
}

function renderSerieATeam(encodedName) {
  const name = decodeURIComponent(encodedName);
  const team = serieAStats?.statisticheSquadre?.find((item) => item.nome === name);
  const trendTeam = serieATrend?.squadre?.find((item) => item.squadra === name);
  if (!team) {
    renderSerieATable();
    return;
  }

  document.querySelector("#serie-a-real-content").innerHTML = `
    <button class="back-button" type="button" data-action="serie-a-table">← Torna alla classifica</button>
    <div class="detail-hero team-detail-hero">
      <div><span class="real-data-label">DATI REALI SERIE A</span><h2>${team.nome}</h2></div>
      <div class="detail-confidence"><strong>${team.partiteGiocate}</strong><span>partite analizzate</span></div>
    </div>
    <div class="detail-grid team-stats-grid">
      ${statCard("Rendimento", "Complessivo", displayValue(team.rendimentoComplessivo, "%"), "Casa", displayValue(team.rendimentoCasa, "%"))}
      ${statCard("Rendimento trasferta", "Trasferta", displayValue(team.rendimentoTrasferta, "%"), "Punti totali", team.vittorie * 3 + team.pareggi)}
      ${statCard("Media gol", "Fatti", displayValue(team.mediaGolFatti), "Subiti", displayValue(team.mediaGolSubiti))}
      ${statCard("Media tiri", "Fatti", displayValue(team.mediaTiriFatti), "Subiti", displayValue(team.mediaTiriSubiti))}
      ${statCard("Media tiri in porta", "Fatti", displayValue(team.mediaTiriInPortaFatti), "Subiti", displayValue(team.mediaTiriInPortaSubiti))}
      ${statCard("Media calci d'angolo", "A partita", displayValue(team.mediaCalciDAngolo), "Dati disponibili", `${team.coperturaDati.partiteConCalciDAngolo}/${team.partiteGiocate}`)}
      ${recentMatchesMarkup(team.ultime5Partite, "Ultime 5 partite")}
      ${recentMatchesMarkup(team.ultime10Partite, "Ultime 10 partite")}
      <article class="detail-card percentages-card">
        <span class="kicker">Percentuali Under / Over</span>
        ${percentagePair("1,5 gol", team.percentualeOver15)}
        ${percentagePair("2,5 gol", team.percentualeOver25)}
        ${percentagePair("3,5 gol", team.percentualeOver35)}
      </article>
      <article class="detail-card percentages-card">
        <span class="kicker">Gol / No Gol</span>
        <div class="percentage-pair">
          <span>Entrambe a segno</span>
          <strong>Gol ${displayValue(team.percentualeGol, "%")}</strong>
          <strong>No Gol ${displayValue(team.percentualeNoGol, "%")}</strong>
        </div>
      </article>
      ${teamTrendMarkup(trendTeam)}
    </div>
  `;
  bindTrendPoints(name);
}

function teamTrendMarkup(teamTrend) {
  const points = teamTrend?.partite || [];
  if (!points.length) {
    return `<article class="detail-card trend-card"><span class="kicker">Andamento della squadra</span><p>Dati reali insufficienti per mostrare il grafico.</p></article>`;
  }
  const width = 760;
  const height = 280;
  const padding = 38;
  const maximum = Math.max(3, ...points.map((item) => item.puntiCumulativi));
  const x = (index) => padding + (index * (width - padding * 2)) / Math.max(1, points.length - 1);
  const y = (value) => height - padding - (value * (height - padding * 2)) / maximum;
  const line = points.map((item, index) => `${x(index)},${y(item.puntiCumulativi)}`).join(" ");
  return `
    <article class="detail-card trend-card">
      <div class="trend-heading">
        <div><span class="kicker">Andamento della squadra</span><h3>Punti cumulativi</h3></div>
        <strong>Stagione ${serieATrend?.stagioneDati || "non disponibile"}</strong>
      </div>
      <p class="trend-note">${serieATrend?.notaStagione || ""}</p>
      <div class="trend-chart-wrap">
        <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafico dei punti cumulativi">
          <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="chart-axis"/>
          <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" class="chart-axis"/>
          <polyline points="${line}" class="chart-line"/>
          ${points.map((item, index) => `<circle cx="${x(index)}" cy="${y(item.puntiCumulativi)}" r="7" tabindex="0" class="chart-point" data-trend-point="${index}"><title>Partita ${index + 1}: ${item.avversario}, ${item.risultato}, ${item.puntiCumulativi} punti totali</title></circle>`).join("")}
          <text x="${padding}" y="${height - 10}" class="chart-label">1</text>
          <text x="${width - padding}" y="${height - 10}" text-anchor="end" class="chart-label">${points.length}</text>
          <text x="10" y="${padding + 4}" class="chart-label">${maximum} pt</text>
        </svg>
      </div>
      <div class="trend-tooltip" aria-live="polite">Seleziona un punto per vedere i dettagli della partita.</div>
    </article>`;
}

function bindTrendPoints(teamName) {
  const tooltip = document.querySelector(".trend-tooltip");
  const team = serieATrend?.squadre?.find((item) => item.squadra === teamName);
  if (!tooltip || !team) return;
  document.querySelectorAll("[data-trend-point]").forEach((point) => {
    const show = () => {
      const match = team.partite[Number(point.dataset.trendPoint)];
      tooltip.innerHTML = `<strong>${match.avversario}</strong> · ${match.risultato} · ${match.puntiOttenuti} punti ottenuti · <strong>${match.puntiCumulativi} punti totali</strong>`;
    };
    point.addEventListener("pointerenter", show);
    point.addEventListener("focus", show);
    point.addEventListener("click", show);
  });
}

function renderPredictions() {
  const validPredictions = matches
    .filter((match) =>
      match.hasPrediction &&
      match.confidence >= 65 &&
      !Object.values(match.picks).includes("N/D")
    )
    .sort((first, second) => second.confidence - first.confidence);

  const countLabel = validPredictions.length === 1
    ? "1 pronostico selezionato"
    : `${validPredictions.length} pronostici selezionati`;
  document.querySelector("#view-pronostici .legend").innerHTML = `<span></span> ${countLabel} · Dati dimostrativi`;

  if (validPredictions.length === 0) {
    document.querySelector("#predictions-grid").innerHTML = `
      <article class="prediction-row">
        <div><h3>Oggi nessuna partita ha superato la soglia minima di affidabilità.</h3></div>
      </article>
    `;
    return;
  }

  document.querySelector("#predictions-grid").innerHTML = validPredictions.map((match) => `
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
    const [matchesData, predictionsData, historyData, serieAData, serieAStatsResult, calendarResult, trendResult] = await Promise.all([
      loadJson(dataFiles.matches, "partite-oggi.json"),
      loadJson(dataFiles.predictions, "pronostici.json"),
      loadJson(dataFiles.history, "storico.json"),
      loadJson(dataFiles.serieA, "campionati/serie-a.json"),
      loadJson(dataFiles.serieAStats, "statistiche-serie-a-reali.json")
        .then((data) => ({ data, error: null }))
        .catch((error) => ({ data: null, error })),
      loadJson(dataFiles.serieACalendar, "calendario-serie-a-2026-27.json")
        .then((data) => ({ data, error: null }))
        .catch((error) => ({ data: null, error })),
      loadJson(dataFiles.serieATrend, "andamento-serie-a-reale.json")
        .then((data) => ({ data, error: null }))
        .catch(() => ({ data: null }))
    ]);

    matches = mergeMatchData(
      validateArray(matchesData.partite, "partite-oggi.json"),
      validateArray(predictionsData.pronostici, "pronostici.json")
    );
    historyRows = validateArray(historyData.risultati, "storico.json");
    serieA = serieAData;
    serieAStats = serieAStatsResult.data;
    serieAStatsError = serieAStatsResult.error;
    serieACalendar = calendarResult.data;
    serieACalendarError = calendarResult.error;
    serieATrend = trendResult.data;

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
  const leagueButton = event.target.closest("[data-league]");
  const teamButton = event.target.closest("[data-team]");
  const actionButton = event.target.closest("[data-action]");
  if (matchButton) openMatch(matchButton.dataset.match);
  else if (teamButton) renderSerieATeam(teamButton.dataset.team);
  else if (leagueButton?.dataset.league === "serie-a") renderSerieATable();
  else if (actionButton?.dataset.action === "championships-overview") showChampionshipsOverview();
  else if (actionButton?.dataset.action === "serie-a-table") renderSerieATable();
  else if (actionButton?.dataset.action === "serie-a-calendar") renderSerieACalendar();
  else if (actionButton?.dataset.action === "serie-a-teams") renderSerieATeams();
  else if (viewButton) {
    if (viewButton.dataset.view === "campionati") showChampionshipsOverview();
    showView(viewButton.dataset.view);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("#matchday-select")) renderSerieACalendar(event.target.value);
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
