# Statistiche Calcio

Prima versione dimostrativa di un sito responsive dedicato a statistiche e pronostici calcistici.

## Contenuti

- cinque partite dimostrative;
- pronostici 1X2, doppia chance, Under/Over 2,5 e Gol/No Gol;
- percentuale di affidabilità e breve motivazione;
- sette campionati iniziali;
- navigazione responsive per desktop e smartphone.

## Struttura dati

I contenuti dimostrativi sono separati dall'interfaccia:

- `data/partite-oggi.json`: calendario e statistiche delle partite;
- `data/pronostici.json`: esiti, affidabilità e consigli;
- `data/storico.json`: risultati dei pronostici precedenti;
- `data/campionati/serie-a.json`: prima scheda campionato predisposta.

## Avvio

Non sono richieste librerie o installazioni. Poiché i dati vengono caricati da file JSON, il sito deve essere aperto tramite un semplice server locale oppure tramite GitHub Pages.

Esempio con Python:

```sh
python -m http.server 8000
```

Poi aprire `http://localhost:8000`.

## Note

Tutti i dati e i pronostici sono puramente dimostrativi. Questa versione non usa API, font esterni, librerie o sistemi automatici.
