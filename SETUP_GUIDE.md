# Complete RISC Zero ZKAccess Setup Guide

## Prerequisites Installation

### 1. Install RISC Zero Tools

```powershell
# Install cargo-risczero (REQUIRED)
cargo install cargo-risczero

# Install RISC Zero toolchain
cargo risczero install

# Verify installation
cargo risczero --version
```

### 2. Install Additional Components (if needed on Windows)

If you encounter build errors on Windows:

```powershell
# Option A: Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
# Select "Desktop development with C++"

# Option B: Use WSL2 (Recommended for complex builds)
wsl --install -d Ubuntu
# Then install Rust inside WSL and build there
```

---

## What You Need to Download/Install

✅ **Already Have:**
- Rust 1.92.0 ✓
- Cargo ✓
- PostgreSQL (via Docker) ✓
- Python 3.11 + Flask ✓
- Node.js + npm ✓

⬇️ **Need to Install:**
- `cargo-risczero` ← Installing now
- RISC Zero toolchain ← After cargo-risczero installs

---

## Project Structure (What We'll Build)

```
ZKVM/
├─ zk/                          # RISC Zero workspace
│  ├─ methods/
│  │  ├─ guest/                # Guest code (runs in zkVM)
│  │  │  └─ src/
│  │  │     └─ main.rs         # SHA-256 commitment computation
│  │  └─ build.rs              # Generates METHOD_ID
│  ├─ prover-cli/              # Client-side prover
│  │  └─ src/main.rs
│  └─ verifier-cli/            # Server-side verifier
│     └─ src/main.rs
├─ backend/                     # Flask API with detailed logging
│  ├─ app/
│  │  ├─ routes.py            # Endpoints with verbose output
│  │  └─ models.py
│  └─ .env                     # VERIFIER_BIN path
├─ frontend/                    # React with detailed display
│  └─ src/
│     ├─ components/
│     │  ├─ DetailedRegister.tsx  # Shows salt, commitment
│     │  └─ DetailedLogin.tsx     # Shows receipt, journal
│     └─ App.tsx
└─ deploy/
   └─ docker-compose.yml       # PostgreSQL
```

---

## Build Steps (After Installation Completes)

### Step 1: Build RISC Zero Guest & CLIs

```powershell
cd C:\Users\Jeevan\Desktop\ZKVM\zk

# Build with RISC Zero
cargo build --release

# This will:
# 1. Compile guest code for zkVM
# 2. Generate METHOD_ID
# 3. Build prover-cli.exe with METHOD_ID embedded
# 4. Build verifier-cli.exe with METHOD_ID embedded
```

### Step 2: Set Backend Environment

```powershell
cd C:\Users\Jeevan\Desktop\ZKVM\backend

# Create/update .env file
echo "VERIFIER_BIN=C:\Users\Jeevan\Desktop\ZKVM\zk\target\release\verifier-cli.exe" > .env
echo "JWT_SECRET=your-secret-key-here" >> .env
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/zkaccess" >> .env
```

### Step 3: Start Services

```powershell
# Terminal 1: Start PostgreSQL
cd C:\Users\Jeevan\Desktop\ZKVM\deploy
docker-compose up -d

# Terminal 2: Start Flask backend
cd C:\Users\Jeevan\Desktop\ZKVM\backend
.\.venv\Scripts\Activate.ps1
flask --app app.routes run --port 8000 --debug

# Terminal 3: Start React frontend
cd C:\Users\Jeevan\Desktop\ZKVM\frontend
npm run dev
```

### Step 4: Access Application

```
Frontend:  http://localhost:5173
Backend:   http://localhost:8000
Database:  postgresql://localhost:5432/zkaccess
```

---

## What You'll See in the Demo

### Registration Flow

1. **User enters email + password**
2. **Frontend displays:**
   - Salt (hex) from server
   - Commitment (hex) computed in browser
   - SHA-256 calculation details
3. **Backend displays:**
   - Received commitment
   - Database INSERT query
   - Stored user record
4. **Database shows:**
   - `users` table with salt and commitment

### Login Flow

1. **User enters email + password**
2. **Frontend displays:**
   - Salt (hex) from server
   - Nonce (hex) from server
   - Challenge ID
   - Prover execution (in CLI or WASM)
   - Receipt (base64, truncated)
3. **Prover CLI shows:**
   - Input: salt, nonce, password
   - Computation: SHA-256(salt || password)
   - METHOD_ID: [0x1a2b3c4d, ...]
   - Receipt generation time
   - Output: receipt_b64
4. **Verifier CLI shows:**
   - Receipt received
   - METHOD_ID verification
   - Cryptographic proof check
   - Journal extraction: {commitment_hex, nonce_hex}
5. **Backend displays:**
   - Verifier output
   - Commitment comparison (DB vs receipt)
   - Nonce comparison (challenge vs receipt)
   - Challenge consumed
   - JWT issued
6. **Database shows:**
   - `login_challenges` table updated (consumed=true)

---

## Detailed Output Format

### Frontend (React)

```tsx
<div className="debug-panel">
  <h3>Step 1: Server Response</h3>
  <pre>{JSON.stringify(serverResponse, null, 2)}</pre>
  
  <h3>Step 2: Local Computation</h3>
  <div>Salt: {saltHex}</div>
  <div>Password: ****** (hidden)</div>
  <div>Commitment: {commitmentHex}</div>
  
  <h3>Step 3: Receipt Generation</h3>
  <div>Prover Output:</div>
  <pre>{receiptB64.substring(0, 100)}...</pre>
  
  <h3>Step 4: Verification Result</h3>
  <pre>{JSON.stringify(verificationResult, null, 2)}</pre>
</div>
```

### Backend (Flask)

```python
# Detailed logging in routes.py
logger.info(f"[REGISTER/INIT] Email: {email}")
logger.info(f"[REGISTER/INIT] Generated salt: {salt_hex}")

logger.info(f"[REGISTER/COMMIT] Received commitment: {commitment_hex}")
logger.info(f"[REGISTER/COMMIT] Storing to database...")

logger.info(f"[LOGIN/INIT] User found: {user.email}")
logger.info(f"[LOGIN/INIT] Generated nonce: {nonce_hex}")

logger.info(f"[LOGIN/COMPLETE] Calling verifier...")
logger.info(f"[LOGIN/COMPLETE] Verifier output: {journal_output}")
logger.info(f"[LOGIN/COMPLETE] Commitment match: {commitment_match}")
logger.info(f"[LOGIN/COMPLETE] Nonce match: {nonce_match}")
```

---

## Troubleshooting

### Build Errors

```powershell
# If guest build fails:
cargo risczero build

# If METHOD_ID not found:
cd zk/methods
cargo build
```

### Runtime Errors

```powershell
# If verifier not found:
echo $env:VERIFIER_BIN
# Should output: C:\Users\Jeevan\Desktop\ZKVM\zk\target\release\verifier-cli.exe

# Test verifier manually:
.\zk\target\release\verifier-cli.exe --help
```

### Database Errors

```powershell
# Reset database:
cd deploy
docker-compose down -v
docker-compose up -d

# Check tables:
docker exec -it zkaccess-db psql -U postgres -d zkaccess -c "\dt"
```

---

## Next Steps After Setup

1. **Register a user** → See salt + commitment in frontend
2. **Login with correct password** → See receipt generation + verification
3. **Login with wrong password** → See commitment mismatch
4. **Replay attack** → Reuse old receipt → See nonce consumed error
5. **Check database** → See stored commitments and consumed challenges

---

## Expected Timings

- RISC Zero installation: ~5-10 minutes
- Guest + CLI build: ~10-15 minutes (first time), ~2-3 minutes (incremental)
- Prover execution: ~2-5 seconds per login
- Verifier execution: ~100-200ms per verification
- End-to-end login: ~5-8 seconds total

---

## What Makes This Different from Mock

### Mock Version (Current)
- No real zk-SNARK proof
- Just JSON: `{"commitment_hex": "...", "nonce_hex": "..."}`
- No cryptographic verification
- METHOD_ID not enforced

### RISC Zero Version (Building Now)
- Real zk-SNARK proof (~100-300 KB binary)
- Cryptographic Receipt with proof + journal + METHOD_ID
- METHOD_ID cryptographically enforced
- Proof is unforgeable and tamper-evident

---

## File Changes Summary

### New Files
- `zk/methods/guest/src/main.rs` (guest code for zkVM)
- `zk/methods/build.rs` (generates METHOD_ID)
- `frontend/src/components/DetailedRegister.tsx`
- `frontend/src/components/DetailedLogin.tsx`

### Modified Files
- `zk/prover-cli/src/main.rs` (use real RISC Zero prover)
- `zk/verifier-cli/src/main.rs` (use real RISC Zero verifier)
- `backend/app/routes.py` (add detailed logging)
- `backend/.env` (add VERIFIER_BIN path)
