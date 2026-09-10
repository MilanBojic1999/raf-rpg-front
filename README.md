# RafRpgFront

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
