# Part 6: JBEIL + ZKML Integration (Lateral Movement Detection)

## Overview: Why ZKML for JBEIL?

**The Problem:**
```
Traditional ML-based threat detection:
├─ Security team sends logs to ML service
├─ ML service sees ALL sensitive logs
├─ Model weights stored somewhere (exposed if breach)
├─ Hard to audit: "Why did the model flag this user?"
└─ Privacy nightmare for employees
```

**The Solution: ZKML (Zero-Knowledge Machine Learning):**
```
ZKML-based threat detection:
├─ JBEIL logs encrypted end-to-end
├─ ML model runs INSIDE ZK proof (logs never decrypted to humans)
├─ Model weights embedded in guest code (auditable, tamper-proof)
├─ Output: risk_score (only result revealed, not logs)
├─ METHOD_ID proves: "This risk_score came from authorized model v3.2"
└─ Privacy preserved: No logs or weights exposed
```

---

## Architecture: JBEIL → ZKML Prover → Verifier

```
STEP 1: JBEIL detects suspicious activity
│
├─ user_id: alice@corp.com
├─ action: privilege_escalation
├─ process: mimikatz.exe
└─ confidence: 0.92

STEP 2: Backend encrypts logs (AES256)
│
└─ encrypted_logs: "EkX9F2mP4..."
   logs_hash: "3a4b5c6d..."
   nonce: "fedcba98..."

STEP 3: ZKML Prover Inference
│
├─ Inside guest code (RISC Zero sandbox):
│  ├─ Decrypt logs only in enclave
│  ├─ Load ML model weights (embedded)
│  ├─ Extract features: process_risk, cross_subnet, privilege_escalation
│  ├─ Run inference: risk_score = 0.87
│  └─ Generate zk-SNARK proof (no logs revealed!)
│
└─ Output: Receipt { seal, journal { risk_score, nonce }, method_id }

STEP 4: Backend Verifies Proof
│
├─ Check METHOD_ID (model version)
├─ Verify zk-SNARK (proof is valid)
├─ Check nonce (fresh, not replayed)
└─ Extract risk_score: 0.87

STEP 5: Incident Response
│
├─ If risk_score > 0.75: ALERT!
├─ Block user from other machines
├─ Isolate source machine
└─ Create security incident

✅ Logs never exposed to security team
✅ Model weights hidden (METHOD_ID auditable)
✅ Decision cryptographically verifiable
```

---

## Why ZKML > Traditional ML

**Traditional Approach (❌ Privacy Problem)**
```
JBEIL Logs → ML Service → sees all logs → risk_score
PROBLEMS:
├─ Logs exposed to ML vendor
├─ PII visible (user names, IPs, activities)
├─ Hard to audit model decisions
└─ GDPR/HIPAA violations
```

**ZKML Approach (✅ Privacy Preserving)**
```
Encrypted Logs → ZKML Prover → inference in sandbox → risk_score only
BENEFITS:
├─ Logs never decrypted outside enclave
├─ Model weights hidden (auditable METHOD_ID)
├─ Full audit trail (receipt stored)
├─ GDPR/HIPAA compliant
└─ On-premise execution (no vendor access)
```

---

## ZKML Security Properties

1. **Log Privacy**: Encrypted before prover, decrypted only inside RISC Zero sandbox

2. **Model Integrity**: METHOD_ID = SHA256(model_weights + inference_code), prevents model tampering

3. **Inference Correctness**: zk-SNARK proof verifies that risk_score was computed correctly

4. **Replay Prevention**: Nonce prevents old proofs from being reused (marked consumed in DB)

5. **Audit Trail**: receipt_b64 stored in database, security team can inspect for compliance

---

## Interview: ZKML + JBEIL

**Q: How would you integrate ZKML into JBEIL for lateral movement detection?**

**Answer:**

"The key insight is that JBEIL logs contain sensitive PII (usernames, IPs, activities). We can't send them to ML vendors. Instead, we use ZKML:

**Build Time:**
1. Train ML model on JBEIL logs (lateral movement patterns)
2. Embed model weights in guest code
3. Compile: RISC Zero generates METHOD_ID (SHA256 of guest_binary)
4. Deploy verifier-cli.exe with embedded MODEL_ID

**Runtime:**
1. JBEIL detects suspicious activity (privilege escalation, lateral movement)
2. Backend encrypts logs and sends to prover with nonce
3. Prover decrypts inside ZK sandbox, runs ML inference
4. Guest code outputs: risk_score, logs_hash, nonce
5. RISC Zero generates unforgeable proof
6. Receipt contains: proof (seal) + journal (risk_score) + METHOD_ID
7. Backend verifies: MODEL_ID matches → inference is legit
8. Extract risk_score: '0.87 = lateral movement with 87% confidence'
9. Incident response: Block user, isolate machine if above threshold

**Key Benefits:**
- Logs never exposed to humans (encrypted end-to-end)
- Model weights hidden (can't be stolen or modified)
- Decision auditable (proof stored, METHOD_ID proves model version)
- Privacy compliant (no data exposure, on-premise execution)

The beauty is: Security team makes decisions based on risk_score, but never sees the actual logs or model. It's like having a trusted advisor who reads classified documents and tells you: 'Risk is 87%' without revealing what they read."

---

## Detailed Flow: JBEIL Log → Risk Score

```
INPUT: JBEIL Log
{
  "user_id": "alice@corp.com",
  "source_ip": "10.0.1.50",
  "target_ip": "10.0.2.100",
  "action": "privilege_escalation",
  "process": "mimikatz.exe",
  "timestamp": "2024-01-18T14:23:45Z",
  "jbeil_confidence": 0.92
}

BACKEND PROCESSING:
├─ logs_hash = SHA256(serialize(jbeil_log))
├─ encrypted_logs = AES256(jbeil_log, encryption_key)
├─ nonce = random(16) 
└─ Store: INSERT INTO lateral_movement_requests (
     user_id_hash, encrypted_logs, logs_hash, nonce, request_time)

PROVER CALL:
└─ prover-cli.exe --encrypted_logs "..." --logs_hash "..." --nonce "..."

INSIDE ZKVM GUEST CODE:
├─ 1. Decrypt: logs = AES256_decrypt(encrypted_logs, key)
├─ 2. Verify: assert SHA256(logs) == logs_hash ✓
├─ 3. Extract features:
│  ├─ action_type: privilege_escalation → risk += 0.3
│  ├─ process_name: mimikatz.exe → model.lookup() → risk += 0.4
│  ├─ cross_subnet: 10.0.1.x → 10.0.2.x → risk += 0.15
│  ├─ time_of_day: 14:23 (business hours) → risk -= 0.05
│  └─ jbeil_confidence: 0.92 → risk += 0.22
├─ 4. Run ML inference:
│  └─ risk_score = model.predict(features) = 0.87
├─ 5. Generate proof:
│  └─ env::commit({
│       "risk_score": 0.87,
│       "user_id_hash": Keccak256("alice@corp.com"),
│       "logs_hash": "3a4b5c6d...",
│       "nonce": "fedcba98...",
│       "inference_version": "v3.2"
│     })
└─ 6. RISC Zero generates zk-SNARK proof (unforgeable)

RECEIPT OUTPUT:
{
  "seal": <zk-SNARK proof bytes (150-300 KB)>,
  "journal": {
    "risk_score": 0.87,
    "user_id_hash": "keccak...",
    "logs_hash": "3a4b5c6d...",
    "nonce": "fedcba98...",
    "inference_version": "v3.2"
  },
  "method_id": "SHA256(guest_v3.2)" = "0x1a2b3c4d..."
}

VERIFIER CALL:
└─ verifier-cli.exe --receipt_b64 "eyJzZWFsIj..."

VERIFICATION CHECKS:
├─ 1. METHOD_ID check:
│  └─ Does receipt.method_id == EMBEDDED_METHOD_ID?
│     ✓ YES → Model v3.2 is authorized
│     ✗ NO  → Different/compromised model → REJECT
├─ 2. Proof validity:
│  └─ Is zk-SNARK cryptographically valid?
│     ✓ YES → Inference was correct
│     ✗ NO  → Tampered receipt → REJECT
├─ 3. Nonce check:
│  └─ Is nonce in DB and consumed == false?
│     ✓ YES → Fresh proof (first submission)
│     ✗ NO  → Replay attack or expired → REJECT
└─ 4. Extract output:
   └─ risk_score = 0.87

DECISION LOGIC:
├─ Is risk_score > alert_threshold (0.75)?
│  ✓ YES → ALERT!
│  └─ Incident response:
│     ├─ INSERT INTO lateral_movement_alerts (...)
│     ├─ Block alice@corp.com from network
│     ├─ Isolate machine 10.0.1.50
│     ├─ Create incident ticket
│     ├─ Notify SIRT: "Lateral movement risk 87%"
│     └─ Update nonce: consumed = true (prevent replay)
│  ✗ NO → Benign activity, log and continue

OUTPUT: Incident Response Executed
├─ User blocked from accessing other machines
├─ Machine isolated for forensics
├─ Proof stored: receipt_b64 auditable forever
├─ Original logs: still encrypted (security team never sees)
└─ Model weights: still hidden in verifier binary (can't be leaked)
```

---

## Implementation Checklist

**Phase 1: Model Training**
- [ ] Collect JBEIL logs dataset (historical lateral movements)
- [ ] Train ML model (XGBoost/Random Forest/Neural Network)
  - Features: action_risk, process_risk, cross_subnet, time_of_day, jbeil_confidence
  - Target: lateral_movement_label (0 or 1)
- [ ] Evaluate model: AUC-ROC, precision, recall
- [ ] Serialize model: model_weights.bin

**Phase 2: Embed & Compile**
- [ ] Create zk/methods/guest/src/main.rs
  - Load model_weights.bin
  - Implement feature extraction
  - Implement inference logic
  - Commit risk_score to journal
- [ ] Build: `cargo build --release` (generates METHOD_ID)
- [ ] Verify METHOD_ID matches in both prover-cli.exe and verifier-cli.exe

**Phase 3: Backend Integration**
- [ ] Create /api/analyze-lateral-movement endpoint
- [ ] Implement log encryption (AES256)
- [ ] Call prover-cli.exe with encrypted_logs
- [ ] Parse receipt_b64 output
- [ ] Call verifier-cli.exe to verify
- [ ] Extract risk_score from journal
- [ ] Implement incident response logic
- [ ] Store receipt_b64 in database

**Phase 4: JBEIL Integration**
- [ ] Configure JBEIL to POST suspicious logs to /api/analyze-lateral-movement
- [ ] Test: JBEIL log → ZKML prover → risk_score → incident response
- [ ] Verify: User blocked on high risk_score
- [ ] Verify: Original logs never exposed to security team

**Phase 5: Auditing & Compliance**
- [ ] Verify logs never logged in plaintext
- [ ] Verify METHOD_ID matches across deployments
- [ ] Verify nonce prevents replay attacks
- [ ] Audit guest code (open-source model + inference)
- [ ] Document GDPR/HIPAA compliance

---

## FAQ

**Q: What if the ML model is biased against a group?**
A: Guest code (model + inference) is open-source, auditable. Anyone can inspect weights. If biased: flag it, recompile → METHOD_ID changes → easy to detect.

**Q: What if someone modifies logs before sending?**
A: Proof includes logs_hash. If logs modified → logs_hash wrong → proof fails verification.

**Q: What if backend is compromised?**
A: Attacker sees encrypted logs + risk_score. Model weights embedded in verifier binary (can't extract). Original logs unrecoverable.

**Q: How do we audit decisions?**
A: Store receipt_b64 for each inference. Later inspect: journal shows risk_score, logs_hash shows which logs, METHOD_ID shows model version.

**Q: How to update model?**
A: Retrain, recompile guest → NEW METHOD_ID. Deploy verifier-cli.exe. Old receipts show old MODEL_ID, new show new. Version history in DB.

**Q: Does this scale?**
A: Yes! Batch logs, parallelize zkVM instances. Proof generation ~5-30s per batch (depending on size). Can handle millions of logs/day.

---

## Key Takeaway

**Traditional threat detection**: Send logs to vendor, vendor's ML model sees everything, privacy nightmare.

**ZKML-based detection**: Logs encrypted, inference happens inside secure sandbox, only risk_score leaves, no logs or model weights ever exposed, fully auditable.

This is how you add ML to a security system without sacrificing privacy.




// Add this new section after "FAQ"

---

## How Does Security Analyst Respond Without Seeing Logs?

**The Question: "If analyst can't see logs, how do they investigate?"**

**Answer: They see DERIVED INSIGHTS, not raw logs.**

### What Analyst Actually Sees

```
JBEIL ALERT (After ZKML Analysis):
┌──────────────────────────────────────────────┐
│ Lateral Movement Risk: 87%                   │
├──────────────────────────────────────────────┤
│ User: alice@corp.com (hashed)                │
│ Source Machine: 10.0.1.50 (hashed)          │
│ Time: 2024-01-18 14:23:45Z                  │
│ Risk Reason: Privilege escalation + mimikatz│
│ Model Version: v3.2 (auditable METHOD_ID)   │
│ Proof: 0xabc123... (receipt stored)         │
├──────────────────────────────────────────────┤
│ RECOMMENDED ACTIONS:                         │
│ ├─ Block user from network immediately      │
│ ├─ Isolate source machine for forensics     │
│ ├─ Check: Did alice have privilege perms?  │
│ └─ Check: Is mimikatz legitimate software?  │
└──────────────────────────────────────────────┘

Analyst DOES NOT see:
├─ Exact IP of alice's machine (only hash)
├─ Full process execution chain
├─ User's browsing history
├─ Email contents
└─ Any raw JBEIL logs
```

### Three-Tier Investigation Model

```
TIER 1: Automated Response (No human logs needed)
┌─────────────────────────────────────────────────┐
│ Risk Score: 87% → ZKML proof verifies this    │
│ Action: AUTOMATIC                              │
│ ├─ Block alice@corp.com from network          │
│ ├─ Isolate 10.0.1.50 (suspected source)       │
│ ├─ Kill suspicious processes (mimikatz)       │
│ └─ Create incident ticket                      │
│                                                  │
│ Analyst approval? NO (already executed)        │
│ Logs shown? NO (not needed)                    │
│ Speed: Seconds (automatic response)            │
└─────────────────────────────────────────────────┘
         ↓
TIER 2: Analyst Investigation (If incident escalates)
┌─────────────────────────────────────────────────┐
│ Analyst questions:                              │
│ ├─ "Why was alice flagged?"                    │
│ │   Answer: "Privilege escalation + mimikatz"  │
│ │           (from ZKML risk_score breakdown)   │
│ │                                               │
│ ├─ "What version of model?"                    │
│ │   Answer: "v3.2" (from METHOD_ID in proof)   │
│ │                                               │
│ ├─ "Is this a false positive?"                 │
│ │   Answer: Query audit log:                   │
│ │           "Was alice legitimately doing      │
│ │            privilege escalation that day?"   │
│ │                                               │
│ └─ "Can I see the actual logs?"                │
│    Answer: "Only if you have separate          │
│             decryption key + justification"    │
│    (Separate from ZKML system - different auth)│
│                                                  │
│ Logs shown? ONLY IF AUTHORIZED (key access)   │
│ Speed: Minutes to hours (human investigation)  │
└─────────────────────────────────────────────────┘
         ↓
TIER 3: Forensics (Legal hold, investigation)
┌─────────────────────────────────────────────────┐
│ Legal team needs evidence                       │
│ Action: Decrypt logs (requires dual auth)      │
│ ├─ Chief security officer approval             │
│ ├─ Compliance officer sign-off                 │
│ ├─ Audit log: "Who accessed logs + when"       │
│ └─ Now analyst sees full JBEIL logs            │
│                                                  │
│ Logs shown? YES (with full audit trail)        │
│ Speed: Hours to days (legal process)           │
└─────────────────────────────────────────────────┘
```

### Real Example: alice@corp.com Lateral Movement

```
SCENARIO 1: Automated Response (Most Cases)

ZKML output: risk_score = 0.87
↓
System AUTOMATICALLY:
├─ Blocks alice from accessing file servers
├─ Kills mimikatz process on her machine
├─ Isolates her machine from network
├─ Creates incident: "LM-20240118-001"
└─ Sends alert: "Lateral movement blocked"

Analyst sees:
├─ Incident ticket: "Lateral movement blocked at 14:23:45"
├─ User: alice@corp.com
├─ Risk: 87% (privilege escalation detected)
├─ Actions taken: User blocked, machine isolated
└─ Proof: receipt_b64 = "eyJzZWFsIj..." (cryptographically verified)

Analyst actions:
├─ "Contact alice: Why were you trying escalation?"
├─ If alice says: "I was installing Windows Update"
│   → Check: Is Update legitimate? Check patch logs
│   → If yes: False positive, whitelist, retrain model
│   → If no: Serious incident, escalate to CISO
└─ If alice doesn't respond: Assume breach, full forensics

ANALYST NEVER SEES:
├─ Which specific files she accessed
├─ Which servers she connected to
├─ Exact command syntax she used
└─ Timing of each request
```

```
SCENARIO 2: Escalation (If Analyst Unsure)

ZKML output: risk_score = 0.87
↓
Analyst thinks: "This looks like false positive"
Action: Request log access
↓
System requires:
├─ Analyst request: "I need logs for incident LM-20240118-001"
├─ Manager approval: "Approved - security investigation"
├─ Compliance check: "Purpose: Lateral movement verification ✓"
├─ Dual authentication: "Analyst + Manager both enter keys"
└─ Audit log: "2024-01-18 15:00:00 - alice logs accessed by [analyst]"
↓
NOW analyst sees full JBEIL logs:
├─ Full process execution chain
├─ All network connections
├─ Exact commands run
├─ Timing of actions
└─ All context needed for investigation

Analyst conclusion:
├─ "This WAS a legitimate update"
├─ OR
├─ "This WAS a real breach - escalate to IR team"
```

### Key Insight: Separation of Concerns

```
NORMAL STATE (No logs needed):
├─ ZKML proves: "Risk is 87%"
├─ Automatic response: Block/isolate
├─ Analyst sees: Risk score + recommended actions
└─ NO log access needed

INVESTIGATION STATE (If questioned):
├─ Analyst can request logs
├─ Requires approval + dual auth
├─ Full audit trail created
├─ Now analyst sees everything
└─ Different permission model than ZKML

FORENSICS STATE (Legal):
├─ Multiple approvals required
├─ Compliance officer involved
├─ Chainofcustody documented
└─ Everything auditable
```

### Why This Works

```
BENEFIT 1: Privacy by Default
├─ 99% of cases: Automatic response, no logs needed
├─ Analyst makes decisions on: risk_score + recommended action
├─ Only bad actors' logs ever accessed (if escalated)
└─ Normal employees' logs stay private

BENEFIT 2: Speed
├─ Automated response: Seconds (blocks lateral movement)
├─ Investigation: Minutes (analyst reviews proof)
├─ Full forensics: Hours (legal approval)
└─ No delay in urgent security response

BENEFIT 3: Compliance
├─ GDPR: Logs not accessed unless necessary
├─ HIPAA: Automatic access controls respected
├─ SOC2: Full audit trail of who accessed what
└─ Legal: Evidence chain preserved

BENEFIT 4: Analyst Efficiency
├─ Analyst doesn't drown in logs
├─ Sees summarized: "Risk 87%, action: block"
├─ Can approve/reject in seconds
├─ Only deep-dives if needed
└─ Faster incident response
```

### Integration with JBEIL

```
JBEIL generates raw logs:
├─ User activities
├─ Process executions
├─ Network connections
└─ All sensitive data

ZKML processes logs:
├─ Encrypted end-to-end
├─ Only risk_score exits
├─ Logs stay in sandbox
└─ Original logs discarded after proof generation

Analyst sees:
├─ Risk score (87%)
├─ Recommended action (block)
├─ Model version (v3.2)
├─ Proof verification status (✓ valid)
└─ Can request full logs IF needed (separate auth)

Incident Response:
├─ Automated blocking happens immediately
├─ If escalation needed: analyst requests logs
├─ Approval process kicks in
├─ Full investigation with logs
└─ Evidence collected with audit trail
```

---

## Interview Answer: "How do analysts respond without logs?"

**Q: If analysts can't see logs, how do they investigate lateral movement?**

**A: "Great question. We use a tiered approach:

**Tier 1 - Automated (Most Cases):**
ZKML outputs risk_score (e.g., 87%). If above threshold, the system automatically:
- Blocks the user from network access
- Isolates the machine
- Creates an incident ticket

Analyst sees: Risk 87%, action taken, proof verified. No logs needed. Decision takes seconds.

**Tier 2 - Investigation (If Escalation):**
If analyst thinks it's a false positive, they can request log access. This requires:
- Manager approval
- Dual authentication
- Full audit log of who accessed what

Now analyst sees full JBEIL logs to investigate.

**Tier 3 - Forensics (Legal Hold):**
If real breach suspected, legal team gets involved. Full logs accessed under compliance controls.

**Benefits:**
- Privacy: 99% of cases, no logs accessed (automatic response)
- Speed: Lateral movement blocked before analyst even sees alert
- Compliance: Log access requires approval + audit trail
- Efficiency: Analyst focuses on decisions, not log reading

It's like airport security: TSA bot detects high-risk passenger (ZKML), automatically flags them (blocks network), analyst reviews flag (risk_score), decides what to do (approve/reject). Only in rare cases does analyst request full screening details (logs)."
