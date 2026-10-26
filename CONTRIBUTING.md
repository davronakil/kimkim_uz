# Contributing

Thanks for helping improve KimKim.uz.

## Development

1. Clone the repo and run `npm install`
2. Copy `.dev.vars.example` → `.dev.vars` and fill placeholders (never commit real secrets)
3. `npm run db:migrate:local`
4. `npm run dev` → http://localhost:3000/uz (also `/en`, `/ru`)

See [README.md](./README.md) and [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the full env list.

## Guidelines

- Keep changes focused; prefer small, reviewable PRs
- Follow existing patterns in `src/lib/` (queries, auth, Telegram handler)
- Do not invent or share exploit PoCs against third parties — harden our code
- Add or update docs when behavior changes (especially auth, webhooks, secrets)
- Run `npm run lint` before opening a PR

## Security

Report vulnerabilities privately per [SECURITY.md](./SECURITY.md).
