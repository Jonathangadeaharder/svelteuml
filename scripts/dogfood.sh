#!/usr/bin/env bash
set -euo pipefail

# Dogfood corpus: generate PlantUML diagrams for every Svelte fixture
# Usage: ./scripts/dogfood.sh
# Output: examples/<fixture>/{class,package}.puml

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
EXAMPLES_DIR="$ROOT_DIR/examples"
CLI="node $ROOT_DIR/dist/cli.js"

# Ensure CLI is built
if [ ! -f "$ROOT_DIR/dist/cli.js" ]; then
  echo "Building CLI..."
  cd "$ROOT_DIR" && pnpm run build
fi

mkdir -p "$EXAMPLES_DIR"

# Corpus fixtures — each is a SvelteKit project we dogfood against
declare -a CORPUS=(
  "tests/fixtures/songster-svelte:songster"
  "tests/fixtures/sveltekit-synthetic:sveltekit-synthetic"
  "tests/fixtures/minimal-sveltekit:minimal-sveltekit"
  "tests/fixtures/synthetic:synthetic"
)

for entry in "${CORPUS[@]}"; do
  fixture_dir="${entry%%:*}"
  name="${entry##*:}"
  out_dir="$EXAMPLES_DIR/$name"
  mkdir -p "$out_dir"

  echo "Generating diagrams for $name..."
  $CLI generate "$ROOT_DIR/$fixture_dir" \
    --disable-colors \
    -o "$out_dir/class.puml" \
    -d class 2>&1 || echo "  WARN: class diagram for $name failed"

  $CLI generate "$ROOT_DIR/$fixture_dir" \
    --disable-colors \
    -o "$out_dir/package.puml" \
    -d package 2>&1 || echo "  WARN: package diagram for $name failed"

  if [ -f "$out_dir/class.puml" ]; then
    classes=$(grep -c 'class "' "$out_dir/class.puml" 2>/dev/null || echo "0")
    echo "  class.puml: $classes classes"
  fi
  if [ -f "$out_dir/package.puml" ]; then
    packages=$(grep -c 'package "' "$out_dir/package.puml" 2>/dev/null || echo "0")
    echo "  package.puml: $packages packages"
  fi
done

echo ""
echo "Dogfood corpus complete. Diagrams in examples/"
