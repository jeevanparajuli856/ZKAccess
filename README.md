# ZKAccess: Zero-Knowledge Authentication Prototype

ZKAccess demonstrates privacy-preserving authentication using zero-knowledge proofs. Users prove knowledge of a password without revealing it. Built with RISC Zero zkVM (Rust), Flask (Python), static HTML/CSS/JS, and PostgreSQL.

**For a detailed walkthrough, concepts, and data flows, see [doc/README_DETAILED.md](doc/README_DETAILED.md).**

More docs
- [doc/QUICK_START.md](doc/QUICK_START.md)
- [doc/SETUP_GUIDE.md](doc/SETUP_GUIDE.md)
- [doc/RUST_CHEATSHEET.md](doc/RUST_CHEATSHEET.md)
- [doc/HANDOFF.md](doc/HANDOFF.md)

Key goals
- Sub-200 ms verification on server path (receipt verify)
- Proof generation under 2 s on a developer laptop
- 20+ demo users; end-to-end test at 100 concurrent users
- Clear path to integrate with ML-based Lateral Movement detection (JBEIL) and evolve toward zkML

What’s in this repo
- zk/ (Rust): RISC Zero guest method, `prover-cli` (client), `verifier-cli` (server)
- backend/ (Python): Flask API, SQLAlchemy models, JWT cookie auth
- frontend/ (static): HTML/CSS/JS with Register/Login flows
- deploy/ (Docker): Postgres via docker-compose
- bench/ (k6): E2E load script and runner

## Architecture Overview
- Guest method (no_std): reads {salt, password_utf8, nonce}; computes commitment = SHA-256(salt || password); commits journal { commitment, nonce }.
- Prover CLI (client-side): runs the guest to produce a receipt (base64) and journal.
- Verifier CLI (server-side): verifies receipt against the embedded METHOD_ID, returns journal as JSON.
- Flask backend: issues login challenges (nonces), calls verifier via subprocess, compares journal.commitment to stored commitment and journal.nonce to stored nonce, and returns a JWT cookie on success.
- Postgres: stores users {email, salt, commitment} and login_challenges {nonce, TTL, consumed}.

Data model
- users(id, email unique, salt bytea, commitment bytea, created_at, updated_at)
- login_challenges(id, user_id fk, nonce bytea, expires_at, consumed)

API endpoints
- POST /api/register/init { email } → { salt_hex }
- POST /api/register/commit { email, salt_hex, commitment_hex } → 200
- POST /api/login/init { email } → { challenge_id, salt_hex, nonce_hex }
- POST /api/login/complete { email, challenge_id, receipt_b64 } → Set-Cookie JWT
- POST /api/login/prove { email, challenge_id, password } → { receipt_b64, journal } (dev-only; gated by `ALLOW_INSECURE_PROVER=1`)
- GET /api/me → { authenticated, sub? }
- POST /api/logout → clears JWT cookie

Security properties (prototype)
- Password never leaves the client; server verifies a zk receipt.
- Nonce is one-time with TTL; prevents replay.
- JWT in HTTP-only cookie; SameSite=Lax; set Secure=True behind TLS.

## Quick Start (Windows)

**RISC Zero required**: This implementation uses real zkVM proving and verification. Install the RISC Zero toolchain via `rzup` before building (see https://dev.risczero.com/api/zkvm/install).

**Prerequisites**: Rust stable, Python 3.11, Docker Desktop
```powershell
winget install -e --id Rustlang.Rustup
winget install -e --id Microsoft.VisualStudio.2022.BuildTools
rustup default stable
winget install -e --id Python.Python.3.11
winget install -e --id Git.Git
winget install -e --id Grafana.k6
winget install -e --id Docker.DockerDesktop
```

Rust zkVM build:
```powershell
cd zk
cargo build --release
```

Start Postgres:
```powershell
cd deploy
docker compose up -d db
```

Backend setup and run (dev):
```powershell
cd ..\backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/zkaccess"
$env:JWT_SECRET="devsecret_change_me"
$env:VERIFIER_BIN="..\zk\target\release\verifier-cli.exe"
$env:PROVER_BIN="..\zk\target\release\prover-cli.exe"
$env:ALLOW_INSECURE_PROVER="1"
$env:CORS_ORIGINS="http://localhost:5173"
flask --app app.routes run --host 0.0.0.0 --port 8000
```

Seed demo users (optional, for bench):
```powershell
cd ..\backend
py -3.11 .\scripts\seed_demo_users.py --count 25
```

Frontend (static file server):
```powershell
cd ..\frontend
py -3.11 -m http.server 5173
```
Open http://localhost:5173 in a browser.

If you serve the frontend from a different origin than the Flask API, set
`CORS_ORIGINS` on the backend (comma-separated) and update the `data-api-base`
attribute in [frontend/index.html](frontend/index.html) to the backend URL.

Environment variables (backend)
- `DATABASE_URL`: Postgres connection string
- `JWT_SECRET`: JWT signing secret
- `VERIFIER_BIN`: Path to `verifier-cli.exe`
- `PROVER_BIN`: Path to `prover-cli.exe`
- `ALLOW_INSECURE_PROVER`: Enable dev-only `/api/login/prove`
- `CORS_ORIGINS`: Allowed frontend origins, comma-separated

## Prover and Verifier CLIs
Prover (run locally to produce a receipt for login):
```powershell
cd zk
target\release\prover-cli.exe `
  --email user1@example.com `
  --salt_hex <from /api/login/init> `
  --nonce_hex <from /api/login/init> `
  --password "Passw0rd1!"
```
Output: JSON with `receipt_b64` and `journal`.

Verifier (used by backend):
```powershell
target\release\verifier-cli.exe --receipt-b64 <paste-receipt>
```
Output: { commitment_hex, nonce_hex }.

## Quick Demo Flow
1) Register
	- In the UI, enter email/password → Init → shows salt_hex.
	- Click Commit (frontend computes SHA-256(salt||password) and sends commitment_hex).
2) Login
	- Click Login Init → copies salt_hex, nonce_hex, challenge_id.
	- If `ALLOW_INSECURE_PROVER=1`, the UI will request a dev receipt from `/api/login/prove` using your password.
	- Otherwise, run `prover-cli` locally with salt, nonce, and password → copy `receipt_b64` and paste it when prompted.
	- Click Complete → backend verifies via `verifier-cli` and sets JWT cookie.
3) Me
	- Visit `/api/me` or refresh UI to see authenticated state.

## Benchmarks
Micro (verify-only):
```powershell
cd zk
cargo bench -p verifier-cli
```

End-to-end (100 VUs):
```powershell
cd bench
./run_bench.ps1 -Scenario login
```

Targets: verify < 200 ms (server path), prover < 2 s on laptop.

## JBEIL Integration (Future Roadmap)
- **Immediate**: After successful zk auth, call JBEIL for a lateral movement risk score; attach to session claims or headers.
- **Binding**: Include a JBEIL decision ID in challenge context for audit linking (not in-circuit yet).
- **zkML evolution**: Start by committing feature vectors and model version in the zk journal; later, move a distilled model (e.g., logistic regression/MLP) into the guest for zk inference with a committed model hash.

## Risks & Mitigations
- Windows build friction: use VS Build Tools; if issues, build in Docker/WSL.
- Subprocess overhead: if verify path > 200 ms, switch to a resident verifier service process.
- DB contention at 100 VUs: tune SQLAlchemy pool (20/20), use production server (waitress/Gunicorn in container).
- Replay: enforce TTL and single-use of challenges.

## Status & Next Steps
- Status: zk guest computes commitment; CLIs and backend/frontend wired for end-to-end flow with optional dev prover helper.
- Next: tighten error handling, add Alembic migrations, replace dev prover with a real local client helper, and capture benchmark artifacts to `bench/results/`.

