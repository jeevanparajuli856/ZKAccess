# Blockchain, Publishing, and Third-Party Detection Explained

## What Is Blockchain?

### Simple Analogy: Shared Ledger

```
TRADITIONAL BANK LEDGER:
┌─────────────────────────────────────┐
│         BANK CONTROLS               │
├─────────────────────────────────────┤
│ Alice: $100                         │
│ Bob: $50                            │
│ Charlie: $25                        │
│                                     │
│ Bank says: "Trust us"               │
│ Problem: Only bank knows            │
└─────────────────────────────────────┘

BLOCKCHAIN LEDGER:
┌──────────────┬──────────────┬──────────────┐
│   ALICE'S    │    BOB'S     │  CHARLIE'S   │
│   COMPUTER   │   COMPUTER   │   COMPUTER   │
├──────────────┼──────────────┼──────────────┤
│ Alice: $100  │ Alice: $100  │ Alice: $100  │
│ Bob: $50     │ Bob: $50     │ Bob: $50     │
│ Charlie: $25 │ Charlie: $25 │ Charlie: $25 │
├──────────────┼──────────────┼──────────────┤
│ IDENTICAL    │ IDENTICAL    │ IDENTICAL    │
│ Thousands of computers | all have same copy
│ If one computer lies, 9,999 others prove it wrong
│ Result: No need to trust anyone!
└──────────────┴──────────────┴──────────────┘
```

**Key Properties:**
- Decentralized: Thousands of computers, not one authority
- Immutable: Once recorded, can't be changed (cryptographically locked)
- Transparent: Everyone can see all transactions
- Trustless: Don't need to trust any single party

---

## What Does "Publishing to Blockchain" Mean?

### Publishing = Recording Permanently

```
BEFORE PUBLISHING:
┌───────────────────────────────────────────┐
│         YOU HAVE DATA                     │
├───────────────────────────────────────────┤
│ Fraud Detection Result: fraudScore = 0.85 │
│ Detector Address: 0xabc123...             │
│ ZK Proof: <binary data>                   │
│ Timestamp: 2025-01-18 12:34:56            │
│                                            │
│ Problem:                                   │
│ ├─ Only you have this data                │
│ ├─ You could modify it                    │
│ ├─ You could delete it                    │
│ ├─ No one can verify you actually detected it
│ └─ If you disappear, data is gone!
└───────────────────────────────────────────┘

AFTER PUBLISHING TO BLOCKCHAIN:
┌──────────────────────────────────────────────────┐
│         BLOCKCHAIN (WORLDCHAIN)                  │
├──────────────────────────────────────────────────┤
│ Block #12345678:                                 │
│ ├─ Transaction 1: Alice paid Bob $10            │
│ ├─ Transaction 2: Charlie swapped tokens         │
│ ├─ Transaction 3: FraudDetection {              │
│ │   fraudScore: 0.85                            │
│ │   detector: 0xabc123...                       │
│ │   zk_proof: <binary>                          │
│ │   timestamp: 2025-01-18 12:34:56              │
│ │   block: 12345678                             │
│ │   transaction_hash: 0x1a2b3c...               │
│ │ }                                              │
│ └─ Transaction 4: Smart contract paid detector   │
│                                                   │
│ Cryptographic hash: 0xdef456...                 │
│ (Locked forever - can't be changed)             │
│                                                   │
│ Properties:                                      │
│ ├─ Permanent: Can never be deleted              │
│ ├─ Immutable: Can never be modified             │
│ ├─ Transparent: Everyone can see it             │
│ ├─ Auditable: Regulators can verify forever     │
│ └─ Verified: 10,000 computers confirm it
└──────────────────────────────────────────────────┘
```

### How Publishing Works (Technical)

```
STEP 1: You Create Detection Result
┌──────────────────────────────────────────┐
│  Your Computer                           │
├──────────────────────────────────────────┤
│  Ran detection in RISC Zero              │
│  Generated ZK Proof                      │
│  Result: {                               │
│    fraudScore: 0.85,                     │
│    zk_proof: <300 KB binary>,            │
│    method_id: 0xdef456...                │
│  }                                        │
└──────────────────────────────────────────┘
                ↓
STEP 2: Submit to Smart Contract
┌──────────────────────────────────────────┐
│  Worldchain Network                      │
├──────────────────────────────────────────┤
│  You call: SmartContract.submitDetection({
│    user_id_hash: "0x1a2b3c...",         │
│    fraudScore: 0.85,                    │
│    zk_proof: <binary>,                  │
│  })                                       │
│                                           │
│  Your transaction enters mempool        │
│  (waiting to be included)                │
└──────────────────────────────────────────┘
                ↓
STEP 3: Network Validates
┌──────────────────────────────────────────┐
│  10,000 Blockchain Nodes                 │
├──────────────────────────────────────────┤
│  Node 1: Verifies your transaction       │
│  Node 2: Verifies your transaction       │
│  Node 3: Verifies your transaction       │
│  ...                                      │
│  Node 10000: Verifies your transaction   │
│                                           │
│  Validation checks:                      │
│  ├─ Do you have enough tokens to pay?   │
│  ├─ Is the ZK proof valid?              │
│  ├─ Does proof match claimed score?     │
│  ├─ Is user_id_hash format correct?     │
│  └─ Is this not a duplicate submission? │
│                                           │
│  CONSENSUS: 9,995+ nodes agree ✓        │
└──────────────────────────────────────────┘
                ↓
STEP 4: Include in Block
┌──────────────────────────────────────────┐
│  Miners/Validators Package Block         │
├──────────────────────────────────────────┤
│  Block #12345678:                        │
│  ├─ Timestamp: 2025-01-18 12:34:56      │
│  ├─ Previous block hash: 0xabc123...    │
│  ├─ Your detection transaction           │
│  ├─ 100 other transactions               │
│  └─ Merkle root: 0xdef456...            │
│                                           │
│  Seal with cryptographic hash:          │
│  Block hash: 0x999888...                │
│  (Now locked forever!)                   │
└──────────────────────────────────────────┘
                ↓
STEP 5: Broadcast to All Nodes
┌──────────────────────────────────────────┐
│  Network-Wide Distribution               │
├──────────────────────────────────────────┤
│  New block transmitted to all 10,000     │
│  nodes.                                   │
│                                           │
│  All nodes now have your detection:      │
│  ├─ Node 1: Stores block                │
│  ├─ Node 2: Stores block                │
│  ├─ Node 3: Stores block                │
│  ...                                      │
│  └─ Node 10000: Stores block            │
│                                           │
│  Result:                                  │
│  ├─ Your data is permanently recorded   │
│  ├─ On 10,000 computers simultaneously  │
│  ├─ Can't be deleted (need 10,000 edits)│
│  ├─ Can't be modified (hash would break)│
│  └─ Everyone can verify it forever      │
└──────────────────────────────────────────┘
                ↓
STEP 6: Smart Contract Executes
┌──────────────────────────────────────────┐
│  Automatic Execution                     │
├──────────────────────────────────────────┤
│  Smart contract code runs automatically: │
│                                           │
│  if zk_proof.verify(METHOD_ID) {         │
│    // Proof is valid ✓                   │
│                                           │
│    fraudScore = extract_from_proof();    │
│    // Now blockchain knows the result   │
│                                           │
│    record_detection(fraudScore);         │
│    // Record detection for this user    │
│                                           │
│    pay_detector(reward_amount);          │
│    // Automatically send payment!        │
│                                           │
│    emit DetectionEvent(...);             │
│    // Emit event for monitoring          │
│  }                                        │
└──────────────────────────────────────────┘
                ↓
STEP 7: You Get Paid
┌──────────────────────────────────────────┐
│  Your Wallet                             │
├──────────────────────────────────────────┤
│  Previous balance: 10.5 tokens           │
│  +                                        │
│  Detection reward: 0.5 tokens            │
│  =                                        │
│  New balance: 11.0 tokens                │
│                                           │
│  Transaction recorded:                   │
│  "DetectionReward sent to 0xabc123"     │
│  (Also on blockchain permanently!)       │
└──────────────────────────────────────────┘
```

---

## Who Are Third Parties and Why Do They Run Detection?

### The Problem Without Third Parties

```
BEFORE: Only World Runs Detection
┌─────────────────────────────────────────────────┐
│              WORLD'S SYSTEM                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  World ID User:                                 │
│  Alice verifies identity with Orb              │
│        ↓                                         │
│  World's Detection System:                     │
│  ├─ Runs fraud detection                      │
│  ├─ Checks for duplicates                     │
│  ├─ Analyzes patterns                         │
│  └─ Makes blocking decisions                  │
│        ↓                                         │
│  Result: Is Alice fraudulent?                 │
│                                                  │
│  PROBLEMS:                                     │
│  ├─ Cost: World pays for ALL detection       │
│  ├─ Scalability: Limited by World's resources│
│  ├─ Centralization: Only World decides       │
│  ├─ Trust: Users must trust World            │
│  └─ Bottleneck: Can't scale to billions      │
│                                                  │
└─────────────────────────────────────────────────┘
```

### The Solution: Third-Party Detectors

```
AFTER: Anyone Can Be a Detector
┌──────────────────────────────────────┐
│         THIRD PARTIES                │
├──────────────────────────────────────┤
│                                       │
│ Detector A (Startup):                │
│ ├─ Specializes in duplicate detection│
│ ├─ Runs detection code in RISC Zero │
│ └─ Gets paid per successful detection│
│                                       │
│ Detector B (Research Lab):           │
│ ├─ Uses ML for anomaly detection    │
│ ├─ Generates ZK proofs              │
│ └─ Earns reputation + payments      │
│                                       │
│ Detector C (Individual):             │
│ ├─ Runs detection on their computer │
│ ├─ Submits proofs to blockchain     │
│ └─ Earns tokens for work            │
│                                       │
│ World ID User (Any User):            │
│ ├─ Multiple detectors analyze       │
│ ├─ Results aggregated                │
│ ├─ Better fraud detection!          │
│ └─ World doesn't do all work        │
│                                       │
│ BENEFITS:                             │
│ ├─ Decentralized: Anyone participates│
│ ├─ Scalable: Grows with participants│
│ ├─ Transparent: All results on-chain│
│ ├─ Incentivized: Detectors get paid │
│ └─ Robust: Multiple independent views
│                                       │
└──────────────────────────────────────┘
```

---

## Why Do Third Parties Run Detection Code?

### Motivation: Financial Incentives

```
SCENARIO: You Decide to Be a Detector
┌────────────────────────────────────────┐
│         YOUR DECISION PROCESS           │
├────────────────────────────────────────┤
│                                         │
│  You see World's offer:                │
│  "Run fraud detection for World ID     │
│   Get paid in World tokens for each    │
│   correct detection"                    │
│                                         │
│  Economics:                             │
│  ├─ Cost: Electricity to run detection│
│  │  (maybe $0.10 per detection)       │
│  │                                      │
│  ├─ Reward: Get paid per detection     │
│  │  ($0.50 per correct detection)     │
│  │                                      │
│  ├─ Profit per detection: $0.40        │
│  │                                      │
│  └─ If you run 1000/day:               │
│     $400/day profit!                    │
│                                         │
│  Decision: YES, I'll run detection!   │
│                                         │
└────────────────────────────────────────┘
```

### How the Third-Party Becomes a Detector

```
WORKFLOW: Becoming a Detector
┌────────────────────────────────────────┐
│          STEP 1: Download              │
├────────────────────────────────────────┤
│  Third-party downloads:                │
│  ├─ Detection code (RISC Zero guest)  │
│  ├─ Audit logs (from blockchain)      │
│  └─ Configuration (detection rules)   │
│                                         │
│  Size: ~1 MB + audit data              │
│  Cost: Free (open source)              │
│                                         │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│         STEP 2: Set Up                 │
├────────────────────────────────────────┤
│  Third-party installs:                 │
│  ├─ Rust toolchain (compiler)          │
│  ├─ RISC Zero tools (zkVM)             │
│  └─ Running environment                │
│                                         │
│  Size: ~500 MB                          │
│  Time: 30 minutes setup                 │
│  Cost: Free                             │
│                                         │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│        STEP 3: Compile Code            │
├────────────────────────────────────────┤
│  Third-party compiles:                 │
│  cargo build --release                 │
│                                         │
│  Result:                                │
│  ├─ Detection binary (compiled)        │
│  ├─ METHOD_ID computed                 │
│  └─ Ready to run                       │
│                                         │
│  Time: 5 minutes                        │
│  Cost: Free                             │
│                                         │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│        STEP 4: Monitor Events          │
├────────────────────────────────────────┤
│  Third-party watches blockchain:       │
│  "New World ID verification detected"  │
│                                         │
│  Downloaded event:                     │
│  {                                      │
│    user_id_hash: "0x1a2b3c...",       │
│    timestamp: 1234567890,              │
│    location: "New York",               │
│    device_id: "orb-42"                 │
│  }                                      │
│                                         │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│     STEP 5: Run Detection (Your Job!)  │
├────────────────────────────────────────┤
│  Third-party executes:                 │
│  ./detection --event <event_data>      │
│                                         │
│  Inside RISC Zero:                     │
│  ├─ Load event data                    │
│  ├─ Run detection logic                │
│  ├─ Check fraud patterns               │
│  ├─ Calculate fraud_score              │
│  └─ Generate ZK proof                  │
│                                         │
│  Time: 2-5 seconds                     │
│  Result: {                             │
│    fraud_score: 0.75,                  │
│    zk_proof: <binary>,                 │
│    method_id: 0xdef456...              │
│  }                                      │
│                                         │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│   STEP 6: Submit to Blockchain         │
├────────────────────────────────────────┤
│  Third-party submits transaction:      │
│  SmartContract.submitDetection({       │
│    user_id_hash: "0x1a2b3c...",       │
│    fraud_score: 0.75,                  │
│    zk_proof: <binary>                  │
│  })                                     │
│                                         │
│  Cost: Gas fee ($0.05)                 │
│                                         │
│  Expected return: $0.50                │
│                                         │
│  Net profit: $0.45                     │
│                                         │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│      STEP 7: Get Paid (Automatic!)    │
├────────────────────────────────────────┤
│  Smart contract:                       │
│  1. Verifies ZK proof ✓               │
│  2. Checks fraud_score matches proof ✓│
│  3. Records detection on-chain         │
│  4. Sends reward to detector:          │
│     receive_payment(0.50 WLD)         │
│                                         │
│  Confirmation: Transaction in block    │
│  Status: Detector's balance +0.50 WLD │
│                                         │
│  RECURRING: Keep repeating for profit │
│                                         │
└────────────────────────────────────────┘
```

---

## Why Should Third Parties Run the Code?

### Trust-Minimized Fraud Detection

```
PROBLEM: How to scale fraud detection to billions?
┌──────────────────────────────────────────────┐
│   Option 1: World Runs All Detection        │
├──────────────────────────────────────────────┤
│ Pros:                                        │
│ ├─ Controlled: World ensures quality        │
│ └─ Simple: One entity runs everything       │
│                                               │
│ Cons:                                        │
│ ├─ Expensive: Costs scale with users        │
│ ├─ Centralized: Only World trusted          │
│ ├─ Bottleneck: Limited by World's resources│
│ ├─ Not scalable: Can't reach billions       │
│ └─ Requires trust: "Trust us to detect"    │
│                                               │
└──────────────────────────────────────────────┘

SOLUTION: Decentralized Detection via Blockchain
┌──────────────────────────────────────────────┐
│  Option 2: Third Parties Run Detection      │
├──────────────────────────────────────────────┤
│ Pros:                                        │
│ ├─ Scalable: 10,000+ detectors possible     │
│ ├─ Decentralized: Many independent parties  │
│ ├─ Economic: Incentivizes participation     │
│ ├─ Verifiable: Proofs verify results        │
│ ├─ Transparent: All results on-chain        │
│ ├─ Audit-able: Regulators can verify all   │
│ └─ Trust-minimized: Math, not people        │
│                                               │
│ Cons:                                        │
│ ├─ Complex: Need blockchain integration     │
│ ├─ Quality variance: Different detectors    │
│ └─ Requires reputation system               │
│                                               │
└──────────────────────────────────────────────┘
```

### Economics of Third-Party Detection

```
COST COMPARISON:
┌─────────────────────────────────────────┐
│   Traditional (World Runs All)          │
├─────────────────────────────────────────┤
│ 350,000 verifications/week              │
│ × Cost per detection: $0.10             │
│ = Cost: $35,000/week                    │
│ = $1.82M/year                           │
│                                          │
│ Payment model:                          │
│ └─ World pays (costs money)             │
│                                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Decentralized (Third Parties)          │
├─────────────────────────────────────────┤
│ 350,000 verifications/week              │
│ 100 independent detectors               │
│ Each processes 3,500 verifications      │
│                                          │
│ Cost to World:                          │
│ └─ $0 (third parties pay for hardware)  │
│                                          │
│ Payment to detectors:                   │
│ Cost per detection: $0.50               │
│ Detector profit: $0.40 (after costs)    │
│                                          │
│ Network effect:                         │
│ └─ As World scales → More profit → More│
│    detectors join → Better detection   │
│                                          │
└─────────────────────────────────────────┘

RESULT:
├─ World's cost: Scales to $0
├─ Detector's incentive: Scales with network
└─ System grows automatically (no central bottleneck!)
```

---

## Why ZK Proofs Are Essential

### The Trust Problem Without Proofs

```
SCENARIO: Third party submits detection WITHOUT ZK proof

World: "detector-v1.exe says user is fraudulent (score=0.9)"

Problem:
├─ Did the detector actually run the code?
├─ Did they modify the detection code?
├─ Did they just make up the score?
├─ How can we verify they didn't lie?
└─ Result: We can't trust them!

Solution without blockchain/proofs:
├─ Hire detectors as employees (expensive!)
├─ Run detection yourself (not scalable!)
└─ Trust them (conflicts with goal of decentralization)

CENTRALIZED DETECTION DOESN'T WORK AT SCALE!
```

### The Trust Solution WITH ZK Proofs

```
SAME SCENARIO: Third party submits detection WITH ZK proof

Detector submits:
{
  user_id_hash: "0x1a2b3c...",
  fraud_score: 0.9,
  zk_proof: <300 KB cryptographic proof>
}

Blockchain smart contract automatically:
├─ Calls: zk_proof.verify(METHOD_ID)
├─ Checks: METHOD_ID matches detection code
├─ Checks: Proof is cryptographically valid
├─ Checks: Fraud score matches what proof says
├─ Result: ✓ This detector ran correct code and got 0.9
├─ Decision: ACCEPT result + PAY detector
└─ No humans needed for verification!

KEY INSIGHT:
├─ Proof is unforgeable (cryptographic guarantee)
├─ Don't need to trust the detector
├─ Don't need to trust World
├─ Math verifies the result automatically!

RESULT:
├─ Detectors incentivized to be honest (payment only if proof valid)
├─ World can use untrusted detectors
├─ Blockchain verifies automatically
├─ Scales to millions of detectors
└─ True decentralization possible!
```

---

## Real-World Flow: Complete Example

```
┌─────────────────────────────────────────────────────────┐
│                 REAL SCENARIO                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  HOUR 1: New World ID Verification                     │
│  ─────────────────────────────────────                 │
│  Alice verifies with Orb in San Francisco              │
│  Worldchain blockchain records:                        │
│  {                                                      │
│    user_id_hash: "0xaaa111...",                       │
│    timestamp: 1234567890,                              │
│    location_hash: "0xbbb222...",                      │
│    device_id: "orb-sf-1",                              │
│    matching_score: 97.5                                │
│  }                                                      │
│                                                          │
│  Event emitted: "UserVerified"                         │
│  Picked up by 100 independent detectors               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  HOUR 2: 50 Detectors Run Detection                    │
│  ────────────────────────────────────                  │
│                                                          │
│  Detector #1 (Startup "FraudNet"):                    │
│  ├─ Loads verification event                          │
│  ├─ Runs detection logic (specialized)                │
│  ├─ Score: 0.05 (very legitimate)                    │
│  ├─ Generates ZK proof                                │
│  └─ Submits to blockchain                             │
│                                                          │
│  Detector #2 (Research Lab):                          │
│  ├─ Loads verification event                          │
│  ├─ Runs ML-based detection                           │
│  ├─ Score: 0.08 (legitimate)                         │
│  ├─ Generates ZK proof                                │
│  └─ Submits to blockchain                             │
│                                                          │
│  Detector #3 (Individual):                            │
│  ├─ Loads verification event                          │
│  ├─ Runs detection code                               │
│  ├─ Score: 0.12 (slightly suspicious)                │
│  ├─ Generates ZK proof                                │
│  └─ Submits to blockchain                             │
│                                                          │
│  ... (47 more detectors similarly) ...                 │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  HOUR 3: Blockchain Aggregates Results                │
│  ──────────────────────────────────────                │
│                                                          │
│  All 50 detection results received:                   │
│  ├─ Average fraud score: 0.09                         │
│ ├─ Median fraud score: 0.08                          │
│  ├─ Min score: 0.02 (detector 15)                    │
│  ├─ Max score: 0.35 (detector 37)                    │
│  ├─ Consensus: User is LEGITIMATE (score < 0.5)      │
│  ├─ Confidence: Very high (50 independent detectors)  │
│  └─ Decision: APPROVE verification                   │
│                                                          │
│  Alice's account: CREATED + VERIFIED                  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  HOUR 4: Detectors Get Paid                           │
│  ───────────────────────────────                      │
│                                                          │
│  Smart contract automatically:                        │
│  ├─ Verifies all 50 ZK proofs ✓                      │
│  ├─ Records 50 fraud scores on-chain                 │
│  ├─ Sends reward to each detector:                   │
│  │  $ detector_1.transfer(0.50 WLD)                  │
│  │  $ detector_2.transfer(0.50 WLD)                  │
│  │  $ ... (48 more)                                  │
│  └─ Total paid out: 25 WLD (~$50)                    │
│                                                          │
│  Each detector's earnings:                            │
│  ├─ Detector #1: 0.50 WLD (~$1.00)                  │
│  ├─ Detector #2: 0.50 WLD (~$1.00)                  │
│  ├─ Detector #3: 0.50 WLD (~$1.00)                  │
│  └─ ... (47 more) ...                                │
│                                                          │
│  All payments recorded on blockchain (immutable!)     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  RESULT: Decentralized Fraud Detection Success!       │
│  ──────────────────────────────────────────────       │
│                                                          │
│  ✓ 50 independent detectors ran code                  │
│  ✓ All results verified cryptographically             │
│  ✓ Consensus determined Alice is legitimate          │
│  ✓ All detectors got paid automatically              │
│  ✓ All history recorded on blockchain                │
│  ✓ World's cost: $0 (detectors paid from pool)       │
│  ✓ Scalable: 1,000 users/hour → detectors scale auto│
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

**What is Blockchain?**
- Shared ledger on thousands of computers
- Decentralized, immutable, transparent
- No single authority needed

**What does "Publishing to Blockchain" mean?**
- Recording data permanently on thousands of computers
- Can't be deleted or modified
- Everyone can verify forever

**Who are third parties?**
- Anyone with computer, internet, Rust skills
- Motivated by profit (get paid for detection)
- Run detection code independently

**Why do third parties run detection code?**
- **Financial incentive**: Get paid per detection
- **Scalability**: System grows with participants
- **Decentralization**: No central bottleneck
- **Economic**: Profit-seeking aligns with World's interest

**Why ZK proofs are essential?**
- Prove computation without trusting executor
- Detector can't lie (proof is verifiable)
- Enables trustless decentralized detection
- Scales to millions without central control

**The Innovation:**
```
Traditional fraud detection:
├─ One company (World) runs all detection
├─ Costs scale with users (not sustainable)
└─ Centralized (bottleneck)

Decentralized ZK-based detection:
├─ Anyone can run detection (third parties)
├─ Get paid in tokens (incentivized)
├─ Results verified cryptographically (trustless)
├─ Scales automatically (ecosystem grows)
└─ Decentralized (no single point of failure)

This is the future of fraud detection!
```

---

## Interview Answer Template

**Q: "Explain blockchain, publishing, and third-party detection"**

A: "Blockchain is essentially a shared ledger kept by thousands of computers instead of one bank. Publishing to blockchain means recording data permanently—once recorded, no one can delete or modify it because you'd need to modify all 10,000 computers simultaneously.

In our detection system, third parties are incentivized detectors. Anyone with a computer and Rust skills can run fraud detection code, generate a ZK proof, and submit it to the blockchain. The smart contract automatically verifies the proof and pays them.

Why this works:
- **Incentive**: Detectors earn money for correct detection
- **Trust**: Don't need to trust them—proof verifies result
- **Scale**: As you add users, detectors scale automatically
- **Cost**: World doesn't pay for detection—detectors do and get paid

The magic is ZK proofs. They let third parties prove they ran the code correctly without you trusting them. Blockchain automates payment. Together, you get decentralized detection at scale."
