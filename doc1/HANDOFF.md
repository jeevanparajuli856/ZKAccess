# Handoff Summary (Feb 14, 2026)

## Changes Made
- Implemented real zkVM proving in prover CLI: [zk/prover-cli/src/main.rs](zk/prover-cli/src/main.rs) now runs RISC Zero guest, encodes a real receipt, and includes journal output.
- Implemented real receipt verification in verifier CLI: [zk/verifier-cli/src/main.rs](zk/verifier-cli/src/main.rs) now decodes and verifies receipts against `COMMIT_ID` and outputs journal fields.
- Added RISC Zero method embedding:
  - Added build script [zk/methods/build.rs](zk/methods/build.rs)
  - Methods crate now includes embedded bindings in [zk/methods/src/lib.rs](zk/methods/src/lib.rs)
  - Updated dependencies in [zk/methods/Cargo.toml](zk/methods/Cargo.toml)
- Updated CLI crates to depend on RISC Zero + methods:
  - [zk/prover-cli/Cargo.toml](zk/prover-cli/Cargo.toml)
  - [zk/verifier-cli/Cargo.toml](zk/verifier-cli/Cargo.toml)
- Added dev-only prover endpoint for frontend/bench:
  - `/api/login/prove` in [backend/app/routes.py](backend/app/routes.py) calls `prover-cli` and returns `{ receipt_b64, journal }`
  - Guarded by `ALLOW_INSECURE_PROVER=1`
- Added backend config for prover and secure cookies in [backend/app/config.py](backend/app/config.py)
  - `PROVER_BIN`, `JWT_COOKIE_SECURE`, `ALLOW_INSECURE_PROVER`
- Frontend login flow updated to use dev prover when enabled, otherwise prompts for manual receipt:
  - [frontend/src/Login.tsx](frontend/src/Login.tsx)
- Bench updated to use `/api/login/prove` with seeded user passwords:
  - [bench/k6-login.js](bench/k6-login.js)
- Docs aligned with real zk flow, new dev helper, and flag `--receipt-b64`:
  - [README.md](README.md)
  - [README_DETAILED.md](README_DETAILED.md)

## How to Run (Dev)
- Build zk:
  ```powershell
  cd zk
  cargo build --release
  ```
- Backend env (dev helper enabled):
  ```powershell
  cd ..\backend
  $env:VERIFIER_BIN="..\zk\target\release\verifier-cli.exe"
  $env:PROVER_BIN="..\zk\target\release\prover-cli.exe"
  $env:ALLOW_INSECURE_PROVER="1"
  $env:JWT_SECRET="devsecret_change_me"
  flask --app app.routes run --host 0.0.0.0 --port 8000
  ```
- Frontend:
  ```powershell
  cd ..\frontend
  npm install
  npm run dev
  ```

## Known Decisions
- Keep register overwrite behavior for existing users.
- Standardize receipt flag to `--receipt-b64` (kebab-case).
- Keep dev-only prover helper (guarded by env var) for functional UI/bench.

## Remaining Work / Validation
- Run a full build of the zk workspace to ensure RISC Zero dependencies resolve.
- Verify end-to-end login in UI and `/api/me` using dev prover helper.
- Confirm bench works with `ALLOW_INSECURE_PROVER=1` and seeded users.
- If publishing:
  - Decide whether to keep `/api/login/prove` in release builds.
  - Set `JWT_COOKIE_SECURE=1` behind TLS.
