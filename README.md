# Direx backlinks

A third-party plugin for [Direx](https://trydirex.com) that brings backlink data from DataForSEO, so
Direx's agents can prepare earned placements for a person to approve. It is not a link sender, a
marketplace or an exchange. The research behind it is r65 to r73 in the Direx workspace, and the
plan is `TASKS.md` #26 there.

## Status

- `src/dataforseo.ts`: the DataForSEO v3 client. A Workspace connects DataForSEO as one API key,
  `login:password`, which the client turns into Basic auth. It sends to `api.dataforseo.com` only,
  and reports what each call cost.
- The plugin itself comes next. It needs backlink query names (`links.*`) in the SDK's query
  catalogue first, which the Direx backlinks spec adds. Until then a third-party plugin can offer
  effects only.

## Develop

```
bun install
bun test
bun run typecheck
```

## How it runs in Direx

A Server admin installs the bundled `plugin.js` (see `docs/third-party-plugins.md` in the Direx
repo). It runs in Direx's sandbox and can reach only `api.dataforseo.com`. A Workspace Owner turns
it on and connects the DataForSEO key.

## Licence

MIT. See `LICENSE`.
