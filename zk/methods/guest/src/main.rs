#![no_std]
#![no_main]

extern crate alloc;

use alloc::vec::Vec;
use risc0_zkvm::guest::env;
use sha2::{Digest, Sha256};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct Input {
    salt: Vec<u8>,
    password_utf8: Vec<u8>,
    nonce: Vec<u8>,
}

#[derive(Serialize)]
struct Journal {
    commitment: [u8; 32],
    nonce: Vec<u8>,
}

fn main() {
    // Read inputs from host
    let input: Input = env::read();
    let mut h = Sha256::new();
    h.update(&input.salt);
    h.update(&input.password_utf8);
    let digest = h.finalize();

    let mut commitment = [0u8; 32];
    commitment.copy_from_slice(&digest);

    // Echo nonce to bind proof to challenge
    let journal = Journal {
        commitment,
        nonce: input.nonce,
    };
    env::commit(&journal);
}

risc0_zkvm::guest::entry!(main);
