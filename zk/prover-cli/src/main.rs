use anyhow::Result;
use base64::Engine;
use clap::Parser;
use hex::FromHex;
use risc0_zkvm::{default_prover, ExecutorEnv};
use serde::{Deserialize, Serialize};

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
    journal: JournalOut,
}

#[derive(Serialize)]
struct JournalOut {
    commitment_hex: String,
    nonce_hex: String,
}

#[derive(Serialize, Deserialize)]
struct Input {
    salt: Vec<u8>,
    password_utf8: Vec<u8>,
    nonce: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
struct Journal {
    commitment: [u8; 32],
    nonce: Vec<u8>,
}

fn main() -> Result<()> {
    let args = Args::parse();
    let salt = Vec::from_hex(&args.salt_hex)?;
    let nonce = Vec::from_hex(&args.nonce_hex)?;

    let input = Input {
        salt,
        password_utf8: args.password.as_bytes().to_vec(),
        nonce,
    };

    let env = ExecutorEnv::builder().write(&input)?.build()?;
    let prover = default_prover();
    let receipt = prover.prove(env, methods::COMMIT_ELF)?;

    let journal: Journal = receipt.journal.decode()?;
    let engine = base64::engine::general_purpose::STANDARD;
    let receipt_bytes = risc0_zkvm::serde::to_vec(&receipt)?;
    let receipt_b64 = engine.encode(receipt_bytes);

    let out = Output {
        receipt_b64,
        journal: JournalOut {
            commitment_hex: hex::encode(journal.commitment),
            nonce_hex: hex::encode(journal.nonce),
        },
    };
    let s = serde_json::to_string_pretty(&out)?;
    if let Some(path) = args.out {
        std::fs::write(path, s)?;
    } else {
        println!("{}", s);
    }
    Ok(())
}
