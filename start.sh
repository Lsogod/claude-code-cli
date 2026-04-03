#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Provider selection: first positional arg or PROVIDER env var; default mlx
PROVIDER="${1:-${PROVIDER:-mlx}}"
shift 2>/dev/null || true

MLX_MODEL="mlx-community/Ministral-3-8B-Instruct-2512-4bit"
MLX_PORT=8080
MLX_KV_SIZE=32768

case "$PROVIDER" in
  ollama)
    # Direct LAN connection to LiteLLM (bypasses Cloudflare timeout)
    export OPENAI_BASE_URL="http://192.168.8.239:4100/v1"
    export OPENAI_API_KEY="dummy"
    export ANTHROPIC_MODEL="qwen3:8b-notk"
    export OPENAI_SEND_TOOLS="0"
    export OPENAI_TRIM_SYSTEM_PROMPT="1"
    ;;
  mlx)
    export OPENAI_BASE_URL="http://localhost:${MLX_PORT}/v1"
    export OPENAI_API_KEY="dummy"
    export ANTHROPIC_MODEL="${MLX_MODEL}"
    export OPENAI_SEND_TOOLS="1"
    export OPENAI_MAX_TOOLS="15"
    export OPENAI_TRIM_SYSTEM_PROMPT="1"

    # Apply tool parser patch (survives mlx-lm upgrades)
    MLX_PARSER_TARGET="$(find ~/.local/share/uv/tools/mlx-lm -path "*/tool_parsers/mistral.py" 2>/dev/null | head -1)"
    if [ -n "$MLX_PARSER_TARGET" ] && [ -f "$MLX_PARSER_TARGET" ]; then
      if ! diff -q "$SCRIPT_DIR/patches/mlx_mistral_tool_parser.py" "$MLX_PARSER_TARGET" >/dev/null 2>&1; then
        cp "$SCRIPT_DIR/patches/mlx_mistral_tool_parser.py" "$MLX_PARSER_TARGET"
        echo "Applied MLX tool parser patch"
      fi
    fi

    # Patch tokenizer config for tool support (idempotent)
    MLX_MODEL_DIR="$(echo "$MLX_MODEL" | sed 's|/|--|g')"
    MLX_TOK_CFG="$(find ~/.cache/huggingface/hub/"models--${MLX_MODEL_DIR}" -name "tokenizer_config.json" -path "*/snapshots/*" 2>/dev/null | head -1)"
    if [ -n "$MLX_TOK_CFG" ] && [ -f "$MLX_TOK_CFG" ]; then
      if ! grep -q '"tool_parser_type"' "$MLX_TOK_CFG" 2>/dev/null; then
        python3 -c "
import json, sys
with open(sys.argv[1]) as f: c = json.load(f)
c['tool_parser_type'] = 'mistral'
with open(sys.argv[1], 'w') as f: json.dump(c, f, indent=2)
print('Patched tokenizer_config.json with tool_parser_type: mistral')
" "$MLX_TOK_CFG"
      fi
    fi

    # Start MLX server if not already running
    if ! curl -sf "http://localhost:${MLX_PORT}/v1/models" >/dev/null 2>&1; then
      echo "Starting MLX server (${MLX_MODEL})..."
      mlx_lm.server \
        --model "$MLX_MODEL" \
        --port "$MLX_PORT" &
      MLX_PID=$!

      # Wait for server to be ready
      for i in $(seq 1 60); do
        if curl -sf "http://localhost:${MLX_PORT}/v1/models" >/dev/null 2>&1; then
          echo "MLX server ready (pid ${MLX_PID})"
          break
        fi
        if ! kill -0 "$MLX_PID" 2>/dev/null; then
          echo "MLX server failed to start" >&2
          exit 1
        fi
        sleep 1
      done

      if ! curl -sf "http://localhost:${MLX_PORT}/v1/models" >/dev/null 2>&1; then
        echo "MLX server timed out after 60s" >&2
        kill "$MLX_PID" 2>/dev/null
        exit 1
      fi

      # Stop MLX server when the CLI exits
      trap "kill $MLX_PID 2>/dev/null" EXIT
    fi
    ;;
  *)
    echo "Unknown provider: $PROVIDER (use 'ollama' or 'mlx')" >&2
    exit 1
    ;;
esac

exec bun --preload="$SCRIPT_DIR/preload.ts" "$SCRIPT_DIR/entrypoints/cli.tsx" "$@"
