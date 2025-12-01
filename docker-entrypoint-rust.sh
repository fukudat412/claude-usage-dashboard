#!/bin/sh
# Startup script for integrated Rust + Node.js container

set -e

echo "Starting Claude Usage Dashboard with Rust backend..."

# Start Rust backend in background
echo "Starting Rust backend on port 8080..."
RUST_LOG=${RUST_LOG:-info} \
PORT=${RUST_PORT:-8080} \
PROJECTS_PATH=${PROJECTS_PATH:-/home/appuser/.claude/projects} \
/app/rust-backend &

RUST_PID=$!
echo "Rust backend started with PID $RUST_PID"

# Wait a moment for Rust backend to initialize
sleep 2

# Check if Rust backend is running
if ! kill -0 $RUST_PID 2>/dev/null; then
    echo "ERROR: Rust backend failed to start"
    exit 1
fi

echo "Starting Node.js proxy server on port 3001..."

# Cleanup function
cleanup() {
    echo "Shutting down..."
    kill $RUST_PID 2>/dev/null || true
    wait $RUST_PID 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Start Node.js server in foreground
exec node server.js
