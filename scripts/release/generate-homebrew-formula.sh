#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
usage:
  generate-homebrew-formula.sh \
    --tag v0.1.0 \
    --repo owner/repo \
    --checksums dist/release/checksums.txt \
    --output dist/release/abc.rb
EOF
}

TAG=""
REPO=""
CHECKSUMS_FILE=""
OUTPUT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      TAG="$2"
      shift 2
      ;;
    --repo)
      REPO="$2"
      shift 2
      ;;
    --checksums)
      CHECKSUMS_FILE="$2"
      shift 2
      ;;
    --output)
      OUTPUT="$2"
      shift 2
      ;;
    *)
      echo "unknown arg: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${TAG}" || -z "${REPO}" || -z "${CHECKSUMS_FILE}" || -z "${OUTPUT}" ]]; then
  usage
  exit 1
fi

if [[ ! -f "${CHECKSUMS_FILE}" ]]; then
  echo "checksums file not found: ${CHECKSUMS_FILE}" >&2
  exit 1
fi

VERSION="${TAG#v}"

get_sha() {
  local filename="$1"
  local sha
  sha="$(awk -v file="${filename}" '$2 == file { print $1 }' "${CHECKSUMS_FILE}")"
  if [[ -z "${sha}" ]]; then
    echo "missing checksum for ${filename}" >&2
    exit 1
  fi
  echo "${sha}"
}

DARWIN_ARM64_FILE="abc-${VERSION}-darwin-arm64.tar.gz"
DARWIN_AMD64_FILE="abc-${VERSION}-darwin-amd64.tar.gz"
LINUX_AMD64_FILE="abc-${VERSION}-linux-amd64.tar.gz"

DARWIN_ARM64_SHA="$(get_sha "${DARWIN_ARM64_FILE}")"
DARWIN_AMD64_SHA="$(get_sha "${DARWIN_AMD64_FILE}")"
LINUX_AMD64_SHA="$(get_sha "${LINUX_AMD64_FILE}")"

BASE_URL="https://github.com/${REPO}/releases/download/${TAG}"

mkdir -p "$(dirname "${OUTPUT}")"

cat > "${OUTPUT}" <<EOF
class Abc < Formula
  desc "OpenTUI + React CLI for business contract intent ingress and read-only observation"
  homepage "https://github.com/${REPO}"
  version "${VERSION}"

  on_macos do
    if Hardware::CPU.arm?
      url "${BASE_URL}/${DARWIN_ARM64_FILE}"
      sha256 "${DARWIN_ARM64_SHA}"
    else
      url "${BASE_URL}/${DARWIN_AMD64_FILE}"
      sha256 "${DARWIN_AMD64_SHA}"
    end
  end

  on_linux do
    if Hardware::CPU.intel?
      url "${BASE_URL}/${LINUX_AMD64_FILE}"
      sha256 "${LINUX_AMD64_SHA}"
    end
  end

  def install
    bin.install "abc"
  end

  test do
    assert_predicate bin/"abc", :executable?
  end
end
EOF

echo "[done] formula generated at ${OUTPUT}"
