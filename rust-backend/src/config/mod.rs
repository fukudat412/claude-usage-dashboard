use std::env;

pub struct Config {
    pub projects_path: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        let home = env::var("HOME").expect("HOME environment variable not set");
        let projects_path = env::var("CLAUDE_PROJECTS_PATH")
            .unwrap_or_else(|_| format!("{}/.claude/projects", home));

        let port = env::var("RUST_BACKEND_PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse()
            .expect("Invalid port number");

        Config {
            projects_path,
            port,
        }
    }
}
