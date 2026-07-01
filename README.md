# The Beautiful Game — Engine

A deliberately small first engine scaffold for **The Beautiful Game**.

Current target:

> Generate a deterministic 100-club, five-division world shell that can later consume canonical data from `beautiful-game-data`.

No UI. No transfers. No youth. No full match engine yet.

## Repository roles

```text
beautiful-game-governance  -> rules and constitutions
beautiful-game-engine      -> simulation code
beautiful-game-data        -> imported and derived football data
```

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

## Data policy

The engine does not call live data providers.

API-Football imports, snapshots and derived databases now live in `beautiful-game-data`. The engine will consume canonical data outputs from that repository once the player-rating and squad-population layers are implemented.
