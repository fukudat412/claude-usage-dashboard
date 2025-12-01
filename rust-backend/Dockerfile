# Lightweight Rust Backend Dockerfile
# 超軽量なRustバックエンド用Dockerfile（約15MB）

# Stage 1: Builder
FROM rust:1.75-alpine AS builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache musl-dev

# Copy manifest files
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src

# Build with optimizations for size and static linking
RUN cargo build --release --target x86_64-unknown-linux-musl && \
    strip /build/target/x86_64-unknown-linux-musl/release/rust-backend

# Stage 2: Runtime
# Use distroless for minimal attack surface and size
FROM gcr.io/distroless/static:nonroot

# Copy binary from builder
COPY --from=builder /build/target/x86_64-unknown-linux-musl/release/rust-backend /rust-backend

# Expose port
EXPOSE 8080

# Run as non-root user
USER nonroot:nonroot

# Set environment variables
ENV RUST_LOG=info
ENV PORT=8080

# Health check (distroless doesn't have shell, so we can't use HEALTHCHECK)
# Health checks should be done from orchestrator (docker-compose, k8s)

ENTRYPOINT ["/rust-backend"]
