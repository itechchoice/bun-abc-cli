#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 4 ]]; then
  cat <<'EOF' >&2
usage:
  publish-formula-to-tap.sh \
    <formula-file> \
    <tap-repo-owner/name> \
    <git-token> \
    <version>
EOF
  exit 1
fi

FORMULA_FILE="$1"
TAP_REPO="$2"
TOKEN="$3"
VERSION="$4"

if [[ ! -f "${FORMULA_FILE}" ]]; then
  echo "formula file not found: ${FORMULA_FILE}" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

TAP_URL="https://x-access-token:${TOKEN}@github.com/${TAP_REPO}.git"
TARGET_FORMULA_PATH="${TMP_DIR}/tap/Formula/abc.rb"

echo "[clone] ${TAP_REPO}"
git clone "${TAP_URL}" "${TMP_DIR}/tap"

mkdir -p "$(dirname "${TARGET_FORMULA_PATH}")"
cp "${FORMULA_FILE}" "${TARGET_FORMULA_PATH}"

pushd "${TMP_DIR}/tap" >/dev/null
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

git add Formula/abc.rb
if git diff --cached --quiet; then
  echo "[skip] no changes in Formula/abc.rb"
  exit 0
fi

git commit -m "abc ${VERSION}"
git push origin HEAD
popd >/dev/null

echo "[done] published Formula/abc.rb to ${TAP_REPO}"
