# RafRpgFront

Browser frontend for the RAF-Deep-RPG game server (see `game_documentation.tex`). Use it to play the
game by hand, or to **watch your RL agent play** while it trains.

## Using the frontend

- **Server address.** By default the app talks to port `8080` on the same host the page was opened
  from. To point it elsewhere, open the page with `?api=http://host:8080`, or set `apiUrl` in
  `src/environments/environment.ts`.
- **Sessions (`game_id`).** The *Session* box in the top bar picks which game to show. `default` is
  the one the frontend has always shown. Type your agent's id (e.g. `env_0`) to watch the agent play
  live. The list is filled from `GET /game/sessions`. You can also open `?game_id=env_0` directly,
  one browser tab per environment.
- **New episode (`R`).** Choose the level (0–5), the seed (leave it empty for a random seed) and,
  optionally, override the level settings: gate price, merchant budget and refill, barbarians,
  villagers, max rounds. The seed and level are shown in the side panel, and the game-over screen
  can replay the same seed exactly.
- **Controls.** Arrows or WASD to move, Space to wait. *Async* sends `PUT /player/*` (the frontend's
  original mode). *Step* sends `POST /game/step`, which makes exactly the transitions your agent
  gets. A session stays in step mode until it is restarted. Moving in a session that an agent drives
  through `/game/step` returns `409`, and the app tells you so.
- **Agent view (`V`).** Dims everything outside the `(2r+1)×(2r+1)` window that
  `GET /player/view?radius=r` would return.
- **Side panel.** Gold compared with the gate price, rounds compared with the limit, the merchant's
  budget, the backpack and its value, and an event log. The log shows the raw `events` strings, so
  you can check your reward shaping. In async mode the log polls every 200 ms, so a fast agent can
  skip rounds in it.
- Hover a tile to see its coordinates and loot odds.

## Tests

```
npm test                                     # Karma, opens Chrome
npx ng test --watch=false --browsers=ChromeHeadless
```

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 12.2.9.

## Development server

Run `ng serve --host 0.0.0.0 --disable-host-check` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

`--host 0.0.0.0 --disable-host-check` is needed so you can call the app from other devices in the same network.

## Node version / build error

This project uses Angular 12, whose webpack build calls the legacy MD4 hash. On Node 17+
(which ships with OpenSSL 3) that fails with:

```
Error: error:0308010C:digital envelope routines::unsupported
```

The repo ships an `.npmrc` with `node-options=--openssl-legacy-provider`, so **run the app
through npm** and it just works:

```
npm start -- --host 0.0.0.0 --disable-host-check
npm run build
```

If you invoke the Angular CLI directly (`ng serve`), npm is not involved and you have to set
the flag yourself:

```
# Linux / macOS
NODE_OPTIONS=--openssl-legacy-provider ng serve --host 0.0.0.0 --disable-host-check

# Windows PowerShell
$env:NODE_OPTIONS="--openssl-legacy-provider"; ng serve --host 0.0.0.0 --disable-host-check
```

Note: `--openssl-legacy-provider` does not exist on Node 16 and older — Node will refuse to
start with `bad option`. If you are on Node 16 or older, delete the `.npmrc` (nothing else is
needed there); the build works out of the box on those versions.
