"""Calcola statistiche di squadra dai risultati reali importati della Serie A."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


INPUT = Path("data/test-serie-a-reale.json")
OUTPUT = Path("data/statistiche-serie-a-reali.json")
FUSO_ROMA = ZoneInfo("Europe/Rome")


def nuovo_accumulatore(nome: str) -> dict[str, Any]:
    return {
        "nome": nome,
        "partite": [],
        "vittorie": 0,
        "pareggi": 0,
        "sconfitte": 0,
        "golFatti": 0,
        "golSubiti": 0,
        "punti": 0,
        "casa": {"partite": 0, "punti": 0},
        "trasferta": {"partite": 0, "punti": 0},
        "over15": 0,
        "over25": 0,
        "over35": 0,
        "gol": 0,
        "tiriFatti": [],
        "tiriSubiti": [],
        "tiriInPortaFatti": [],
        "tiriInPortaSubiti": [],
        "angoli": [],
    }


def media(valori: list[float | int]) -> float | None:
    if not valori:
        return None
    return round(sum(valori) / len(valori), 2)


def percentuale(parte: int, totale: int) -> float | None:
    if totale == 0:
        return None
    return round(parte / totale * 100, 1)


def rendimento(punti: int, partite: int) -> float | None:
    if partite == 0:
        return None
    return round(punti / (partite * 3) * 100, 1)


def aggiungi_se_disponibile(elenco: list[float | int], valore: Any) -> None:
    if isinstance(valore, (int, float)) and not isinstance(valore, bool):
        elenco.append(valore)


def elabora_partita(squadre: dict[str, dict[str, Any]], partita: dict[str, Any]) -> bool:
    casa = partita.get("squadraCasa")
    trasferta = partita.get("squadraOspite")
    gol_casa = partita.get("golCasa")
    gol_trasferta = partita.get("golTrasferta")
    data = partita.get("data")
    if (
        not casa
        or not trasferta
        or not data
        or not isinstance(gol_casa, (int, float))
        or not isinstance(gol_trasferta, (int, float))
    ):
        return False

    squadre.setdefault(casa, nuovo_accumulatore(casa))
    squadre.setdefault(trasferta, nuovo_accumulatore(trasferta))
    squadra_casa = squadre[casa]
    squadra_trasferta = squadre[trasferta]

    if gol_casa > gol_trasferta:
        esito_casa, esito_trasferta = "V", "P"
        punti_casa, punti_trasferta = 3, 0
    elif gol_casa < gol_trasferta:
        esito_casa, esito_trasferta = "P", "V"
        punti_casa, punti_trasferta = 0, 3
    else:
        esito_casa = esito_trasferta = "N"
        punti_casa = punti_trasferta = 1

    totale_gol = gol_casa + gol_trasferta
    entrambe_segnano = gol_casa > 0 and gol_trasferta > 0
    dati_partita = (
        (squadra_casa, trasferta, "casa", esito_casa, gol_casa, gol_trasferta, punti_casa),
        (squadra_trasferta, casa, "trasferta", esito_trasferta, gol_trasferta, gol_casa, punti_trasferta),
    )

    for squadra, avversario, campo, esito, fatti, subiti, punti in dati_partita:
        squadra["partite"].append(
            {
                "data": data,
                "avversario": avversario,
                "campo": campo,
                "esito": esito,
                "risultato": f"{int(fatti)}-{int(subiti)}",
            }
        )
        squadra["golFatti"] += int(fatti)
        squadra["golSubiti"] += int(subiti)
        squadra["punti"] += punti
        squadra[campo]["partite"] += 1
        squadra[campo]["punti"] += punti
        squadra["vittorie" if esito == "V" else "pareggi" if esito == "N" else "sconfitte"] += 1
        squadra["over15"] += totale_gol > 1.5
        squadra["over25"] += totale_gol > 2.5
        squadra["over35"] += totale_gol > 3.5
        squadra["gol"] += entrambe_segnano

    aggiungi_se_disponibile(squadra_casa["tiriFatti"], partita.get("tiriCasa"))
    aggiungi_se_disponibile(squadra_casa["tiriSubiti"], partita.get("tiriTrasferta"))
    aggiungi_se_disponibile(squadra_trasferta["tiriFatti"], partita.get("tiriTrasferta"))
    aggiungi_se_disponibile(squadra_trasferta["tiriSubiti"], partita.get("tiriCasa"))
    aggiungi_se_disponibile(squadra_casa["tiriInPortaFatti"], partita.get("tiriInPortaCasa"))
    aggiungi_se_disponibile(squadra_casa["tiriInPortaSubiti"], partita.get("tiriInPortaTrasferta"))
    aggiungi_se_disponibile(squadra_trasferta["tiriInPortaFatti"], partita.get("tiriInPortaTrasferta"))
    aggiungi_se_disponibile(squadra_trasferta["tiriInPortaSubiti"], partita.get("tiriInPortaCasa"))
    aggiungi_se_disponibile(squadra_casa["angoli"], partita.get("angoliCasa"))
    aggiungi_se_disponibile(squadra_trasferta["angoli"], partita.get("angoliTrasferta"))
    return True


def risultato_squadra(accumulatore: dict[str, Any]) -> dict[str, Any]:
    partite = len(accumulatore["partite"])
    partite_ordinate = sorted(accumulatore["partite"], key=lambda gara: gara["data"])
    ultime_5 = list(reversed(partite_ordinate[-5:]))
    ultime_10 = list(reversed(partite_ordinate[-10:]))
    return {
        "nome": accumulatore["nome"],
        "partiteGiocate": partite,
        "vittorie": accumulatore["vittorie"],
        "pareggi": accumulatore["pareggi"],
        "sconfitte": accumulatore["sconfitte"],
        "golFatti": accumulatore["golFatti"],
        "golSubiti": accumulatore["golSubiti"],
        "mediaGolFatti": round(accumulatore["golFatti"] / partite, 2) if partite else None,
        "mediaGolSubiti": round(accumulatore["golSubiti"] / partite, 2) if partite else None,
        "rendimentoComplessivo": rendimento(accumulatore["punti"], partite),
        "rendimentoCasa": rendimento(accumulatore["casa"]["punti"], accumulatore["casa"]["partite"]),
        "rendimentoTrasferta": rendimento(
            accumulatore["trasferta"]["punti"], accumulatore["trasferta"]["partite"]
        ),
        "ultime5Partite": ultime_5,
        "ultime10Partite": ultime_10,
        "percentualeOver15": percentuale(accumulatore["over15"], partite),
        "percentualeOver25": percentuale(accumulatore["over25"], partite),
        "percentualeOver35": percentuale(accumulatore["over35"], partite),
        "percentualeGol": percentuale(accumulatore["gol"], partite),
        "percentualeNoGol": percentuale(partite - accumulatore["gol"], partite),
        "mediaTiriFatti": media(accumulatore["tiriFatti"]),
        "mediaTiriSubiti": media(accumulatore["tiriSubiti"]),
        "mediaTiriInPortaFatti": media(accumulatore["tiriInPortaFatti"]),
        "mediaTiriInPortaSubiti": media(accumulatore["tiriInPortaSubiti"]),
        "mediaCalciDAngolo": media(accumulatore["angoli"]),
        "coperturaDati": {
            "partiteConTiri": len(accumulatore["tiriFatti"]),
            "partiteConTiriInPorta": len(accumulatore["tiriInPortaFatti"]),
            "partiteConCalciDAngolo": len(accumulatore["angoli"]),
        },
    }


def scrivi_output(
    stato: str,
    fonte: Any,
    partite_utilizzate: int,
    statistiche: list[dict[str, Any]],
    avvisi: list[str],
) -> None:
    output = {
        "statoElaborazione": stato,
        "aggiornatoIl": datetime.now(FUSO_ROMA).isoformat(timespec="seconds"),
        "fonte": fonte,
        "numeroSquadreElaborate": len(statistiche),
        "numeroPartiteUtilizzate": partite_utilizzate,
        "statisticheSquadre": statistiche,
        "avvisi": avvisi,
    }
    with OUTPUT.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(output, file, ensure_ascii=False, indent=2)
        file.write("\n")


def main() -> None:
    try:
        with INPUT.open("r", encoding="utf-8") as file:
            dati = json.load(file)
    except (OSError, json.JSONDecodeError) as errore:
        scrivi_output("errore", str(INPUT), 0, [], [f"Impossibile leggere il file di origine: {errore}."])
        print(f"Elaborazione non riuscita: {errore}")
        return

    risultati = dati.get("risultati")
    if not isinstance(risultati, list):
        scrivi_output("errore", dati.get("fonte", str(INPUT)), 0, [], ["L'elenco risultati non è valido."])
        print("Elaborazione non riuscita: elenco risultati non valido.")
        return

    risultati_ordinati = sorted(risultati, key=lambda partita: partita.get("data") or "")
    squadre: dict[str, dict[str, Any]] = {}
    partite_utilizzate = 0
    partite_scartate = 0
    for partita in risultati_ordinati:
        if elabora_partita(squadre, partita):
            partite_utilizzate += 1
        else:
            partite_scartate += 1

    statistiche = sorted(
        (risultato_squadra(accumulatore) for accumulatore in squadre.values()),
        key=lambda squadra: squadra["nome"].casefold(),
    )
    avvisi: list[str] = []
    if partite_scartate:
        avvisi.append(
            f"{partite_scartate} partite escluse perché prive di squadre, data o risultato numerico."
        )
    avvisi_origine = dati.get("avvisi")
    if isinstance(avvisi_origine, list) and avvisi_origine:
        avvisi.append(f"Il file di importazione originale contiene {len(avvisi_origine)} avvisi.")

    senza_tiri = sum(1 for squadra in statistiche if squadra["mediaTiriFatti"] is None)
    senza_tiri_porta = sum(1 for squadra in statistiche if squadra["mediaTiriInPortaFatti"] is None)
    senza_angoli = sum(1 for squadra in statistiche if squadra["mediaCalciDAngolo"] is None)
    if senza_tiri:
        avvisi.append(f"Tiri non disponibili per {senza_tiri} squadre: medie impostate a null.")
    if senza_tiri_porta:
        avvisi.append(
            f"Tiri in porta non disponibili per {senza_tiri_porta} squadre: medie impostate a null."
        )
    if senza_angoli:
        avvisi.append(
            f"Calci d'angolo non disponibili per {senza_angoli} squadre: medie impostate a null."
        )

    scrivi_output("completata", dati.get("fonte", str(INPUT)), partite_utilizzate, statistiche, avvisi)
    print(f"Squadre elaborate: {len(statistiche)}")
    print(f"Partite utilizzate: {partite_utilizzate}")
    print(f"Partite scartate: {partite_scartate}")
    print(f"Avvisi: {len(avvisi)}")


if __name__ == "__main__":
    main()
