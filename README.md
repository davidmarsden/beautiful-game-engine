# The Beautiful Game — Engine

A deliberately small first engine scaffold for **The Beautiful Game**.

Current target:

> Generate a deterministic 100-club, five-division world shell and import real football data into JSON snapshots.

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

The engine does not call API-Football during normal simulation. The importer creates JSON snapshots, and future rating/world systems consume those snapshots.

## Tablet workflow using GitHub Actions

Add your API key as a repository secret:

1. Open the repo on GitHub.
2. Go to Settings.
3. Go to Secrets and variables, then Actions.
4. Add a new repository secret called `API_FOOTBALL_KEY`.
5. Paste your API-Football key as the value.

Then run an import from your tablet:

1. Go to the Actions tab.
2. Choose `Import API-Football Data`.
3. Tap `Run workflow`.
4. Enter a league id, season and max page count.
5. Start with league `39`, season `2025`, max pages `1`.

The workflow writes a timestamped file to:

```text
data/api-football/
```

and commits it back to the repository automatically.

## Local workflow

Create a local `.env` file:

```bash
cp .env.example .env
```

Then put your API-Football key in `.env`.

Run a small one-page import first:

```bash
npm run import:api-football:players -- --league=39 --season=2025 --maxPages=1
```

For a bigger import, increase `--maxPages` gradually so you stay within API limits:

```bash
npm run import:api-football:players -- --league=39 --season=2025 --maxPages=5
```

The current importer normalises player statistics only. Team, fixture and market-value importers will be added separately.
