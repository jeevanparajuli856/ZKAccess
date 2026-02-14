use anyhow::Result;
use clap::Parser;
use hex::FromHex;
use serde::{Deserialize, Serialize};
use base64::Engine;
use sha2::{Sha256, Digest};

#[derive(Parser, Debug)]
#[command(name = "prover-cli")] 
struct Args {
    /// Email (for logs only)
    #[arg(long)]
    email: String,
    /// Salt hex
    #[arg(long)]
    salt_hex: String,
    /// Nonce hex (challenge)
    #[arg(long)]
    nonce_hex: String,
    /// Password (utf-8)
    #[arg(long)]
    password: String,
    /// Output JSON receipt to file (default: stdout)
    #[arg(long)]
    out: Option<String>,
}

#[derive(Serialize)]
struct Output {
    receipt_b64: String,
}

#[derive(Serialize)]
struct MockJournal {
    commitment_hex: String,
    nonce_hex: String,
}

fn main() -> Result<()> {
    let args = Args::parse();
    let salt = Vec::from_hex(&args.salt_hex)?;
    let nonce = Vec::from_hex(&args.nonce_hex)?;

    // Compute commitment = SHA-256(salt || password)
    let mut hasher = Sha256::new();
    hasher.update(&salt);
    hasher.update(args.password.as_bytes());
    let commitment = hasher.finalize();

    // Create mock journal (in real RISC Zero, this comes from zkVM)
    let journal = MockJournal {
        commitment_hex: hex::encode(commitment),
        nonce_hex: args.nonce_hex.clone(),
    };

    // Encode as base64 (mock receipt)
    let journal_json = serde_json::to_string(&journal)?;
    let engine = base64::engine::general_purpose::STANDARD;
    let receipt_b64 = engine.encode(journal_json.as_bytes());

    let out = Output { receipt_b64 };
    let s = serde_json::to_string_pretty(&out)?;
    if let Some(path) = args.out {
        std::fs::write(path, s)?;
    } else {
        println!("{}", s);
    }
    Ok(())
}
