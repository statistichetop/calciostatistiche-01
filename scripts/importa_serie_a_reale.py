"""Importazione manuale e isolata dei dati pubblici della Serie A."""

from __future__ import annotations

import csv
import io
import json
import re
from datetime import datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


PAGINA_RISULTATI = "https://www.football-data.co.uk/italym.php"
PAGINA_FUTURE = "https://www.football-data.co.uk/matches_new_leagues.php"
OUTPUT = Path("data/test-serie-a-reale.json")
FUSO_ROMA = ZoneInfo("Europe/Rome")
CODICE_SERIE_A = "I1"
MASSIMO_RISULTATI = 100
GIORNI_FUTURI = 14
TIMEOUT_SECONDI = 30
USER_AGENT = "StatisticheCalcio/1.0 (+importazione manuale dati pubblici)"

ALIAS = {
    "divisione": ["Div", "Division", "League", "LeagueCode"],
    "data": ["Date", "MatchDate"],
    "orario": ["Time", "KickOff", "Kickoff", "KO"],
    "casa": ["HomeTeam", "Home", "Home Team"],
    "trasferta": ["AwayTeam", "Away", "Away Team"],
    "golCasa": ["FTHG", "HG", "HomeGoals"],
    "golTrasferta": ["FTAG", "AG", "AwayGoals"],
    "risultato": ["FTR", "Result", "FullTimeResult"],
    "tiriCasa": ["HS", "HomeShots"],
    "tiriTrasferta": ["AS", "AwayShots"],
    "tiriPortaCasa": ["HST", "HomeShotsTarget", "HomeShotsOnTarget"],
    "tiriPortaTrasferta": ["AST", "AwayShotsTarget", "AwayShotsOnTarget"],
    "angoliCasa": ["HC", "HomeCorners"],
    "angoliTrasferta": ["AC", "AwayCorners"],
    "quota1": ["AvgH", "B365H", "PSH", "WHH", "BWH", "MaxH"],
    "quotaX": ["AvgD", "B365D", "PSD", "WHD", "BWD", "MaxD"],
    "quota2": ["AvgA", "B365A", "PSA", "WHA", "BWA", "MaxA"],
}


class LinkCsvParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href and ".csv" in href.lower():
            self.links.append(href)


def scarica_testo(url: str) -> str:
    richiesta = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,text/csv,*/*"})
    with urlopen(richiesta, timeout=TIMEOUT_SECONDI) as risposta:
        contenuto = risposta.read()
        tipo = risposta.headers.get_content_charset() or "utf-8"
    try:
        return contenuto.decode(tipo)
    except UnicodeDecodeError:
        return contenuto.decode("latin-1")


def trova_csv(pagina: str, solo_serie_a: bool) -> list[str]:
    parser = LinkCsvParser()
    parser.feed(scarica_testo(pagina))
    urls = {urljoin(pagina, link) for link in parser.links}
    if solo_serie_a:
        urls = {
            url for url in urls
            if re.search(r"(?:^|/)I1\.csv(?:$|\?)", urlparse(url).path, re.IGNORECASE)
        }
    return sorted(urls)


def normalizza_intestazione(nome: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", (nome or "").lstrip("\ufeff").lower())


def mappa_colonne(intestazioni: list[str]) -> dict[str, str | None]:
    disponibili = {normalizza_intestazione(nome): nome for nome in intestazioni if nome}
    return {
        campo: next(
            (disponibili[normalizza_intestazione(alias)] for alias in aliases if normalizza_intestazione(alias) in disponibili),
            None,
        )
        for campo, aliases in ALIAS.items()
    }


def leggi_valore(riga: dict[str, str], colonne: dict[str, str | None], campo: str) -> str | None:
    colonna = colonne.get(campo)
    if not colonna:
        return None
    testo = (riga.get(colonna) or "").strip()
    return testo or None


def numero(testo: str | None, intero: bool = False) -> int | float | None:
    if testo is None:
        return None
    try:
        valore = float(testo.replace(",", "."))
        return int(valore) if intero and valore.is_integer() else valore
    except ValueError:
        return None


def analizza_data(testo: str | None, orario: str | None) -> datetime | None:
    if not testo:
        return None
    data = None
    for formato in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d", "%d-%m-%Y", "%d-%m-%y"):
        try:
            data = datetime.strptime(testo.strip(), formato)
            break
        except ValueError:
            continue
    if data is None:
        return None
    if orario:
        for formato_ora in ("%H:%M", "%H.%M"):
            try:
                ora = datetime.strptime(orario.strip(), formato_ora)
                data = data.replace(hour=ora.hour, minute=ora.minute)
                break
            except ValueError:
                continue
    return data.replace(tzinfo=FUSO_ROMA)


def record_da_riga(
    riga: dict[str, str],
    colonne: dict[str, str | None],
    fonte: str,
) -> tuple[dict[str, Any], datetime] | None:
    divisione = leggi_valore(riga, colonne, "divisione")
    if divisione and divisione.upper() != CODICE_SERIE_A:
        return None
    casa = leggi_valore(riga, colonne, "casa")
    trasferta = leggi_valore(riga, colonne, "trasferta")
    data_testo = leggi_valore(riga, colonne, "data")
    orario = leggi_valore(riga, colonne, "orario")
    data_ora = analizza_data(data_testo, orario)
    if not casa or not trasferta or data_ora is None:
        return None

    record = {
        "divisione": CODICE_SERIE_A,
        "data": data_ora.date().isoformat(),
        "orario": data_ora.strftime("%H:%M") if orario else None,
        "squadraCasa": casa,
        "squadraOspite": trasferta,
        "risultatoFinale": leggi_valore(riga, colonne, "risultato"),
        "golCasa": numero(leggi_valore(riga, colonne, "golCasa"), intero=True),
        "golTrasferta": numero(leggi_valore(riga, colonne, "golTrasferta"), intero=True),
        "tiriCasa": numero(leggi_valore(riga, colonne, "tiriCasa"), intero=True),
        "tiriTrasferta": numero(leggi_valore(riga, colonne, "tiriTrasferta"), intero=True),
        "tiriInPortaCasa": numero(leggi_valore(riga, colonne, "tiriPortaCasa"), intero=True),
        "tiriInPortaTrasferta": numero(leggi_valore(riga, colonne, "tiriPortaTrasferta"), intero=True),
        "angoliCasa": numero(leggi_valore(riga, colonne, "angoliCasa"), intero=True),
        "angoliTrasferta": numero(leggi_valore(riga, colonne, "angoliTrasferta"), intero=True),
        "quote": {
            "uno": numero(leggi_valore(riga, colonne, "quota1")),
            "ics": numero(leggi_valore(riga, colonne, "quotaX")),
            "due": numero(leggi_valore(riga, colonne, "quota2")),
        },
        "fonte": fonte,
    }
    return record, data_ora


def importa_csv(
    url: str,
    risultati: dict[tuple[str, str, str], tuple[dict[str, Any], datetime]],
    future: dict[tuple[str, str, str], tuple[dict[str, Any], datetime]],
    avvisi: list[str],
    adesso: datetime,
) -> None:
    testo = scarica_testo(url)
    lettore = csv.DictReader(io.StringIO(testo))
    if not lettore.fieldnames:
        avvisi.append(f"CSV senza intestazioni: {url}")
        return
    colonne = mappa_colonne(lettore.fieldnames)
    mancanti = [campo for campo, colonna in colonne.items() if colonna is None]
    if mancanti:
        avvisi.append(f"Colonne non disponibili in {url}: {', '.join(mancanti)}.")

    for riga in lettore:
        estratto = record_da_riga(riga, colonne, url)
        if estratto is None:
            continue
        record, data_ora = estratto
        chiave = (record["data"], record["squadraCasa"], record["squadraOspite"])
        disputata = record["golCasa"] is not None and record["golTrasferta"] is not None
        if disputata:
            risultati[chiave] = (record, data_ora)
        elif adesso <= data_ora <= adesso + timedelta(days=GIORNI_FUTURI):
            future[chiave] = (record, data_ora)


def scrivi_output(
    stato: str,
    fonti: list[str],
    risultati: list[dict[str, Any]],
    future: list[dict[str, Any]],
    avvisi: list[str],
) -> None:
    dati = {
        "statoImportazione": stato,
        "fonte": fonti,
        "aggiornatoIl": datetime.now(FUSO_ROMA).isoformat(timespec="seconds"),
        "numeroRisultatiTrovati": len(risultati),
        "numeroPartiteFutureTrovate": len(future),
        "risultati": risultati,
        "partiteFuture": future,
        "avvisi": avvisi,
    }
    with OUTPUT.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(dati, file, ensure_ascii=False, indent=2)
        file.write("\n")


def main() -> None:
    avvisi: list[str] = []
    csv_urls: list[str] = []
    try:
        csv_urls.extend(trova_csv(PAGINA_RISULTATI, solo_serie_a=True))
    except (HTTPError, URLError, TimeoutError, OSError) as errore:
        avvisi.append(f"Impossibile leggere la pagina dei risultati: {errore}.")
    try:
        csv_urls.extend(trova_csv(PAGINA_FUTURE, solo_serie_a=False))
    except (HTTPError, URLError, TimeoutError, OSError) as errore:
        avvisi.append(f"Impossibile leggere la pagina delle partite future: {errore}.")

    csv_urls = sorted(set(csv_urls))
    if not csv_urls:
        avvisi.append("Nessun collegamento CSV pubblico è stato individuato nelle pagine indicate.")
        scrivi_output("errore", [PAGINA_RISULTATI, PAGINA_FUTURE], [], [], avvisi)
        print("Importazione non riuscita: nessun CSV disponibile.")
        return

    adesso = datetime.now(FUSO_ROMA)
    risultati: dict[tuple[str, str, str], tuple[dict[str, Any], datetime]] = {}
    future: dict[tuple[str, str, str], tuple[dict[str, Any], datetime]] = {}
    fonti_riuscite: list[str] = []
    for url in csv_urls:
        try:
            importa_csv(url, risultati, future, avvisi, adesso)
            fonti_riuscite.append(url)
        except (HTTPError, URLError, TimeoutError, OSError, csv.Error) as errore:
            avvisi.append(f"Download o lettura non riusciti per {url}: {errore}.")

    risultati_ordinati = [
        record for record, _ in sorted(risultati.values(), key=lambda elemento: elemento[1], reverse=True)
    ][:MASSIMO_RISULTATI]
    future_ordinate = [
        record for record, _ in sorted(future.values(), key=lambda elemento: elemento[1])
    ]
    stato = "completata" if fonti_riuscite else "errore"
    if not risultati_ordinati:
        avvisi.append("Nessun risultato di Serie A è stato trovato nei CSV scaricati.")
    if not future_ordinate:
        avvisi.append(f"Nessuna partita di Serie A trovata nei prossimi {GIORNI_FUTURI} giorni.")
    scrivi_output(
        stato,
        [PAGINA_RISULTATI, PAGINA_FUTURE, *fonti_riuscite],
        risultati_ordinati,
        future_ordinate,
        avvisi,
    )
    print(f"Stato: {stato}")
    print(f"Risultati salvati: {len(risultati_ordinati)}")
    print(f"Partite future salvate: {len(future_ordinate)}")
    print(f"Avvisi: {len(avvisi)}")


if __name__ == "__main__":
    main()
