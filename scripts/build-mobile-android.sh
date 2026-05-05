#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_LEVEL="${ANDROID_API_LEVEL:-24}"
ANDROID_MODULE_DIR="$ROOT_DIR/apps/mobile/modules/oil-qa-sdk/android"
TARGETS=(
  aarch64-linux-android
  armv7-linux-androideabi
  x86_64-linux-android
)

abi_for_target() {
  case "$1" in
    aarch64-linux-android)
      echo "arm64-v8a"
      ;;
    armv7-linux-androideabi)
      echo "armeabi-v7a"
      ;;
    x86_64-linux-android)
      echo "x86_64"
      ;;
    *)
      echo "unsupported"
      return 1
      ;;
  esac
}

find_ndk_dir() {
  local candidates=()

  if [[ -n "${ANDROID_NDK_HOME:-}" ]]; then
    candidates+=("$ANDROID_NDK_HOME")
  fi

  if [[ -n "${ANDROID_NDK_ROOT:-}" ]]; then
    candidates+=("$ANDROID_NDK_ROOT")
  fi

  if [[ -n "${ANDROID_HOME:-}" ]]; then
    candidates+=("$ANDROID_HOME"/ndk/*)
  fi

  candidates+=(
    "$HOME"/Library/Android/sdk/ndk/*
    "$HOME"/Android/Sdk/ndk/*
    /opt/android-sdk/ndk/*
    /usr/local/share/android-sdk/ndk/*
  )

  for candidate in "${candidates[@]}"; do
    if [[ -d "$candidate/toolchains/llvm/prebuilt" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

NDK_DIR="$(find_ndk_dir || true)"
if [[ -z "$NDK_DIR" ]]; then
  echo "Android NDK 未找到，请配置 ANDROID_NDK_HOME 或 ANDROID_HOME。" >&2
  exit 1
fi

HOST_TAG=""
for tag in darwin-arm64 darwin-x86_64 linux-x86_64; do
  if [[ -d "$NDK_DIR/toolchains/llvm/prebuilt/$tag/bin" ]]; then
    HOST_TAG="$tag"
    break
  fi
done

if [[ -z "$HOST_TAG" ]]; then
  echo "Android NDK toolchain 未找到: $NDK_DIR/toolchains/llvm/prebuilt/<host>/bin" >&2
  exit 1
fi

TOOLCHAIN_BIN="$NDK_DIR/toolchains/llvm/prebuilt/$HOST_TAG/bin"
export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$TOOLCHAIN_BIN/aarch64-linux-android${API_LEVEL}-clang"
export CARGO_TARGET_ARMV7_LINUX_ANDROIDEABI_LINKER="$TOOLCHAIN_BIN/armv7a-linux-androideabi${API_LEVEL}-clang"
export CARGO_TARGET_X86_64_LINUX_ANDROID_LINKER="$TOOLCHAIN_BIN/x86_64-linux-android${API_LEVEL}-clang"

echo "Using Android NDK: $NDK_DIR"
echo "Using Android API level: $API_LEVEL"

for target in "${TARGETS[@]}"; do
  rustup target add "$target"
  cargo build \
    --manifest-path "$ROOT_DIR/rust-sdk/Cargo.toml" \
    -p oil-qa-mobile \
    --release \
    --target "$target"

  abi="$(abi_for_target "$target")"
  out_dir="$ANDROID_MODULE_DIR/src/main/jniLibs/$abi"
  mkdir -p "$out_dir"
  cp "$ROOT_DIR/rust-sdk/target/$target/release/liboil_qa_mobile.so" "$out_dir/liboil_qa_mobile.so"
done

echo "Android mobile libraries are copied into $ANDROID_MODULE_DIR/src/main/jniLibs/<abi>/liboil_qa_mobile.so"
