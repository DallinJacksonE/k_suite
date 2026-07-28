# Kaylie's Creations shared package

## What it is

`@k_suite/shared` contains TypeScript contracts shared by the backend, client, and admin apps. It exports DTOs and domain types for API boundaries, plus shared React toast UI/CSS subpath exports used by both frontends.

Use this package for cross-boundary shapes so backend route responses, admin forms, and client presenters do not drift into duplicate local interfaces.

## How to set up for development

Install and build from this directory:

```sh
npm ci
npm run build
```

Run the contract/type check:

```sh
npm test
```

When shared exports change, rebuild this package before building backend, client, or admin so their `file:../shared` dependency sees fresh `dist` declarations.

## How to deploy

The shared package is not deployed as a standalone service. Each Dockerfile builds `shared` first and copies the generated `dist/` files into the backend, client, or admin image that depends on it.

Secrets needed: none.
