"""Aggiorna esclusivamente il timestamp dei dati delle partite."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


PERCORSO_DATI = Path("data/partite-oggi.json")
FUSO_ORARIO = ZoneInfo("Europe/Rome")


def main() -> None:
    with PERCORSO_DATI.open("r", encoding="utf-8") as file:
        dati = json.load(file)

    if "aggiornatoIl" not in dati:
        raise KeyError(
            f"Il campo 'aggiornatoIl' non è presente in {PERCORSO_DATI}."
        )

    dati["aggiornatoIl"] = datetime.now(FUSO_ORARIO).isoformat(timespec="seconds")

    with PERCORSO_DATI.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(dati, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print(f"Timestamp aggiornato: {dati['aggiornatoIl']}")


if __name__ == "__main__":
    main()
