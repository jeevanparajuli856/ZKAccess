use anyhow::Result;
use base64::Engine;
use clap::Parser;
use risc0_zkvm::Receipt;
use serde::{Deserialize, Serialize};

#[derive(Parser, Debug)]
#[command(name = "verifier-cli")]
struct Args {
    /// Receipt in base64 form
    #[arg(long)]
    receipt_b64: String,
}

#[derive(Serialize, Deserialize)]
struct Journal {
    commitment: [u8; 32],
    nonce: Vec<u8>,
}

#[derive(Serialize)]
struct VerifierOut {
    commitment_hex: String,
    nonce_hex: String,
}

fn main() -> Result<()> {
    let args = Args::parse();
    let engine = base64::engine::general_purpose::STANDARD;
    let bytes = engine.decode(args.receipt_b64)?;
    let receipt: Receipt = risc0_zkvm::serde::from_slice(&bytes)?;
    receipt.verify(methods::COMMIT_ID)?;

    let journal: Journal = receipt.journal.decode()?;

    println!(
        "{}",
        serde_json::to_string(&VerifierOut {
            commitment_hex: hex::encode(journal.commitment),
            nonce_hex: hex::encode(journal.nonce),
        })?
    );
    Ok(())
}
