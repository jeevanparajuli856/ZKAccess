fn main() {
    risc0_build::embed_methods! {
        methods: {
            COMMIT: "guest",
        }
    };
}
