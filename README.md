# astro-vercel-redirect-trailing-slash-repro

Minimum reproduction: `@astrojs/vercel` emits redirect routes that can never match once trailing-slash normalization runs, so configured `redirects` return 404 on Vercel when `trailingSlash: 'always'`.

## Setup

- `astro@7.3.1`
- `@astrojs/vercel@11.0.10`

```js
// astro.config.mjs
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'always',
  redirects: { '/old': '/new/' },
});
```

## Reproduce

```sh
pnpm install
pnpm build
pnpm repro
```

Output:

```text
trailing-slash rule index: 1
redirect route index    : 3
redirect src            : ^/old$
redirect matches "/old" : true
redirect matches "/old/": false

BUG: /old -> 308 /old/ -> matches no redirect -> 404
```

## What the adapter generates

`.vercel/output/config.json` (committed in this repo) puts the generic trailing-slash rule **before** the explicit redirect, and the redirect source is a strict unslashed match:

```json
{ "src": "^/((?:[^/]+/)*[^/\\.]+)$", "headers": { "Location": "/$1/" }, "status": 308 },
{ "src": "^/old$", "headers": { "Location": "/new/" }, "status": 301 }
```

On Vercel this produces:

```text
GET /old   -> 308 /old/     (trailing-slash rule wins first)
GET /old/  -> no route matches (^/old$ requires no slash)
              -> filesystem miss -> 404
```

The redirect never fires for either form.

## Why it can't be fixed from `astro.config.mjs`

- `redirects: { '/old/': '/new/' }` produces the same `^/old$` regex — Astro normalizes redirect sources to route segments and drops the trailing slash.
- There is no way to express "match with or without a trailing slash" through the `redirects` config.

## Expected

Same fix as the one already applied to `@astrojs/underscore-redirects` in [withastro/astro#16034](https://github.com/withastro/astro/pull/16034) (issue [#16030](https://github.com/withastro/astro/issues/16030), same 404 class on the Cloudflare adapter): generate redirect patterns that respect `trailingSlash` — e.g. `^/old/$` under `'always'`, or a slash-optional pattern. `@astrojs/vercel` does not use `underscore-redirects` and still emits the unpatched pattern.
