# Personal TMA

Telegram Mini App for markdown reading, todo management (`todo.md`), and a unified activity feed.

## Documentation

The complete project documentation is here:

- [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md)

It includes:

- architecture choices and tradeoffs
- system design and module breakdown
- API and data model reference
- deployment and configuration guide
- development bug log with fixes

## Quick Start

```bash
npm install
npm run dev
```

## Deployment (Cloudflare OpenNext)

```bash
npm run deploy
```

Wrangler runtime secrets/vars (example):

```bash
wrangler secret put GITHUB_TOKEN
```
