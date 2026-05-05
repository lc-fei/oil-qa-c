#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRATE_NAME="oil-qa-mobile"
LIB_NAME="liboil_qa_mobile.a"
OUT_DIR="$ROOT_DIR/rust-sdk/bindings/mobile/dist/ios"
HEADERS_DIR="$ROOT_DIR/rust-sdk/bindings/mobile/include"
SIM_UNIVERSAL_DIR="$OUT_DIR/simulator-universal"
TARGETS=(
  aarch64-apple-ios
  aarch64-apple-ios-sim
  x86_64-apple-ios
)

for target in "${TARGETS[@]}"; do
  rustup target add "$target"
  cargo build \
    --manifest-path "$ROOT_DIR/rust-sdk/Cargo.toml" \
    -p "$CRATE_NAME" \
    --release \
    --target "$target"
done

mkdir -p "$OUT_DIR"
mkdir -p "$SIM_UNIVERSAL_DIR"

DEVICE_LIB="$ROOT_DIR/rust-sdk/target/aarch64-apple-ios/release/$LIB_NAME"
SIM_ARM64_LIB="$ROOT_DIR/rust-sdk/target/aarch64-apple-ios-sim/release/$LIB_NAME"
SIM_X86_64_LIB="$ROOT_DIR/rust-sdk/target/x86_64-apple-ios/release/$LIB_NAME"
SIM_UNIVERSAL_LIB="$SIM_UNIVERSAL_DIR/$LIB_NAME"
XCFRAMEWORK="$OUT_DIR/OilQaSdk.xcframework"

for lib in "$DEVICE_LIB" "$SIM_ARM64_LIB" "$SIM_X86_64_LIB"; do
  if [[ ! -f "$lib" ]]; then
    echo "iOS Rust library not found: $lib" >&2
    exit 1
  fi
done

# Simulator 需要同时支持 Apple Silicon 和 Intel，先合并为一个 simulator universal 静态库。
lipo -create "$SIM_ARM64_LIB" "$SIM_X86_64_LIB" -output "$SIM_UNIVERSAL_LIB"

if ! xcodebuild -version >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Rust iOS static libraries were built, but OilQaSdk.xcframework cannot be created.

Full Xcode is required for:
  xcodebuild -create-xcframework

Install Xcode, then run:
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  pnpm build:mobile:ios-rust
EOF
  exit 1
fi

if [[ -d "$XCFRAMEWORK" ]]; then
  rm -rf "$XCFRAMEWORK"
fi

xcodebuild -create-xcframework \
  -library "$DEVICE_LIB" \
  -headers "$HEADERS_DIR" \
  -library "$SIM_UNIVERSAL_LIB" \
  -headers "$HEADERS_DIR" \
  -output "$XCFRAMEWORK"

echo "iOS static libraries are built under rust-sdk/target/<target>/release/liboil_qa_mobile.a"
echo "OilQaSdk.xcframework is built at $XCFRAMEWORK"
