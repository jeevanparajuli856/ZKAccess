# RISC Zero zk-SNARK Simulation: Complete Flow with Hex & Hashes

## What RISC Zero Provides

Yes, RISC Zero **already has** the prover and verifier:
- **`risc0_zkvm::default_prover()`** - generates zk proofs (you call this in prover-cli)
- **`Receipt::verify(METHOD_ID)`** - validates proofs (you call this in verifier-cli)
- You don't write the prover/verifier logic; RISC Zero does it for you

What YOU write:
- **Guest code** (what runs inside zkVM)
- **Prover CLI wrapper** (calls `default_prover()`)
- **Verifier CLI wrapper** (calls `receipt.verify()`)

---

## Real-World Simulation: User "alice@example.com" Logs In

### Given Values
```
email:     alice@example.com
password:  MyPassword123!
salt:      a1b2c3d4e5f6g7h8 (16 random bytes, hex)
nonce:     fedcba9876543210 (16 random bytes, hex)
```

---

## STEP 1: Registration (User creates account)

### 1a. Server generates salt
```
salt_hex = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"  (64 chars = 32 bytes in hex)
Server sends to client: { salt_hex }
```

### 1b. Client browser computes commitment
```
// Inside browser (JavaScript or Rust WASM)
salt_bytes   = hex_decode("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6")
password_bytes = UTF-8("MyPassword123!")
combined = salt_bytes || password_bytes
commitment = SHA-256(combined)
commitment_hex = hex_encode(commitment)

// Result:
salt_bytes:        [0xa1, 0xb2, 0xc3, 0xd4, ..., 0xp6]  (32 bytes)
password_bytes:    [0x4d, 0x79, 0x50, 0x61, ..., 0x21]  (13 bytes)
combined:          [0xa1, 0xb2, ..., 0x4d, 0x79, ..., 0x21]  (45 bytes total)
commitment:        [0x1a, 0x2b, 0x3c, 0x4d, ..., 0xff]  (32 bytes = SHA-256 output)
commitment_hex:    "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6pqrstuvwxyz..."
```

### 1c. Server stores in database
```sql
INSERT INTO users (email, salt, commitment) VALUES (
  'alice@example.com',
  'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6pqrstuvwxyz...'
);
```

✓ Registration complete. Password **never** stored on server.

---

## STEP 2: Login Init (User wants to log in)

### 2a. Browser sends email to server
```
POST /api/login/init
Body: { email: "alice@example.com" }
```

### 2b. Server looks up user & generates nonce
```python
# backend/app/routes.py
user = db.query(User).filter_by(email="alice@example.com").first()
nonce = os.urandom(16)  # 16 random bytes
nonce_hex = nonce.hex()  # Convert to hex string

# Server stores challenge in DB
challenge = LoginChallenge(
    user_id=user.id,
    nonce=nonce_hex,
    created_at=datetime.now(timezone.utc),
    expires_at=datetime.now(timezone.utc) + timedelta(minutes=2),
    consumed=False
)
db.session.add(challenge)
db.session.commit()

# Retrieve salt from DB
salt_hex = user.salt  # "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"

# Send to client
response = {
    "salt_hex": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "nonce_hex": "fedcba9876543210fedcba9876543210",
    "challenge_id": "uuid-1234-5678"
}
```

### 2c. Server sends back
```
HTTP 200
{
  "salt_hex": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "nonce_hex": "fedcba9876543210fedcba9876543210",
  "challenge_id": "uuid-1234-5678"
}
```

✓ Client has salt + nonce. Ready for proof generation.

---

## STEP 3: Prover Generates zk-SNARK Receipt

### 3a. User runs prover-cli locally
```powershell
cd C:\Users\Jeevan\Desktop\ZKVM\zk

.\target\release\prover-cli.exe `
  --email alice@example.com `
  --salt_hex "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" `
  --nonce_hex "fedcba9876543210fedcba9876543210" `
  --password "MyPassword123!"
```

### 3b. Prover CLI prepares input
```rust
// zk/prover-cli/src/main.rs
let input = ProofInput {
    salt: hex::decode("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6").unwrap(),
    password: "MyPassword123!".as_bytes().to_vec(),
    nonce: hex::decode("fedcba9876543210fedcba9876543210").unwrap(),
};

// In binary form:
// salt:     [0xa1, 0xb2, 0xc3, 0xd4, ..., 0xp6]  (32 bytes)
// password: [0x4d, 0x79, 0x50, 0x61, ..., 0x21]  (13 bytes "MyPassword123!")
// nonce:    [0xfe, 0xdc, 0xba, 0x98, ..., 0x10]  (16 bytes)
```

### 3c. Prover calls RISC Zero to generate proof
```rust
// zk/prover-cli/src/main.rs
let env = ExecutorEnv::builder()
    .write(&input)
    .expect("write input")
    .build()
    .expect("build env");

let prover = default_prover();

// THIS IS THE KEY STEP: RISC Zero generates the zk-SNARK
let receipt = prover
    .prove(env, GUEST_BINARY)  // ← Runs guest inside zkVM
    .expect("prove")
    .receipt;

// receipt is a cryptographic proof that:
// "This zk-SNARK proves that the guest code ran with these inputs
//  and produced these outputs, without revealing the inputs"
```

### 3d. Inside the zkVM (guest code executes)
```rust
// zk/methods/src/bin/guest.rs
#[no_mangle]
pub extern "C" fn main() {
    let input: ProofInput = env::read();  // Reads the 3 inputs above
    
    // Compute commitment
    let mut hasher = Sha256::new();
    hasher.update(&input.salt);
    hasher.update(&input.password);
    let commitment = hasher.finalize().to_vec();
    
    // Output the proof
    let output = ProofOutput {
        commitment,         // SHA-256(salt || password)
        nonce: input.nonce.clone(),  // Echo nonce back
    };
    
    env::commit(&output);  // Write to journal
}

// Step-by-step execution:
// 1. Read input: { salt, password, nonce }
// 2. Compute: commitment = SHA-256([0xa1, 0xb2, ..., 0x4d, 0x79, ..., 0x21])
//             = [0x1a, 0x2b, 0x3c, 0x4d, ..., 0xff]  (32 bytes)
// 3. Output: { commitment: [0x1a, 0x2b, ...], nonce: [0xfe, 0xdc, ...] }
// 4. Commit to journal (this becomes the public output)
```

### 3e. RISC Zero generates cryptographic proof
```
RISC Zero internally:
┌─────────────────────────────────────────────────────────────┐
│  Input Commitment:                                          │
│  - Hash of: { salt, password, nonce }                      │
│  - This binds the proof to these exact inputs              │
│                                                              │
│  Execution Trace:                                          │
│  - Records every CPU cycle of guest code                   │
│  - Proves: "These outputs came from this code"            │
│  - Without revealing: salt or password                     │
│                                                              │
│  Proof (zk-SNARK):                                         │
│  - ~100-200 KB compact binary proof                        │
│  - Tied to METHOD_ID (hash of guest binary)               │
│  - Cryptographically unforgeable                          │
│                                                              │
│  Journal (Public Output):                                  │
│  - commitment: [0x1a, 0x2b, 0x3c, 0x4d, ...]            │
│  - nonce:      [0xfe, 0xdc, 0xba, 0x98, ...]            │
│  - (Readable by anyone; proves what guest computed)       │
│                                                              │
│  Receipt = { proof, journal, METHOD_ID }                  │
│  - Binary structure, ~200-300 KB total                     │
└─────────────────────────────────────────────────────────────┘
```

### 3f. Prover encodes receipt as base64
```rust
// zk/prover-cli/src/main.rs
let receipt_bytes = bincode::serialize(&receipt).expect("serialize");
let receipt_b64 = STANDARD.encode(&receipt_bytes);

// Result:
receipt_b64 = "eyJwcm9vZiI6eyJjb21taXRtZW50IjoiMWEyYjNjNGQiLCJub25jZSI6ImZlZGNiYSJ9Li4u..."
// (Long base64 string, ~300-400 chars)
```

### 3g. Prover outputs JSON
```json
{
  "email": "alice@example.com",
  "receipt_b64": "eyJwcm9vZiI6eyJjb21taXRtZW50IjoiMWEyYjNjNGQiLCJub25jZSI6ImZlZGNiYSJ9Li4u..."
}
```

✓ Proof generated. User copies `receipt_b64`.

---

## STEP 4: Verifier Checks zk-SNARK Receipt

### 4a. Browser sends receipt to server
```
POST /api/login/complete
Body: {
  "email": "alice@example.com",
  "challenge_id": "uuid-1234-5678",
  "receipt_b64": "eyJwcm9vZiI6eyJjb21taXRtZW50IjoiMWEyYjNjNGQiLCJub25jZSI6ImZlZGNiYSJ9Li4u..."
}
```

### 4b. Flask backend calls verifier subprocess
```python
# backend/app/routes.py
import subprocess
import json

receipt_b64 = request.json["receipt_b64"]
verifier_bin = os.getenv("VERIFIER_BIN")

result = subprocess.run(
    [verifier_bin, "--receipt_b64", receipt_b64],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    return {"error": "Verification failed"}, 400

journal_output = json.loads(result.stdout)
# journal_output = {
#   "commitment_hex": "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6pqrstuvwxyz...",
#   "nonce_hex": "fedcba9876543210fedcba9876543210"
# }
```

### 4c. Verifier CLI decodes & validates receipt
```rust
// zk/verifier-cli/src/main.rs
let args = Args::parse();  // --receipt_b64 "eyJ..."

// Decode base64
let receipt_bytes = STANDARD
    .decode(&args.receipt_b64)
    .expect("invalid base64");

// Deserialize binary
let receipt: Receipt = bincode::deserialize(&receipt_bytes)
    .expect("deserialize receipt");

// THIS IS THE KEY STEP: Cryptographic verification
receipt.verify(METHOD_ID)  // ← RISC Zero verifier checks:
    .expect("receipt verification failed");
    // 1. Is the proof valid?
    // 2. Was it generated by guest with this METHOD_ID?
    // 3. Has anyone tampered with the proof?
    // 4. All good? Extract the journal
```

### 4d. RISC Zero verifier internally
```
RISC Zero verify process:
┌─────────────────────────────────────────────────────────────┐
│  1. Decode receipt (binary)                                │
│  2. Extract proof, journal, METHOD_ID from receipt        │
│  3. Hash guest binary → compute its METHOD_ID              │
│     Does received METHOD_ID == computed METHOD_ID?        │
│     ✓ YES → guest code is authentic                       │
│  4. Cryptographic verification of proof:                  │
│     Check: proof signature is valid?                      │
│     Check: journal matches proof?                         │
│     ✓ YES → proof is unforgeable                          │
│  5. If both checks pass → Extract journal                 │
│     Return: { commitment_hex, nonce_hex }                 │
│  6. If any check fails → Return error                     │
│     Receipt is invalid, don't proceed                     │
└─────────────────────────────────────────────────────────────┘
```

### 4e. Verifier outputs journal
```json
{
  "commitment_hex": "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6pqrstuvwxyz...",
  "nonce_hex": "fedcba9876543210fedcba9876543210"
}
```

✓ Receipt verified. Journal extracted.

---

## STEP 5: Server Validates & Issues JWT

### 5a. Backend compares journal with database
```python
# backend/app/routes.py
user = db.query(User).filter_by(email="alice@example.com").first()
challenge = db.query(LoginChallenge).filter_by(
    id=request.json["challenge_id"]
).first()

# Check 1: Does commitment match?
if journal_output["commitment_hex"] != user.commitment:
    return {"error": "Wrong password"}, 401  # Commitment mismatch!

# Check 2: Does nonce match?
if journal_output["nonce_hex"] != challenge.nonce_hex:
    return {"error": "Nonce mismatch (replay attack?)"}, 401

# Check 3: Is challenge expired?
if challenge.expires_at < datetime.now(timezone.utc):
    return {"error": "Challenge expired"}, 401

# Check 4: Is challenge already used?
if challenge.consumed:
    return {"error": "Nonce already used (replay attack!)"}, 401

# All checks passed!
challenge.consumed = True
db.session.commit()
```

### 5b. If all checks pass → Issue JWT
```python
# backend/app/routes.py
jwt_token = create_access_token(user.id)

response = make_response(
    jsonify({"message": "Login successful"}),
    200
)
response.set_cookie(
    "zkaccess_jwt",
    jwt_token,
    httponly=True,
    samesite="Strict",
    max_age=3600
)

return response
```

### 5c. Browser receives JWT cookie
```
Set-Cookie: zkaccess_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; SameSite=Strict
```

✓ **Login successful!** User is authenticated.

---

## Security: Why This Works

### Attack 1: User enters wrong password
```
Wrong password: "WrongPassword123!"
Prover computes: SHA-256(salt || "WrongPassword123!")
Result: commitment = "9x8y7w6v5u4t3s2r..." (different!)

Server checks:
  journal.commitment ("9x8y7w...") != user.commitment ("1a2b3c...")
  ✗ MISMATCH → Login denied
  
Attacker gains nothing; password never revealed.
```

### Attack 2: Attacker replays old proof
```
Attacker captures old receipt_b64 from network
Attacker tries to replay it days later

Server checks:
  ✓ commitment matches ✓ (same user, same password)
  ✓ nonce matches... ✗ WAIT, challenge is already consumed!
  challenge.consumed == True
  ✗ REJECTED → Replay attack prevented
```

### Attack 3: Attacker forges a receipt
```
Attacker modifies receipt_b64 to fake a different commitment

Verifier runs: receipt.verify(METHOD_ID)
RISC Zero checks: Is this proof valid?
Cryptographic answer: NO
  (Receipt is tampered, signature is broken)
✗ Verification fails → Fake receipt rejected
```

### Attack 4: Network eavesdropper sees receipt
```
Eavesdropper captures receipt_b64 on network
Eavesdropper tries to use it

Server checks:
  ✓ Verification passes
  ✓ commitment matches
  ✓ nonce matches...
  BUT! nonce.consumed == True (already used)
  ✗ REJECTED → One-time use enforced
```

---

## Comparison: Mock vs. Real RISC Zero

| Aspect | Current Mock | Real RISC Zero zk-SNARK |
|--------|---|---|
| **Proof generation** | No proof; just JSON | Cryptographic zk-SNARK |
| **Prover code** | Computes hash locally | Calls RISC Zero `default_prover()` |
| **Receipt format** | Base64 JSON | Base64 binary proof |
| **Verifier code** | Parses JSON | Calls `receipt.verify(METHOD_ID)` |
| **Tamper detection** | No; relies on comparison | Yes; cryptographic proof fails |
| **Security guarantee** | Operational (commitments match) | Cryptographic (proof is unforgeable) |
| **Trust model** | Trust that both prover & verifier are correct | Trust RISC Zero's math; code can be any length |

---

## Key Takeaway: What RISC Zero Does For You

```
You write:
  ✓ Guest code (what to compute: SHA-256, etc.)
  ✓ Prover CLI (calls risc0_zkvm::default_prover())
  ✓ Verifier CLI (calls receipt.verify(METHOD_ID))

RISC Zero provides:
  ✓ default_prover() - generates unforgeable proofs
  ✓ Receipt::verify() - checks proofs cryptographically
  ✓ METHOD_ID - ties proof to your specific guest code
  ✓ Journal encoding - packages your outputs securely

Result:
  ✓ You get cryptographically sound zero-knowledge proofs
  ✓ No password ever revealed
  ✓ Proofs can't be forged or replayed
  ✓ Client can be untrusted; only the proof matters
```

---

## Interview Answer

**"How does RISC Zero work in this system?"**

"RISC Zero is a zkVM framework that does three things for us:

1. **Prover**: We call `default_prover()` to run guest code and generate a zk-SNARK proof. The prover never reveals inputs (salt, password), only the proof that the computation was correct.

2. **Verifier**: The verifier calls `receipt.verify(METHOD_ID)` to cryptographically check the proof. If anyone tries to forge or tamper with the proof, verification fails.

3. **METHOD_ID**: This is a fingerprint of our guest binary. It ensures that the verifier only accepts proofs from the exact guest code we wrote. If the guest changes, METHOD_ID changes, and old proofs are rejected.

The key insight: We don't have to write the prover or verifier logic. RISC Zero does the heavy crypto. We just write the guest algorithm and let RISC Zero generate proofs for it."
