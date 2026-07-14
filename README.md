# The Beautiful Game — Engine

The simulation engine and persistent world-state repository for **The Beautiful Game**.

## Repository roles

```text
beautiful-game-governance  -> rules and constitutions
beautiful-game-engine      -> world state, simulation code and histories
beautiful-game-data        -> imported and derived football data
```

The engine never calls live data providers. It consumes canonical outputs from `beautiful-game-data`.

## Current milestone — Phase 2A World Foundation

The canonical launch world contains:

- 80 playable clubs
- five divisions of 16 clubs
- stable club, player, manager-slot, contract, season and competition IDs
- launch squad ownership
- unsigned-player ownership records
- manager vacancies
- league and cup competition shells
- a 30-matchday calendar shell for 16-club double round robins
- empty fixtures, standings, histories and honours ready for later simulation

Division membership is intentionally left unassigned in Phase 2A. Phase 2B will calculate weighted squad strength and seed the five divisions from footballing strength rather than launch-slot reputation.

## Commands

```bash
npm test
npm run demo
npm run build:world-foundation
```

By default, `build:world-foundation` expects the data repository beside the engine repository:

```text
parent/
  beautiful-game-engine/
  beautiful-game-data/
```

It reads:

```text
beautiful-game-data/data/config/tbg-club-universe.json
beautiful-game-data/derived/tbg-player-pools/game-players.json
beautiful-game-data/derived/tbg-player-pools/unsigned-players.json
```

and writes:

```text
derived/world/
  world.json
  world-summary.json
  clubs.json
  divisions.json
  competitions.json
  manager-slots.json
  player-ownership.json
  histories/index.json
  seasons/season-001/
    season.json
    calendar.json
    fixtures.json
    standings.json
    honours.json
```

## GitHub Action

Run **Build TBG World Foundation** to check out the canonical data repository, run the engine tests, generate the inaugural world state, upload it as an artifact and commit the generated world files.
