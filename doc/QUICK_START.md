# Quick Start Guide (Windows)

This repo uses the real RISC Zero zkVM. The first build can take 10-15 minutes.

## Prerequisites
```powershell
winget install -e --id Rustlang.Rustup
winget install -e --id Microsoft.VisualStudio.2022.BuildTools
rustup default stable
winget install -e --id Python.Python.3.11
winget install -e --id Git.Git
winget install -e --id Docker.DockerDesktop
```

## Install RISC Zero Toolchain
Run from the x64 Native Tools prompt:
```powershell
cargo install cargo-risczero
cargo risczero install
```

## Build zkVM Workspace
```powershell
cd C:\Users\Jeevan\Desktop\ZKVM\zk
cargo build --release
```

## Start Services
### 1) PostgreSQL
```powershell
cd C:\Users\Jeevan\Desktop\ZKVM\deploy
docker compose up -d db
```

### 2) Backend
```powershell
cd C:\Users\Jeevan\Desktop\ZKVM\backend
py -3.11 -m venv .venv
\.venv\Scripts\Activate.ps1
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

### 3) Frontend (static)
```powershell
cd C:\Users\Jeevan\Desktop\ZKVM\frontend
py -3.11 -m http.server 5173
```
Open http://localhost:5173

## Demo Flow
1) Register: Init to get `salt_hex`, Commit to store `commitment_hex`.
2) Login: Init to get `nonce_hex`, Prove (dev-only) or run `prover-cli`, then Complete.
3) Verify authentication via `/api/me`.

## Troubleshooting (Windows)
If `cargo risczero install` fails, rerun from the x64 Native Tools prompt and capture the first C++ error:
```powershell
$env:CC_ENABLE_DEBUG_OUTPUT=1
$env:RUST_BACKTRACE=1
cargo risczero install
```
Paste the first compiler error line for a targeted fix.
