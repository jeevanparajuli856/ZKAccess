# Rust Crash-Cheat Sheet (1–2 hour skim)

## 0) Mindset
- Ownership & Borrowing: compile-time rules to prevent data races/nulls.
- Defaults to immutability; opt-in mutability.
- Errors: `Result` for recoverable, `panic!` for unrecoverable.
- No GC; RAII like C++ but safer.

## 1) Minimal Program
```rust
fn main() {
    println!("Hello, Rust!");
}
```

## 2) Variables & Types
```rust
let x = 5;           // immutable
let mut y = 10;      // mutable
let z: f64 = 3.14;   // annotated
const MAX: i32 = 100_000; // const, requires type
```
- Shadowing: `let x = x + 1;` (new binding, same name)

## 3) Control Flow
```rust
if n > 0 { ... } else if n == 0 { ... } else { ... }
let label = if cond { "a" } else { "b" }; // expression

for i in 0..5 { println!("{}", i); }       // 0..5 exclusive
for i in 0..=5 { println!("{}", i); }      // inclusive

while cond { ... }
loop { break; } // infinite
```

## 4) Functions
```rust
fn add(a: i32, b: i32) -> i32 { a + b }
fn no_return() { /* unit */ }
```
- Last expression without `;` is return value.

## 5) Structs & Enums
```rust
struct User { name: String, age: u8 }
let u = User { name: "Ana".into(), age: 30 };

enum Role { Admin, User, Guest }
let r = Role::Admin;

// Pattern match
match r {
    Role::Admin => println!("hi"),
    Role::User | Role::Guest => println!("limited"),
}
```

## 6) Ownership, Borrowing, Slices
```rust
let s = String::from("hi");
let t = s;          // move: s invalid now
let u = t.clone();  // deep copy

fn len_ref(s: &String) -> usize { s.len() }      // shared borrow
fn push_ref(s: &mut String) { s.push('!'); }     // mutable borrow

let arr = [1,2,3,4];
let slice = &arr[1..3]; // &[2,3]
```
Rules:
- One mutable borrow OR many immutable borrows, not both simultaneously.
- Borrow must not outlive owner.

## 7) Strings
```rust
let s = String::from("hello"); // heap
let ss: &str = "literal";      // slice
format!("{} {}", s, ss);
```

## 8) Collections
```rust
let mut v = Vec::new();
v.push(1); v.push(2);
for x in &v { println!("{}", x); }

use std::collections::HashMap;
let mut m = HashMap::new();
m.insert("key", 42);
if let Some(v) = m.get("key") { println!("{}", v); }
```

## 9) Result & Option
```rust
fn div(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 { Err("div by zero".into()) } else { Ok(a / b) }
}

let maybe = Some(5);
match maybe { Some(v) => println!("{}", v), None => {} }

// Combinators
maybe.map(|x| x * 2).unwrap_or(0);
```

## 10) Traits & Impl
```rust
trait Greet { fn hi(&self) -> String; }
struct Person { name: String }
impl Greet for Person {
    fn hi(&self) -> String { format!("Hi {}", self.name) }
}

impl Person { // inherent methods
    fn new(name: &str) -> Self { Self { name: name.into() } }
}
```
- Trait bounds: `fn log<T: Debug>(t: T) { println!("{:?}", t); }`
- `impl<T: Debug> Logger<T> { ... }` for generics.

## 11) Modules & Crates
```rust
// src/main.rs
mod utils;          // loads src/utils.rs
use utils::add;
fn main() { println!("{}", add(2,3)); }

// src/utils.rs
pub fn add(a: i32, b: i32) -> i32 { a + b }
```
- `pub` to expose; `use` to import.

## 12) Cargo Basics
```bash
cargo new app              # create binary crate
cargo new libapp --lib     # library crate
cargo build                # debug build
cargo run                  # build + run
cargo test                 # run tests
cargo fmt                  # format
```

## 13) Testing
```rust
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn adds() { assert_eq!(add(2,3), 5); }
}
```

## 14) Async (30-second view)
```rust
// Add to Cargo.toml: tokio = { version = "1", features=["full"] }
#[tokio::main]
async fn main() {
    let body = reqwest::get("https://example.com").await.unwrap().text().await.unwrap();
    println!("{}", body);
}
```
- `async fn` returns `impl Future`; `.await` to resolve.

## 15) Common Patterns
- `if let Some(x) = opt { ... }` to unwrap options.
- `?` operator to propagate errors: `fn f() -> Result<T, E> { let v = g()?; Ok(v) }`
- Iterators: `v.iter().map(|x| x*2).filter(|x| x>3).collect::<Vec<_>>()`

## 16) Unsafe (skip for now)
- `unsafe` needed for FFI/raw pointers. Avoid until comfortable.

## 17) Memory Model Quickies
- Stack vs Heap: primitives on stack; `String`, `Vec`, `HashMap` manage heap.
- Drops when out of scope (RAII). Implement `Drop` for cleanup if needed.

## 18) Tooling
- Format: `cargo fmt`
- Lint: `cargo clippy`
- Docs: `cargo doc --open`

## 19) Reading Error Messages
- Rust errors are helpful; read top message and suggested fix.
- Borrow checker errors: look for lifetimes of borrows; reduce scope or clone.

## 20) Quick Practice (15 minutes)
1) Write `add`, test it.
2) Make `User { name, age }`, implement `new`, `is_adult`.
3) Parse CLI args with `std::env::args()`; print sum of numbers.
4) Build a `Vec`, double with `map`, filter > 10.
5) Write a function returning `Result`; use `?` for errors.

## 21) Key Differences vs C++/Python
- No nulls; use `Option`.
- No exceptions; use `Result`.
- Ownership/borrowing instead of GC.
- Pattern matching is exhaustive.
- Immutable by default.

Keep this handy; a 1-hour pass plus 30 minutes coding will cover 80% of what you need for basic Rust.
