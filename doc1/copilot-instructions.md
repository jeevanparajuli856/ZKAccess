# Copilot Agent Instructions for This Repository

Status: Monorepo scaffolded with Rust (RISC Zero), Python (Flask), React, and Docker.

## Repo Snapshot
- Location: Windows workspace (PowerShell). Path separators: `\` in shell, `/` in links.
- Key dirs: `zk/` (Rust workspace: `methods/`, `prover-cli/`, `verifier-cli/`), `backend/` (Flask API), `frontend/` (Vite+React), `deploy/` (docker-compose db), `bench/` (k6).
- Core doc: `README.md` has architecture, commands, and demo flow.

## First Things First (Do This Before Coding)
- Verify toolchains: Rust stable + VS Build Tools, Python 3.11, Node 20, Docker Desktop. See `README.md` prerequisites.
- Start Postgres: `deploy/docker-compose.yml` exposes 5432.
- Export backend env or copy `.env.example` to `.env` when needed.

## Developer Workflows
- Build zk workspace: `cd zk && cargo build --release`
- Run backend (dev): `cd backend && .\.venv\Scripts\Activate.ps1 && flask --app app.routes run --port 8000`
- Run frontend (dev): `cd frontend && npm install && npm run dev`
- Seed demo users: `cd backend && .\.venv\Scripts\Activate.ps1 && python .\scripts\seed_demo_users.py --count 25`
- Prover CLI: `zk/target/release/prover-cli.exe --salt_hex ... --nonce_hex ... --password ...`
- Verifier CLI: `zk/target/release/verifier-cli.exe --receipt_b64 <...>`
- Load test: `cd bench && ./run_bench.ps1 -Scenario login`

## Collaboration Protocol
- Keep CLIs and backend/verifier contract stable: verifier outputs `{ commitment_hex, nonce_hex }` JSON to stdout.
- Update `README.md` whenever CLI args or API routes change.
- Small, focused PRs; include quick-start notes for any new commands.

## Project-Specific Conventions
- Commitment: `commitment = SHA-256(salt || password)`; nonce is echoed in journal to bind challenge.
- API paths rooted at `/api`; JWT cookie name: `zkaccess_jwt`.
- DB layer: SQLAlchemy; simple `create_all` on startup (migrations can be added via Alembic later).
- Windows-first commands in docs; prefer PowerShell-friendly paths.

## Safe Operations on Windows
- Prefer PowerShell-friendly paths and escape sequences; verify tools in PATH.
- Use UTF-8 and LF unless toolchain mandates CRLF; respect `.gitattributes` if present.

## Maintenance
- Update this file and `README.md` after changes to zk method, CLI flags, API routes, or DB schema. Reference concrete files and exact commands.

Questions to clarify with maintainers now:
- Intended language/framework and target runtime(s)?
- Existing repo to import or spec to follow?
- Preferred package manager and formatter?
