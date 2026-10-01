# Contributing to soundhub

soundhub plays, loops, fades and pans sounds, places them in 3D, cuts sprites and
streams long files. It ships zero dependencies and runs in the browser, so keeping
the public surface small and the tests honest matters more than speed.

## Get started

```bash
npm install
npm run dev
```

`npm run dev` starts Vite in `examples` mode, the live examples page you can open in
a browser. The page imports the library straight from `src/`, so it is the fastest
way to see a change in action. The page itself is `examples/demo.ts`: add what you
need there, watch the page, and reproduce a bug there before you fix it.

The folders `examples/react`, `examples/angular`, `examples/vue` and
`examples/svelte` are separate projects with their own `package.json`. They install
soundhub from npm. To work on one, run `npm install` inside that folder.

## Before you send a pull request

Run both of these:

```bash
npm run typecheck     # tsc --noEmit, over src/, tests/ and the example page
npm test              # the full Vitest suite, once
```

While you work, `npm run test:watch` reruns the tests on every save. `npm run
test:coverage` is the same suite with coverage, useful when you touch a code path
that has no test.

## Writing tests

A bug fix should come with a test that fails without it. soundhub runs its whole
suite in jsdom with a Web Audio mock in `tests/support`, so you do not need a real
browser: nodes remember their connections, audio params remember their value, and
the clock only moves when a test moves it. Look at an existing test in `tests/`
for the shape, and add yours next to it.

## Where things go

Questions, ideas and things you built with soundhub go in
[Discussions](https://github.com/chriscreativecode/soundhub/discussions). If you hit
an edge case, a small reproduction in the examples page is the fastest way to get it
fixed.
