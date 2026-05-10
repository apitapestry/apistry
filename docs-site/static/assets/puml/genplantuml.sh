#!/usr/bin/env bash
# genplantuml.sh - find .puml files and generate .svg for each
# Usage:
#   ./genplantuml.sh [--dry-run|-n] [--no-overwrite] [paths...]
#
# Output location:
#   .svg files are written under the parent of the current working directory (../)
#   with the same relative folder structure as the input .puml files.
#
# By default, existing .svg outputs are OVERWRITTEN.
# If no paths are provided the current directory (.) is searched.

set -euo pipefail

DRY_RUN=0
OVERWRITE=1

action_print() {
  printf "%s\n" "$*"
}

# parse simple flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run|-n) DRY_RUN=1; shift;;
    --no-overwrite) OVERWRITE=0; shift;;
    --) shift; break;;
    -*) echo "Unknown option: $1" >&2; exit 2;;
    *) break;;
  esac
done

# determine search roots
if [[ $# -gt 0 ]]; then
  SEARCH_PATHS=("$@");
else
  SEARCH_PATHS=(.)
fi

ROOT_PWD="$PWD"
OUT_ROOT="$(cd "$ROOT_PWD/.." && pwd)"

action_print "Output root: $OUT_ROOT"

# determine renderer (shell only; no docker)
RENDERER=""
if command -v plantuml >/dev/null 2>&1; then
  RENDERER="plantuml"
elif [[ -n "${PLANTUML_JAR-}" && -f "$PLANTUML_JAR" ]]; then
  RENDERER="jar"
elif [[ -f "./plantuml.jar" ]]; then
  RENDERER="jar"
else
  echo "Error: No plantuml binary, PLANTUML_JAR, or ./plantuml.jar available." >&2
  exit 3
fi

action_print "Using renderer: $RENDERER"

render_file() {
  local f="$1"
  local out_dir="$2"

  if [[ "$RENDERER" == "plantuml" ]]; then
    plantuml -tsvg -o "$out_dir" "$f"
  else
    local jar_path
    if [[ -n "${PLANTUML_JAR-}" && -f "$PLANTUML_JAR" ]]; then
      jar_path="$PLANTUML_JAR"
    else
      jar_path="$ROOT_PWD/plantuml.jar"
    fi
    java -jar "$jar_path" -tsvg -o "$out_dir" "$f"
  fi
}

# find and process .puml files
found_any=0
for sp in "${SEARCH_PATHS[@]}"; do
  # be forgiving if path doesn't exist
  if [[ ! -e "$sp" ]]; then
    echo "Warning: path not found: $sp" >&2
    continue
  fi

  # Use process substitution so the while loop runs in the current shell (not a subshell)
  while IFS= read -r -d '' f; do
    found_any=1

    # Normalize to an absolute path so relative results like ./foo.puml are handled correctly.
    if [[ "$f" == /* ]]; then
      abs_f="$f"
    else
      abs_f="$ROOT_PWD/$f"
    fi

    # Mirror the .puml's path under OUT_ROOT, relative to ROOT_PWD
    local_rel="$abs_f"
    if [[ "$local_rel" == "$ROOT_PWD"/* ]]; then
      local_rel="${local_rel#"$ROOT_PWD"/}"
    else
      echo "Warning: skipping file outside cwd: $f" >&2
      continue
    fi

    rel_dir="$(dirname "$local_rel")"
    base_name="$(basename "${local_rel%.*}")"

    out_dir="$OUT_ROOT/$rel_dir"
    out="$out_dir/$base_name.svg"

    if [[ -f "$out" && "$OVERWRITE" -eq 0 ]]; then
      action_print "Skipping existing: $out (--no-overwrite specified)"
      continue
    fi

    if [[ "$DRY_RUN" -eq 1 ]]; then
      action_print "DRY-RUN: render '$abs_f' -> '$out'"
    else
      mkdir -p "$out_dir"
      action_print "Generating: $out"
      if render_file "$abs_f" "$out_dir"; then
        action_print " -> OK: $out"
      else
        echo " -> FAILED: $f" >&2
      fi
    fi
  done < <(find "$sp" -type f -name '*.puml' -print0)

done

if [[ $found_any -eq 0 ]]; then
  action_print "No .puml files found."
fi

exit 0
