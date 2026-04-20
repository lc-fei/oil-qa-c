#!/usr/bin/env bash
set -euo pipefail

# 当前环境里存在无效代理时，Cargo 和 wasm-pack 会优先走这些代理并导致 crates.io 下载失败。
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/packages/wasm-sdk/pkg"

rm -rf "$OUT_DIR"

wasm-pack build "$ROOT_DIR/rust-sdk/bindings/wasm" --target web --out-dir "$OUT_DIR" --out-name oil_qa_wasm
