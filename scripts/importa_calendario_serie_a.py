"""Importa il calendario ufficiale della Serie A 2026/2027."""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "calendario-serie-a-2026-27.json"
PUBLIC_PAGE = "https://www.legaseriea.it/serie-a/calendario-risultati"
SEASON_ID = "serie-a::Football_Season::ed7fdc2a3e7b408b942ec177b7b956b5"
DATA_URL = (
    "https://api-sdp.legaseriea.it/v1/serie-a/football/seasons/"
    f"{SEASON_ID}/matches"
)


def rome_now() -> datetime:
    try:
        return datetime.now(ZoneInfo("Europe/Rome"))
    except Exception:
        # Fallback per installazioni Windows senza database IANA; a fine luglio Roma è UTC+2.
        return datetime.now(timezone(timedelta(hours=2)))


def download_json(url: str) -> dict:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Statistiche-Calcio/1.0 (+GitHub Pages)"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def matchday_number(match: dict) -> int:
    label = str(match.get("matchSet", {}).get("name", ""))
    found = re.search(r"(\d+)", label)
    if not found:
        raise ValueError(f"Giornata non riconosciuta: {label!r}")
    return int(found.group(1))


def match_status(match: dict) -> str:
    status = str(match.get("status", "")).upper()
    provider = str(match.get("providerStatus", "")).upper()
    if any(word in status or word in provider for word in ("POSTPON", "SUSPEND")):
        return "rinviata"
    if status in {"PLAYED", "FINISHED", "ENDED"} or (
        match.get("providerHomeScore") is not None
        and match.get("providerAwayScore") is not None
    ):
        return "disputata"
    return "futura"


def normalize_match(match: dict) -> dict:
    local_date = match.get("matchDateLocal")
    date = local_date[:10] if isinstance(local_date, str) and len(local_date) >= 10 else None
    unknown_time = bool(match.get("isUnknownKickOffTime"))
    time = None
    if not unknown_time and isinstance(local_date, str) and "T" in local_date:
        time = local_date.split("T", 1)[1][:5]

    home_score = match.get("providerHomeScore")
    away_score = match.get("providerAwayScore")
    result = None
    if home_score is not None and away_score is not None:
        result = f"{home_score}-{away_score}"

    return {
        "giornata": matchday_number(match),
        "data": date,
        "orario": time,
        "squadraCasa": match.get("home", {}).get("officialName"),
        "squadraOspite": match.get("away", {}).get("officialName"),
        "stato": match_status(match),
        "risultato": result,
    }


def atomic_write(payload: dict) -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(
        "w", encoding="utf-8", dir=OUTPUT.parent, delete=False, suffix=".tmp"
    ) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    temporary_path.replace(OUTPUT)


def main() -> int:
    try:
        source = download_json(DATA_URL)
        matches = [normalize_match(item) for item in source.get("matches", [])]
        days = []
        warnings = []

        for number in range(1, 39):
            day_matches = sorted(
                (item for item in matches if item["giornata"] == number),
                key=lambda item: (item["data"] or "", item["orario"] or "99:99"),
            )
            if len(day_matches) != 10:
                warnings.append(
                    f"La giornata {number} contiene {len(day_matches)} partite anziché 10."
                )
            days.append({"numero": number, "partite": day_matches})

        if len(days) != 38 or len(matches) != 380 or warnings:
            raise ValueError(
                f"Calendario incompleto: {len(days)} giornate, {len(matches)} partite. "
                + " ".join(warnings)
            )

        payload = {
            "statoImportazione": "completata",
            "stagione": "2026/2027",
            "fonte": {"pagina": PUBLIC_PAGE, "dati": DATA_URL},
            "aggiornatoIl": rome_now().isoformat(timespec="seconds"),
            "numeroGiornate": len(days),
            "numeroPartite": len(matches),
            "giornate": days,
            "eventualiAvvisi": [
                "Gli orari null non sono ancora stati stabiliti dalla fonte ufficiale."
            ]
            if any(item["orario"] is None for item in matches)
            else [],
        }
        atomic_write(payload)
        print(f"Importate {len(days)} giornate e {len(matches)} partite.")
        return 0
    except Exception as error:
        print(
            f"Importazione non riuscita: {error}. "
            "L'eventuale calendario precedente è stato conservato.",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
