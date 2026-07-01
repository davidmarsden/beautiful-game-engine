# The Beautiful Game — Engine

A deliberately small first engine scaffold for **The Beautiful Game**.

Current target:

> Generate a deterministic 100-club, five-division world shell and import real football data into local JSON snapshots.

No UI. No transfers. No youth. No full match engine yet.

## Commands

```bash
npm test
npm run demo
```

## World milestone

- 100 clubs
- 5 divisions
- 20 clubs per division
- deterministic generation from seed
- stable IDs
- squad shells
- manager slots
- league and cup shells
- season calendar shell

## API-Football importer

The engine does not call API-Football during normal simulation. The importer creates local JSON snapshots, and future rating/world systems consume those snapshots.

Create a local `.env` file:

```bash
cp .env.example .env
```

Then put your API-Football key in `.env`.

Run a small one-page import first:

```bash
npm run import:api-football:players -- --league=39 --season=2025 --maxPages=1
```

That writes a timestamped file to:

```text
data/api-football/
```

For a bigger import, increase `--maxPages` gradually so you stay within API limits:

```bash
npm run import:api-football:players -- --league=39 --season=2025 --maxPages=5
```

The current importer normalises player statistics only. Team, fixture and market-value importers will be added separately.
