# How METHOD_ID is Embedded in Prover & Verifier

## Overview: The Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUILD TIME (Developer)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: Write Guest Code                                      │
│  ──────────────────────────                                     │
│  // filepath: zk/methods/src/main.rs                           │
│  pub fn main() {                                                │
│    let commitment = sha256(input);                              │
│    env::commit(&commitment);                                    │
│  }                                                              │
│                                                                  │
│           ↓                                                      │
│                                                                  │
│  STEP 2: Compile Guest Code                                    │
│  ────────────────────────────                                  │
│  $ cargo build --release                                       │
│  → Compiles to RISC-V binary (guest.elf)                       │
│  Size: ~50-200 KB (depends on complexity)                      │
│                                                                  │
│           ↓                                                      │
│                                                                  │
│  STEP 3: RISC Zero Computes METHOD_ID                          │
│  ────────────────────────────────────                          │
│  METHOD_ID = SHA256(guest.elf binary)                          │
│  = 0x1a2b3c4d5e6f... (32 bytes = 64 hex chars)               │
│                                                                  │
│  This is AUTOMATIC (you don't manually compute it)             │
│  Different guest code → Different METHOD_ID                    │
│  (impossible to collide)                                        │
│                                                                  │
│           ↓                                                      │
│                                                                  │
│  STEP 4: Embed METHOD_ID in Prover                             │
│  ──────────────────────────────────                            │
│  // filepath: zk/prover/src/main.rs                            │
│  use risc0_zkvm::default_prover;                               │
│  use methods::METHOD_ID;  // ← RISC Zero auto-generates this  │
│                                                                  │
│  fn main() {                                                    │
│    let env = ExecutorEnv::builder()                            │
│      .write(&input)                                             │
│      .build()                                                   │
│      .unwrap();                                                 │
│                                                                  │
│    let receipt = default_prover()                              │
│      .prove(&env, &GUEST_ELF)                                  │
│      .unwrap();                                                 │
│                                                                  │
│    // Receipt contains:                                         │
│    // ├─ proof (zk-SNARK seal)                                 │
│    // ├─ journal (commitment, nonce)                           │
│    // └─ method_id (0x1a2b3c4d... EMBEDDED HERE)              │
│                                                                  │
│    println!("{:?}", receipt);                                  │
│  }                                                              │
│                                                                  │
│  Compile: cargo build --release                                │
│  → prover-cli.exe (with METHOD_ID hardcoded inside)           │
│                                                                  │
│           ↓                                                      │
│                                                                  │
│  STEP 5: Embed METHOD_ID in Verifier                           │
│  ────────────────────────────────────                          │
│  // filepath: zk/verifier/src/main.rs                          │
│  use methods::METHOD_ID;  // ← Same auto-generated constant   │
│                                                                  │
│  fn main() {                                                    │
│    let receipt_bytes = /* decode receipt_b64 */;              │
│    let receipt: Receipt = bincode::deserialize(&receipt_bytes) │
│      .unwrap();                                                 │
│                                                                  │
│    // Verify: Does receipt's METHOD_ID match embedded?         │
│    assert_eq!(                                                  │
│      receipt.method_id,                                         │
│      METHOD_ID  // ← 0x1a2b3c4d... EMBEDDED HERE             │
│    );                                                           │
│                                                                  │
│    // If match: Verify the zk-SNARK proof                     │
│    receipt.verify(METHOD_ID).unwrap();                         │
│                                                                  │
│    // If valid: Extract and print journal                      │
│    println!("{:?}", receipt.journal);                          │
│  }                                                              │
│                                                                  │
│  Compile: cargo build --release                                │
│  → verifier-cli.exe (with METHOD_ID hardcoded inside)         │
│                                                                  │
│           ↓                                                      │
│                                                                  │
│  RESULT:                                                        │
│  ├─ prover-cli.exe contains METHOD_ID = 0x1a2b3c4d...        │
│  ├─ verifier-cli.exe contains METHOD_ID = 0x1a2b3c4d...      │
│  ├─ Both binaries have IDENTICAL METHOD_ID                    │
│  └─ This is cryptographically guaranteed by RISC Zero        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## How RISC Zero Auto-Generates METHOD_ID

### The Cargo Build Process

```powershell
# What you run:
$ cd zk
$ cargo build --release

# What happens internally:

STEP 1: Cargo reads Cargo.toml
├─ [package] name = "zk"
├─ [[bin]] name = "prover-cli" (points to prover/src/main.rs)
└─ [[bin]] name = "verifier-cli" (points to verifier/src/main.rs)

STEP 2: Cargo builds guest code
├─ Compiles: methods/src/main.rs (the guest code)
├─ Target: RISC-V instruction set (not x86)
├─ Output: methods/target/release/methods.elf (~100 KB)
└─ This is the guest BINARY

STEP 3: RISC Zero build script computes METHOD_ID
├─ Input: methods/target/release/methods.elf
├─ Computation: METHOD_ID = SHA256(methods.elf)
├─ Output: 0x1a2b3c4d5e6f... (32 bytes)
└─ Time: < 1 second

STEP 4: RISC Zero generates Rust constant
├─ Creates file: methods/src/lib.rs
├─ Contains:
│  pub const GUEST_ELF: &[u8] = b"<binary data>";
│  pub const METHOD_ID: [u32; 8] = [
│    0x1a2b3c4d,
│    0x5e6f7g8h,
│    0x...
│  ];
└─ This constant is PUBLIC (accessible to prover & verifier)

STEP 5: Cargo compiles prover-cli.exe
├─ Reads: prover/src/main.rs
├─ Imports: use methods::METHOD_ID
├─ Compilation: Links in the METHOD_ID constant
├─ Output: prover-cli.exe (with METHOD_ID hardcoded)
└─ Result: When prover-cli.exe runs, it HAS the METHOD_ID in memory

STEP 6: Cargo compiles verifier-cli.exe
├─ Reads: verifier/src/main.rs
├─ Imports: use methods::METHOD_ID (same constant!)
├─ Compilation: Links in the METHOD_ID constant
├─ Output: verifier-cli.exe (with METHOD_ID hardcoded)
└─ Result: When verifier-cli.exe runs, it HAS the same METHOD_ID

FINAL STATE:
├─ prover-cli.exe has METHOD_ID hardcoded = 0x1a2b3c4d...
├─ verifier-cli.exe has METHOD_ID hardcoded = 0x1a2b3c4d...
├─ Both executables link the SAME constant (from methods/src/lib.rs)
└─ Impossible to have different METHOD_IDs (cryptographically sealed)
```

---

## File Structure: Where METHOD_ID Lives

```
zk/
├─ Cargo.toml (workspace config)
│
├─ methods/                          ← Guest code
│  ├─ Cargo.toml
│  ├─ src/
│  │  └─ main.rs (guest computation)
│  └─ target/
│     └─ release/
│        └─ methods.elf ← Binary (used to compute METHOD_ID)
│
├─ build.rs (RISC Zero's build script - AUTO GENERATES METHOD_ID)
│
├─ methods/src/lib.rs (AUTO-GENERATED)
│  └─ Contains:
│     pub const GUEST_ELF: &[u8] = b"...";
│     pub const METHOD_ID: [u32; 8] = [0x1a2b..., ...];
│                           ↑ This is auto-generated!
│
├─ prover-cli/
│  ├─ Cargo.toml
│  ├─ src/
│  │  └─ main.rs (imports METHOD_ID from methods::lib.rs)
│  └─ target/
│     └─ release/
│        └─ prover-cli.exe ← CONTAINS METHOD_ID (hardcoded)
│
├─ verifier-cli/
│  ├─ Cargo.toml
│  ├─ src/
│  │  └─ main.rs (imports METHOD_ID from methods::lib.rs)
│  └─ target/
│     └─ release/
│        └─ verifier-cli.exe ← CONTAINS METHOD_ID (hardcoded)
│
└─ prover-wasm/ (optional: for browser)
   └─ Compiled to WASM (also has METHOD_ID embedded)
```

---

## Step-by-Step: Exact Build Commands & What Happens

### Build #1: First Time (Clean Build)

```powershell
PS> cd C:\Users\Jeevan\Desktop\ZKVM\zk

PS> cargo clean  # Remove old builds (start fresh)

PS> cargo build --release

# OUTPUT:
#   Compiling methods v0.1.0 (path/to/methods)
#     Finished `release` [optimized] target(s) in 5.23s
#
#   Compiling prover-cli v0.1.0 (path/to/prover-cli)
#     Finished `release` [optimized] target(s) in 12.45s
#
#   Compiling verifier-cli v0.1.0 (path/to/verifier-cli)
#     Finished `release` [optimized] target(s) in 8.67s

# What happened:
# 1. Compiled guest code (methods) → methods.elf
# 2. RISC Zero computed METHOD_ID = SHA256(methods.elf)
# 3. Generated methods/src/lib.rs with METHOD_ID constant
# 4. Compiled prover-cli.exe (linked in METHOD_ID constant)
# 5. Compiled verifier-cli.exe (linked same METHOD_ID constant)

# Verification:
PS> .\target\release\prover-cli.exe --help
# Output shows: "prover-cli" with METHOD_ID hardcoded inside

PS> .\target\release\verifier-cli.exe --help
# Output shows: "verifier-cli" with METHOD_ID hardcoded inside
```

### Build #2: After Modifying Guest Code

```powershell
# Let's say you modify methods/src/main.rs:
# Change: pub fn main() { ... }
# To:     pub fn main() { ... + one extra line ... }

PS> cargo build --release

# OUTPUT:
#   Compiling methods v0.1.0
#     Finished `release` ...
#
#   Compiling prover-cli v0.1.0
#     Finished `release` ...
#
#   Compiling verifier-cli v0.1.0
#     Finished `release` ...

# What happened:
# 1. Compiled MODIFIED guest code → NEW methods.elf (different binary)
# 2. RISC Zero computed NEW METHOD_ID = SHA256(NEW methods.elf)
#    ⚠️ NEW METHOD_ID ≠ OLD METHOD_ID
# 3. Generated NEW methods/src/lib.rs with NEW METHOD_ID
# 4. Compiled NEW prover-cli.exe (linked NEW METHOD_ID)
# 5. Compiled NEW verifier-cli.exe (linked NEW METHOD_ID)

# Result:
# ├─ prover-cli.exe now has NEW METHOD_ID inside
# ├─ verifier-cli.exe now has NEW METHOD_ID inside
# ├─ Old proofs generated with OLD METHOD_ID will NOT verify
# │  (because verifier has NEW METHOD_ID embedded)
# └─ This is the security mechanism!
```

---

## Why This Embedding Mechanism Prevents Tampering

### Attack Scenario: Attacker Modifies Guest Code

```
ATTACK:

Legitimate guest code:
  pub fn main() {
    let commitment = sha256(salt || password);
    env::commit(commitment);
  }

Attacker's evil guest code:
  pub fn main() {
    // Bypass commitment check
    env::commit(user_controlled_commitment);  // EVIL!
  }

---

DEFENSE MECHANISM:

Step 1: Attacker compiles evil guest code
├─ cargo build --release (on attacker's machine)
├─ Evil methods.elf is generated
├─ RISC Zero computes METHOD_ID_EVIL = SHA256(evil methods.elf)
├─ METHOD_ID_EVIL ≠ METHOD_ID (original)
└─ Evil prover-cli.exe has METHOD_ID_EVIL hardcoded

Step 2: Attacker generates proof with evil code
├─ receipt = evil_prover.prove(...)
├─ receipt.method_id = METHOD_ID_EVIL (embedded by evil prover)
└─ Evil proof generated successfully (but with wrong METHOD_ID)

Step 3: Attacker submits evil proof to server
├─ POST /api/login/complete
├─ Body: { receipt_b64: <proof with METHOD_ID_EVIL> }
└─ Server receives proof

Step 4: Server's verifier-cli.exe checks proof
├─ Verifier decodes receipt_b64 → receipt
├─ Verifier checks: receipt.method_id == EMBEDDED_METHOD_ID?
├─ METHOD_ID_EVIL ≠ METHOD_ID_LEGITIMATE
├─ ✗ VERIFICATION FAILS
└─ Server rejects proof!

RESULT:
├─ Attack fails cryptographically
├─ No amount of hacking can forge METHOD_ID
├─ Verifier will always reject evil proofs
└─ Even if attacker has access to source code!
```

---

## How to View Embedded METHOD_ID

### In the Code

```rust
// filepath: zk/methods/src/lib.rs
// This file is AUTO-GENERATED during build

pub const GUEST_ELF: &[u8] = b"\x7fELF\x02\x01\x01\x00...";  // Binary data
pub const METHOD_ID: [u32; 8] = [
    0x1a2b3c4d,
    0x5e6f7g8h,
    0xabcdef01,
    0x23456789,
    0xfedcba98,
    0x76543210,
    0x13579bdf,
    0x2468ace0,
];

// Or in hex string form:
// METHOD_ID = 0x1a2b3c4d5e6f7g8habcdef0123456789fedcba9876543210...
```

### Programmatically (In Rust)

```rust
// filepath: zk/prover/src/main.rs

use methods::METHOD_ID;

fn main() {
    // Print METHOD_ID
    println!("METHOD_ID: {:?}", METHOD_ID);
    // Output: METHOD_ID: [0x1a2b3c4d, 0x5e6f7g8h, ...]
    
    // Convert to hex string
    let method_id_hex = METHOD_ID
        .iter()
        .map(|x| format!("{:08x}", x))
        .collect::<Vec<_>>()
        .join("");
    println!("METHOD_ID (hex): {}", method_id_hex);
    // Output: METHOD_ID (hex): 1a2b3c4d5e6f7g8habcdef01...
}
```

### From Generated Receipt (At Runtime)

```rust
// After proof generation, receipt contains METHOD_ID:

let receipt = prover.prove(...);

println!("Receipt METHOD_ID: {:?}", receipt.method_id);
// Output: Receipt METHOD_ID: [0x1a2b3c4d, 0x5e6f7g8h, ...]

// This receipt.method_id is what gets serialized and sent to server
```

---

## Complete Example: How It All Ties Together

### Your monorepo structure with METHOD_ID flow

```
User runs: cargo build --release from zk/

Step 1: Guest compiles
├─ Compiles: methods/src/main.rs → methods.elf (RISC-V binary)
├─ Size: ~150 KB
└─ Unique to this guest code

Step 2: RISC Zero computes METHOD_ID
├─ Input: methods.elf
├─ Computation: METHOD_ID = SHA256(methods.elf)
├─ Output: [u32; 8] array (32 bytes total)
└─ Example: [0x1a2b3c4d, 0x5e6f..., ...]

Step 3: RISC Zero generates methods/src/lib.rs
├─ Contains: pub const METHOD_ID: [u32; 8] = [0x1a2b..., ...]
├─ Contains: pub const GUEST_ELF: &[u8] = b"<binary>"
└─ This is the bridge between guest and prover/verifier

Step 4: Prover compiles & links METHOD_ID
├─ Source: prover-cli/src/main.rs
├─ Imports: use methods::METHOD_ID
├─ Linking: METHOD_ID constant is compiled into the binary
├─ Output: prover-cli.exe (contains METHOD_ID hardcoded)
└─ Can't change METHOD_ID without recompiling

Step 5: Verifier compiles & links METHOD_ID
├─ Source: verifier-cli/src/main.rs
├─ Imports: use methods::METHOD_ID (same constant!)
├─ Linking: METHOD_ID constant is compiled into the binary
├─ Output: verifier-cli.exe (contains same METHOD_ID)
└─ Both binaries link the SAME constant from methods/src/lib.rs

Step 6: At runtime
├─ Prover generates receipt with embedded METHOD_ID
├─ Receipt gets serialized to receipt_b64
├─ Verifier deserializes receipt
├─ Verifier checks: receipt.method_id == embedded METHOD_ID?
├─ If match: Verify cryptographic proof
└─ If mismatch: Reject proof (tampering detected)

GUARANTEE:
├─ Cannot modify guest code without changing METHOD_ID
├─ Cannot modify METHOD_ID without recompiling both binaries
├─ Cannot fake METHOD_ID (it's computed from guest binary hash)
└─ Security is mathematical, not trust-based
```

---

## Interview Answer: "How is METHOD_ID embedded?"

**Q: "How do you embed METHOD_ID in the prover and verifier?"**

**A:** "RISC Zero automates this during compilation:

**Step 1 - Compilation:**
When I run `cargo build --release`, RISC Zero automatically:
1. Compiles the guest code to a RISC-V binary
2. Computes METHOD_ID as SHA256 of that binary
3. Generates a Rust constant with this METHOD_ID
4. This constant is then imported by both the prover and verifier

**Step 2 - Linking:**
Both prover-cli.exe and verifier-cli.exe link the same METHOD_ID constant during compilation. This happens automatically—I don't manually specify it.

**Step 3 - Verification:**
When the verifier runs, it has METHOD_ID hardcoded inside the executable. It compares the receipt's METHOD_ID with this embedded value. If they match, the proof came from authentic guest code.

**Why This Matters:**
- If anyone modifies the guest code even slightly, METHOD_ID changes completely
- The modified code would generate a different METHOD_ID
- Proofs from modified code won't verify against the server's METHOD_ID
- This creates a cryptographic seal that's impossible to forge

**Example:**
```
Original guest code → METHOD_ID: 0x1a2b3c4d...
Modified guest code → METHOD_ID: 0x9z8y7x6w... (completely different)
```

It's automatic, cryptographic, and impossible to bypass. That's the power of RISC Zero's design."
