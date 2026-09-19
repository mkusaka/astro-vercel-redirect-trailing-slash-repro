import { existsSync, readFileSync } from 'node:fs';

const configPath = '.vercel/output/config.json';
if (!existsSync(configPath)) {
  console.error('run `pnpm build` (or `astro build`) first');
  process.exit(2);
}

const { routes } = JSON.parse(readFileSync(configPath, 'utf8'));

// @vercel/routing-utils convertTrailingSlash(true) emits this rule.
const TRAILING_SLASH_ADD_SRC = '^/((?:[^/]+/)*[^/\\.]+)$';

const tsIndex = routes.findIndex((r) => r.src === TRAILING_SLASH_ADD_SRC);
const redirectIndex = routes.findIndex((r) => r.status === 301 && r.headers?.Location === '/new/');
const redirect = routes[redirectIndex];

console.log('trailing-slash rule index:', tsIndex);
console.log('redirect route index    :', redirectIndex);
console.log('redirect src            :', redirect?.src);

const matches = (p) => redirect && new RegExp(redirect.src).test(p);
console.log('redirect matches "/old" :', matches('/old'));
console.log('redirect matches "/old/":', matches('/old/'));

const bug = tsIndex !== -1 && tsIndex < redirectIndex && matches('/old') && !matches('/old/');
console.log(
  bug
    ? '\nBUG: /old -> 308 /old/ -> matches no redirect -> 404'
    : '\nLooks correct: redirects win over trailing-slash normalization',
);
process.exit(bug ? 1 : 0);
