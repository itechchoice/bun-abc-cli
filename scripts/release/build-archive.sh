#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <tag-or-version>" >&2
  exit 1
fi

INPUT_VERSION="$1"
VERSION="${INPUT_VERSION#v}"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH_RAW="$(uname -m)"

case "$ARCH_RAW" in
  x86_64) ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)
    echo "unsupported arch: $ARCH_RAW" >&2
    exit 1
    ;;
esac

OUT_DIR="dist/release"
BIN_NAME="abc"
ARCHIVE_NAME="${BIN_NAME}-${VERSION}-${OS}-${ARCH}.tar.gz"
BIN_PATH="${OUT_DIR}/${BIN_NAME}"
ARCHIVE_PATH="${OUT_DIR}/${ARCHIVE_NAME}"
CHECKSUM_PATH="${OUT_DIR}/${ARCHIVE_NAME}.sha256"

mkdir -p "${OUT_DIR}"
rm -f "${BIN_PATH}" "${ARCHIVE_PATH}" "${CHECKSUM_PATH}"

echo "[build] bun compile -> ${BIN_PATH}"
bun build --compile --outfile "${BIN_PATH}" ./src/index.tsx

echo "[package] ${ARCHIVE_NAME}"
tar -czf "${ARCHIVE_PATH}" -C "${OUT_DIR}" "${BIN_NAME}"

SHA="$(shasum -a 256 "${ARCHIVE_PATH}" | awk '{print $1}')"
printf "%s  %s\n" "${SHA}" "${ARCHIVE_NAME}" > "${CHECKSUM_PATH}"

echo "[done] ${ARCHIVE_PATH}"
echo "[done] ${CHECKSUM_PATH}"
