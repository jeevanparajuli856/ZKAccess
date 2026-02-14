# Quick Start Guide

## Current Status
✅ Rust installed (1.92.0)
🔄 RISC Zero installing (wait ~10 more minutes)
⏳ Pending: cargo risczero install

## What to Download/Install

### Already Installed
- ✅ Rust toolchain
- ✅ PostgreSQL (Docker)
- ✅ Python 3.11 + Flask
- ✅ Node.js + npm

### Installing Now
- 🔄 `cargo-risczero` (background terminal)

### Need After Current Install Finishes
- ⏳ RISC Zero toolchain: `cargo risczero install`

## Next Steps (Do After Installation)

### 1. Complete RISC Zero Setup
```powershell
# After cargo install cargo-risczero finishes:
cargo risczero install
```

### 2. Build the Project
```powershell
cd C:\Users\Jeevan\Desktop\ZKVM\zk
cargo build --release
# This will take 10-15 minutes first time
```

### 3. Start All Services
```powershell
# Terminal 1: PostgreSQL
cd deploy
docker-compose up -d

# Terminal 2: Flask Backend
cd backend
.\.venv\Scripts\Activate.ps1
$env:VERIFIER_BIN="C:\Users\Jeevan\Desktop\ZKVM\zk\target\release\verifier-cli.exe"
flask --app app.routes run --port 8000 --debug

# Terminal 3: React Frontend
cd frontend
npm run dev
```

### 4. Test the Demo
1. Open http://localhost:5173
2. Register: See salt + commitment
3. Login: See prover output + verifier output + database state

## What You'll See

### Registration
```
Frontend Display:
├─ Step 1: Email entered
├─ Step 2: Salt received from server
│   └─ salt_hex: "a1b2c3d4e5f6..."
├─ Step 3: Commitment computed
│   ├─ input: salt + password
│   ├─ computation: SHA-256
│   └─ commitment_hex: "1a2b3c4d5e6f..."
└─ Step 4: Stored in database ✓
```

### Login  
```
Frontend Display:
├─ Step 1: Challenge received
│   ├─ salt_hex: "a1b2c3d4e5f6..."
│   ├─ nonce_hex: "fedcba9876..."
│   └─ challenge_id: "uuid-1234"
├─ Step 2: Prover generates receipt
│   ├─ Inputs: salt, nonce, password
│   ├─ Guest executes in zkVM
│   ├─ METHOD_ID: [0x1a2b3c4d...]
│   └─ receipt_b64: "eyJwcm9vZi..."
├─ Step 3: Verifier validates
│   ├─ METHOD_ID check ✓
│   ├─ Proof valid ✓
│   ├─ Journal: {commitment, nonce}
│   └─ Extracted successfully
├─ Step 4: Backend compares
│   ├─ Commitment match ✓
│   ├─ Nonce match ✓
│   └─ Challenge consumed ✓
└─ Step 5: JWT issued ✓
```

## Files Being Created

I'm creating these files for the detailed demo:

1. **zk/methods/guest/src/main.rs** - Guest code (SHA-256 in zkVM)
2. **zk/methods/build.rs** - Generates METHOD_ID
3. **zk/Cargo.toml** - Updated with RISC Zero dependencies
4. **frontend/src/components/DetailedRegister.tsx** - Verbose registration UI
5. **frontend/src/components/DetailedLogin.tsx** - Verbose login UI with all details
6. **backend/app/routes.py** - Updated with detailed logging

## Estimated Timings

- RISC Zero install: ~10-15 minutes total (5-10 min remaining)
- `cargo risczero install`: ~2-3 minutes
- Project build: ~10-15 minutes (first time)
- Incremental builds: ~2-3 minutes
- Prover execution: ~2-5 seconds per login
- Verifier execution: ~100-200ms

## Troubleshooting

### If Build Fails on Windows
```powershell
# Option 1: Install Visual Studio Build Tools
# https://visualstudio.microsoft.com/downloads/

# Option 2: Use WSL2 (Recommended)
wsl --install -d Ubuntu
# Then build inside WSL
```

### If Verifier Not Found
```powershell
# Check path
$env:VERIFIER_BIN
# Should be: C:\Users\Jeevan\Desktop\ZKVM\zk\target\release\verifier-cli.exe

# Test manually
.\zk\target\release\verifier-cli.exe --help
```

## What Makes This Demo Special

### You'll See Everything
- ✅ Salt generation (server)
- ✅ Commitment computation (client)
- ✅ Nonce generation (server)
- ✅ Receipt creation (prover, real zk-SNARK)
- ✅ METHOD_ID verification (verifier)
- ✅ Journal extraction (verifier)
- ✅ Database comparisons (backend)
- ✅ JWT issuance (backend)

### Real RISC Zero vs Mock
- ✅ Real cryptographic proof (~100-300 KB)
- ✅ METHOD_ID enforced
- ✅ Unforgeable receipts
- ✅ Tamper-evident
- ❌ (Mock was just JSON, no crypto)
