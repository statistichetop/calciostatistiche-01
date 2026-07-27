"""Calcola l'andamento delle squadre usando soltanto risultati reali disponibili."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data" / "test-serie-a-reale.json"
OUTPUT = ROOT / "data" / "andamento-serie-a-reale.json"


def rome_now() -> datetime:
    try:
        return datetime.now(ZoneInfo("Europe/Rome"))
    except Exception:
        # Fallback per installazioni Windows senza database IANA; a fine luglio Roma è UTC+2.
        return datetime.now(timezone(timedelta(hours=2)))


def match_key(match: dict) -> tuple[str, str]:
    return (match.get("data") or "", match.get("orario") or "")


def season_from_sources(sources: list[str]) -> str:
    for source in sources:
        if "/2526/" in source:
            return "2025/2026"
    return "Ultime partite reali disponibili"


def main() -> None:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    results = sorted(source.get("risultati", []), key=match_key)
    by_team: dict[str, list[dict]] = defaultdict(list)

    for match in results:
        home = match.get("squadraCasa")
        away = match.get("squadraOspite")
        home_goals = match.get("golCasa")
        away_goals = match.get("golTrasferta")
        if (
            not home
            or not away
            or not isinstance(home_goals, int)
            or not isinstance(away_goals, int)
        ):
            continue

        home_points = 3 if home_goals > away_goals else 1 if home_goals == away_goals else 0
        away_points = 3 if away_goals > home_goals else 1 if home_goals == away_goals else 0
        common = {"data": match.get("data"), "orario": match.get("orario")}
        by_team[home].append(
            {
                **common,
                "avversario": away,
                "campo": "Casa",
                "risultato": f"{home_goals}-{away_goals}",
                "puntiOttenuti": home_points,
                "golFatti": home_goals,
                "golSubiti": away_goals,
            }
        )
        by_team[away].append(
            {
                **common,
                "avversario": home,
                "campo": "Trasferta",
                "risultato": f"{away_goals}-{home_goals}",
                "puntiOttenuti": away_points,
                "golFatti": away_goals,
                "golSubiti": home_goals,
            }
        )

    teams = []
    for name in sorted(by_team):
        points = goals_for = goals_against = 0
        matches = []
        for index, match in enumerate(sorted(by_team[name], key=match_key), start=1):
            points += match["puntiOttenuti"]
            goals_for += match["golFatti"]
            goals_against += match["golSubiti"]
            matches.append(
                {
                    "numeroPartita": index,
                    **match,
                    "puntiCumulativi": points,
                    "golFattiCumulativi": goals_for,
                    "golSubitiCumulativi": goals_against,
                }
            )
        teams.append({"squadra": name, "partite": matches})

    payload = {
        "statoElaborazione": "completata",
        "aggiornatoIl": rome_now().isoformat(timespec="seconds"),
        "stagioneDati": season_from_sources(source.get("fonte", [])),
        "stagioneRichiesta": "2026/2027",
        "notaStagione": (
            "Ultime partite disponibili – in attesa dell’inizio della nuova stagione"
        ),
        "fonte": source.get("fonte", []),
        "numeroSquadre": len(teams),
        "numeroPartiteUtilizzate": len(results),
        "squadre": teams,
        "eventualiAvvisi": [],
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(
        "w", encoding="utf-8", dir=OUTPUT.parent, delete=False, suffix=".tmp"
    ) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    temporary_path.replace(OUTPUT)
    print(f"Elaborate {len(teams)} squadre da {len(results)} risultati reali.")


if __name__ == "__main__":
    main()
