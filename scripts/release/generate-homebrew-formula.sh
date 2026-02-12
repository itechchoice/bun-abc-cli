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

try_get_sha() {
  local filename="$1"
  local sha
  sha="$(awk -v file="${filename}" '$2 == file { print $1 }' "${CHECKSUMS_FILE}")"
  echo "${sha}"
}

DARWIN_ARM64_FILE="abc-${VERSION}-darwin-arm64.tar.gz"
DARWIN_AMD64_FILE="abc-${VERSION}-darwin-amd64.tar.gz"
LINUX_AMD64_FILE="abc-${VERSION}-linux-amd64.tar.gz"

DARWIN_ARM64_SHA="$(try_get_sha "${DARWIN_ARM64_FILE}")"
DARWIN_AMD64_SHA="$(try_get_sha "${DARWIN_AMD64_FILE}")"
LINUX_AMD64_SHA="$(try_get_sha "${LINUX_AMD64_FILE}")"

BASE_URL="https://github.com/${REPO}/releases/download/${TAG}"

mkdir -p "$(dirname "${OUTPUT}")"

if [[ -z "${DARWIN_ARM64_SHA}" && -z "${DARWIN_AMD64_SHA}" && -z "${LINUX_AMD64_SHA}" ]]; then
  echo "no release artifacts found in checksums file" >&2
  exit 1
fi

cat > "${OUTPUT}" <<EOF
class Abc < Formula
  desc "OpenTUI + React CLI for business contract intent ingress and read-only observation"
  homepage "https://github.com/${REPO}"
  version "${VERSION}"
EOF

if [[ -n "${DARWIN_ARM64_SHA}" || -n "${DARWIN_AMD64_SHA}" ]]; then
  {
    echo ""
    echo "  on_macos do"
    if [[ -n "${DARWIN_ARM64_SHA}" && -n "${DARWIN_AMD64_SHA}" ]]; then
      cat <<EOF
    if Hardware::CPU.arm?
      url "${BASE_URL}/${DARWIN_ARM64_FILE}"
      sha256 "${DARWIN_ARM64_SHA}"
    else
      url "${BASE_URL}/${DARWIN_AMD64_FILE}"
      sha256 "${DARWIN_AMD64_SHA}"
    end
EOF
    elif [[ -n "${DARWIN_ARM64_SHA}" ]]; then
      cat <<EOF
    if Hardware::CPU.arm?
      url "${BASE_URL}/${DARWIN_ARM64_FILE}"
      sha256 "${DARWIN_ARM64_SHA}"
    else
      odie "No macOS amd64 release artifact available for version ${VERSION}"
    end
EOF
    else
      cat <<EOF
    if Hardware::CPU.intel?
      url "${BASE_URL}/${DARWIN_AMD64_FILE}"
      sha256 "${DARWIN_AMD64_SHA}"
    else
      odie "No macOS arm64 release artifact available for version ${VERSION}"
    end
EOF
    fi
    echo "  end"
  } >> "${OUTPUT}"
else
  cat >> "${OUTPUT}" <<EOF

  on_macos do
    odie "No macOS release artifact available for version ${VERSION}"
  end
EOF
fi

if [[ -n "${LINUX_AMD64_SHA}" ]]; then
  cat >> "${OUTPUT}" <<EOF

  on_linux do
    if Hardware::CPU.intel?
      url "${BASE_URL}/${LINUX_AMD64_FILE}"
      sha256 "${LINUX_AMD64_SHA}"
    else
      odie "No Linux arm64 release artifact available for version ${VERSION}"
    end
  end
EOF
else
  cat >> "${OUTPUT}" <<EOF

  on_linux do
    odie "No Linux release artifact available for version ${VERSION}"
  end
EOF
fi

cat >> "${OUTPUT}" <<EOF
  def install
    bin.install "abc"
  end

  test do
    assert_predicate bin/"abc", :executable?
  end
end
EOF

echo "[done] formula generated at ${OUTPUT}"
