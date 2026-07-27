"""Prima versione dimostrativa del motore statistico per i pronostici."""

from __future__ import annotations

import json
import math
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


INPUT = Path("data/input-partite-reali.json")
OUTPUT = Path("data/pronostici.json")
ROME = ZoneInfo("Europe/Rome")
SOGLIA_AFFIDABILITA = 65
MASSIMO_PARTITE = 5
PESI = {
    "xg_xga": 0.25,
    "forma5": 0.20,
    "forma10": 0.15,
    "rendimento": 0.15,
    "gol": 0.15,
    "mercati": 0.10,
}


def limita(valore: float, minimo: float = -1.0, massimo: float = 1.0) -> float:
    return max(minimo, min(massimo, valore))


def valore(percorso: str, dati: dict[str, Any]) -> Any:
    corrente: Any = dati
    for chiave in percorso.split("."):
        if not isinstance(corrente, dict) or chiave not in corrente:
            return None
        corrente = corrente[chiave]
    return corrente


def conta_mancanti(partita: dict[str, Any]) -> list[str]:
    campi_partita = ["id", "campionato", "data", "orario", "quote.uno", "quote.ics", "quote.due"]
    campi_squadra = [
        "nome", "ultime5", "ultime10.vittorie", "ultime10.pareggi",
        "ultime10.sconfitte", "golFatti10", "golSubiti10", "rendimento",
        "over15", "over25", "over35", "gol", "xgMedio", "xgaMedio",
    ]
    mancanti = [campo for campo in campi_partita if valore(campo, partita) is None]
    for lato in ("casa", "trasferta"):
        squadra = partita.get(lato, {})
        mancanti.extend(f"{lato}.{campo}" for campo in campi_squadra if valore(campo, squadra) is None)
    return mancanti


def punti_forma(risultati: list[str]) -> float:
    if not risultati:
        raise ValueError("La forma recente non contiene risultati.")
    punti = {"V": 3, "N": 1, "P": 0}
    if any(esito not in punti for esito in risultati):
        raise ValueError("La forma recente contiene un esito non valido.")
    return sum(punti[esito] for esito in risultati) / (len(risultati) * 3)


def punti_ultime10(dati: dict[str, int]) -> float:
    totale = dati["vittorie"] + dati["pareggi"] + dati["sconfitte"]
    if totale != 10:
        raise ValueError("Vittorie, pareggi e sconfitte devono sommare a 10.")
    return (dati["vittorie"] * 3 + dati["pareggi"]) / 30


def calcola_fattori(partita: dict[str, Any]) -> dict[str, float]:
    casa = partita["casa"]
    trasferta = partita["trasferta"]
    gol_attesi_casa = (casa["xgMedio"] + trasferta["xgaMedio"]) / 2
    gol_attesi_trasferta = (trasferta["xgMedio"] + casa["xgaMedio"]) / 2

    equilibrio_gol_casa = (casa["golFatti10"] - casa["golSubiti10"]) / 10
    equilibrio_gol_trasferta = (trasferta["golFatti10"] - trasferta["golSubiti10"]) / 10
    mercati_casa = (casa["over15"] + casa["over25"] + casa["gol"]) / 300
    mercati_trasferta = (trasferta["over15"] + trasferta["over25"] + trasferta["gol"]) / 300

    return {
        "xg_xga": limita(math.tanh((gol_attesi_casa - gol_attesi_trasferta) / 1.2)),
        "forma5": limita((punti_forma(casa["ultime5"]) - punti_forma(trasferta["ultime5"])) * 1.5),
        "forma10": limita((punti_ultime10(casa["ultime10"]) - punti_ultime10(trasferta["ultime10"])) * 1.5),
        "rendimento": limita((casa["rendimento"] - trasferta["rendimento"]) / 55),
        "gol": limita(math.tanh((equilibrio_gol_casa - equilibrio_gol_trasferta) / 1.2)),
        "mercati": limita((mercati_casa - mercati_trasferta) * 1.5),
    }


def probabilita_esiti(indice: float) -> dict[str, float]:
    probabilita_x = 30 - 12 * abs(indice)
    restante = 100 - probabilita_x
    probabilita_1 = restante * (0.5 + 0.42 * indice)
    probabilita_2 = restante - probabilita_1
    valori = [round(probabilita_1, 1), round(probabilita_x, 1), round(probabilita_2, 1)]
    valori[2] = round(100 - valori[0] - valori[1], 1)
    return {"uno": valori[0], "ics": valori[1], "due": valori[2]}


def controllo_quote(probabilita: dict[str, float], quote: dict[str, float]) -> tuple[bool, str]:
    inverse = {chiave: 1 / quote[chiave] for chiave in ("uno", "ics", "due")}
    totale = sum(inverse.values())
    implicite = {chiave: inverse[chiave] / totale * 100 for chiave in inverse}
    modello = max(probabilita, key=probabilita.get)
    mercato = max(implicite, key=implicite.get)
    return modello != mercato, mercato


def mercato(media: float, soglia: float, nome_over: str, nome_under: str) -> str:
    return nome_over if media >= soglia else nome_under


def analizza(partita: dict[str, Any]) -> dict[str, Any]:
    fattori = calcola_fattori(partita)
    indice = sum(fattori[nome] * PESI[nome] for nome in PESI)
    probabilita = probabilita_esiti(indice)
    esito = max(probabilita, key=probabilita.get)
    etichetta_esito = {"uno": "1", "ics": "X", "due": "2"}[esito]

    ordinati = sorted(probabilita, key=probabilita.get, reverse=True)
    coppia = set(ordinati[:2])
    doppia = "1X" if coppia == {"uno", "ics"} else "X2" if coppia == {"ics", "due"} else "12"

    casa = partita["casa"]
    trasferta = partita["trasferta"]
    media_over15 = (casa["over15"] + trasferta["over15"]) / 2
    media_over25 = (casa["over25"] + trasferta["over25"]) / 2
    media_over35 = (casa["over35"] + trasferta["over35"]) / 2
    media_gol = (casa["gol"] + trasferta["gol"]) / 2
    over15 = mercato(media_over15, 60, "Over 1,5", "Under 1,5")
    over25 = mercato(media_over25, 60, "Over 2,5", "Under 2,5")
    over35 = mercato(media_over35, 55, "Over 3,5", "Under 3,5")
    gol_no_gol = "Gol" if media_gol >= 58 else "No Gol"

    direzione = 1 if indice >= 0 else -1
    concordi = sum(1 for fattore in fattori.values() if fattore * direzione > 0.05) / len(fattori)
    conflitto_quote, favorito_quote = controllo_quote(probabilita, partita["quote"])
    affidabilita = round(limita(52 + abs(indice) * 40 + concordi * 12, 0, 100))
    if conflitto_quote:
        affidabilita = max(0, affidabilita - 4)

    principali = sorted(fattori, key=lambda nome: abs(fattori[nome] * PESI[nome]), reverse=True)[:2]
    nomi_fattori = {
        "xg_xga": "xG e xGA", "forma5": "forma nelle ultime 5",
        "forma10": "rendimento nelle ultime 10", "rendimento": "rendimento casa/trasferta",
        "gol": "gol fatti e subiti", "mercati": "frequenze gol e Over/Under",
    }
    nota_quote = (
        f" Le quote indicano come favorito l'esito { {'uno': '1', 'ics': 'X', 'due': '2'}[favorito_quote] }, "
        "ma sono state usate solo come controllo secondario."
        if conflitto_quote else
        " Le quote sono coerenti con la tendenza principale e sono state usate solo come controllo secondario."
    )
    motivazione = (
        f"Il modello favorisce l'esito {etichetta_esito}, soprattutto per {nomi_fattori[principali[0]]} "
        f"e {nomi_fattori[principali[1]]}.{nota_quote} Nessun risultato è garantito."
    )

    consigliati = [doppia, over25, gol_no_gol][:3]
    combinato = f"{doppia} + {over15}"
    return {
        "partitaId": partita["id"],
        "partita": f"{casa['nome']} – {trasferta['nome']}",
        "campionato": partita["campionato"],
        "data": partita["data"],
        "orario": partita["orario"],
        "probabilita": {
            "uno": probabilita["uno"],
            "ics": probabilita["ics"],
            "due": probabilita["due"],
        },
        "esiti": {
            "unoXDue": etichetta_esito,
            "doppiaChance": doppia,
            "underOver15": over15,
            "underOver25": over25,
            "underOver35": over35,
            "golNoGol": gol_no_gol,
        },
        "affidabilita": affidabilita,
        "motivazione": motivazione,
        "consigliati": consigliati,
        "combinato": combinato,
        "avvertenza": "Pronostico statistico dimostrativo. Nessun risultato è garantito.",
    }


def main() -> None:
    with INPUT.open("r", encoding="utf-8") as file:
        input_data = json.load(file)

    partite = input_data.get("partite")
    if not isinstance(partite, list):
        raise ValueError("Il file di input non contiene un elenco 'partite' valido.")

    risultati: list[dict[str, Any]] = []
    esclusioni: list[dict[str, str]] = []
    for partita in partite:
        mancanti = conta_mancanti(partita)
        if len(mancanti) > 2:
            esclusioni.append({
                "partitaId": partita.get("id", "id-mancante"),
                "motivo": f"Dati insufficienti: mancano {len(mancanti)} campi.",
            })
            continue
        if mancanti:
            esclusioni.append({
                "partitaId": partita.get("id", "id-mancante"),
                "motivo": f"Campi necessari al calcolo mancanti: {', '.join(mancanti)}.",
            })
            continue
        try:
            risultato = analizza(partita)
        except (KeyError, TypeError, ValueError, ZeroDivisionError) as errore:
            esclusioni.append({"partitaId": partita.get("id", "id-mancante"), "motivo": str(errore)})
            continue
        if risultato["affidabilita"] >= SOGLIA_AFFIDABILITA:
            risultati.append(risultato)
        else:
            esclusioni.append({
                "partitaId": partita["id"],
                "motivo": f"Affidabilità {risultato['affidabilita']}%, inferiore alla soglia del {SOGLIA_AFFIDABILITA}%.",
            })

    risultati = sorted(risultati, key=lambda item: item["affidabilita"], reverse=True)[:MASSIMO_PARTITE]
    output_data = {
        "tipoDati": "dimostrativi",
        "generatoIl": datetime.now(ROME).isoformat(timespec="seconds"),
        "metodo": {
            "pesi": {nome: f"{round(peso * 100)}%" for nome, peso in PESI.items()},
            "sogliaAffidabilita": SOGLIA_AFFIDABILITA,
            "massimoPartite": MASSIMO_PARTITE,
            "usoQuote": "Controllo secondario; non determinano da sole il pronostico.",
        },
        "avvertenza": "Pronostici basati su elaborazioni statistiche. Nessun risultato è garantito.",
        "pronostici": risultati,
        "esclusioni": esclusioni,
    }
    with OUTPUT.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(output_data, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print(f"Pronostici selezionati: {len(risultati)}")
    print(f"Partite escluse: {len(esclusioni)}")
    for risultato in risultati:
        probabilita = risultato["probabilita"]
        print(
            f"- {risultato['partita']}: 1 {probabilita['uno']}% · "
            f"X {probabilita['ics']}% · 2 {probabilita['due']}% · "
            f"affidabilità {risultato['affidabilita']}%"
        )


if __name__ == "__main__":
    main()
