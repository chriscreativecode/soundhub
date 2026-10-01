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
a browser. It is the fastest way to see a change in action: edit a sound in
`examples/`, watch the page, and reproduce a bug there before you fix it.

## Before you send a pull request

Run all of these; each one is what a reviewer will see:

```bash
npm run typecheck     # tsc --noEmit, over src/ and the examples
npm test              # the full Vitest suite, once
```

Keep the two in sync as you work with `npm run test:watch`. `npm run test:coverage`
is the same suite with coverage, useful when you touch a code path that has no test.

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
