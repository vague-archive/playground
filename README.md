# Void Playground

This is an experimental proof of concept for a lightweight API to support an interactive
SDK playground. It is a simple express server with a couple of API endpoints to support
saving (in cache) and serving transpiled SDK examples.

Depending on the current state, this experiment may be available live (via fly.io) at

  * [https://playground.void.dev](https://playground.void.dev)

## Development

Use bun for development with the following tasks provided

```bash
> bun install    # install dependencies
> bun bundle     # build asset bundles
> bun dev        # start a development server (in watch mode)
> bun css        # start a tailwind server (in watch mode)
> bun start      # start production server
```

> NOTE: we use very little tailwind so you probably don't need the `bun css`
task in most cases. If you do add or edit any tailwind classes you can always
manually re-run `bun bundle` to regenerate a new version of `public/styles.css`

## Repository Structure

    └── public       - a static demo UX
    └── sdk          - SDK bundles
    └── src
        └── api.ts    - CORE API HERE
        └── server.ts - lightweight express server

## API

Ths API has 2 main endpoints

  * GET `/serve/:sid/:name?` - serve the game layout (and script files)
  * POST `/save/:sid/:name` - transpile and save a game script file

The idea being that you can generate a new `:sid` (session ID) however you desire
then use the first URL to serve up that game (e.g. in an iframe). By default it will
serve up a skeleton `index.html` page with a skeleton `main.ts` file that does nothing.

You can then provide an in browser editor to allow the user to provide their own contents
for `main.ts` and you can then use the save endpoint to transpile and cache that content
before live reloading your iframe

## CACHE

It is important to note that currently the transpiled modules are cached in memory, so if the
server is restarted any cached playground modules will be lost. If we turn this into something
real we should probably hook it up to a cheap REDIS server configured with sensible TTL values

## SDK BUNDLES

Since the browser cannot import the SDK directly (it's in a private repository), this repository
provides pre-bundled versions of the SDK in the `sdk` folder. If you upgrade the SKD version in
`package.json` be sure to also

  * update the `SDK_VERSION` constant in `src/api.ts`
  * re-run `bun bundle` to create new SDK bundles for that version

## Demo UX

The intention - if even needed - is for this repository to provide API support
for some other external playground or tutorial application, but it does include a simple
static demo (in `public/index.html`) that is served up as the default UX by
this express server. For this demo we assume the example has only 2 modules `main.ts`
and `config.ts`, but real examples can have any number of modules

  * [Demo Loom Video](https://www.loom.com/share/2e970959df3840d5a22ff22f480ea048)

![screenshot](./screenshot.png?raw=true)

## Known Issues

  * The demo IFRAME doesn't handle resize very well, you may need to refresh after a resize
  * The cache is in memory only and will be dropped on server restart
  * The static SDK bundles should probably get gzip/brotli versions
  * The demo UX should be replaced with something more robust
  * I don't know if we really need this in the end, a pure client side solution might be more appropriate

