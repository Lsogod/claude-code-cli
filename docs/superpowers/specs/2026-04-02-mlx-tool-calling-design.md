# Enable MCP/Plugin Tool Calling on Local MLX Model

**Date:** 2026-04-02
**Status:** Draft

## Problem

The claude-code-cli fork supports OpenAI-compatible API endpoints (MLX, Ollama) but tool calling is disabled by default (`OPENAI_SEND_TOOLS` env var). This means MCPs (gmail-multi, notion, google-docs, word-document, claude-memory, mermaid) and plugins (playwright, context7, flow-next, etc.) cannot be used with local models.

## Goal

Enable all configured MCPs and plugins to work with the local MLX-served Mistral Small 24B model.

## Design

### 1. Model Upgrade

Switch from `mlx-community/Mistral-7B-Instruct-v0.3-4bit` to `mlx-community/Mistral-Small-24B-Instruct-2501-4bit`.

**Why:** Mistral Small 24B was specifically trained for function/tool calling and handles multi-tool schemas reliably. The 7B model cannot reliably generate valid tool call JSON for complex schemas.

### 2. Enable Tool Sending

Set `OPENAI_SEND_TOOLS=1` in the MLX provider configuration in `start.sh`.

**How it works today:** The `buildChatCompletionRequest` function in `services/api/openai/translate.ts` already has full tool translation logic (Anthropic tool schema -> OpenAI function schema). It's gated behind `process.env.OPENAI_SEND_TOOLS === '1'`. Enabling it sends tool definitions in the `tools` array of the OpenAI chat completion request, and tool call responses are translated back to Anthropic `tool_use` content blocks.

### 3. Increase Context Window

The MLX server defaults to 4096 tokens. With tool definitions, system prompt, and conversation history, this is far too small. Configure the MLX server to use 32768 tokens.

**How:** The `mlx_lm.server` command accepts `--max-kv-size` to set the KV cache size (context window). Update the MLX server startup to include `--max-kv-size 32768`.

**Memory impact:** At 4-bit quantization, 24B params ~= 12GB. A 32k KV cache adds roughly 2-4GB depending on batch size. Total ~14-16GB, which fits comfortably on M-series Macs with 32GB+ RAM.

### 4. System Role Support

Mistral Small 24B supports the `system` role natively. Remove the `OPENAI_SYSTEM_ROLE=0` override that was needed for Mistral 7B.

### 5. Tool Search / Deferred Loading

The Anthropic API's ToolSearch feature (deferred tool loading via `tool_reference` blocks) is a beta feature that does **not** work with OpenAI-compatible endpoints. This means:

- All non-deferred tools are sent as full function definitions in every request
- MCP tools that would normally be deferred will be sent in full
- This is acceptable for now — Mistral Small 24B can handle dozens of tool definitions

**No code changes needed.** The existing logic in `claude.ts` already handles this: when `isToolSearchEnabled()` returns false (which it will for OpenAI provider since the beta headers aren't supported), all tools except ToolSearchTool are included.

### 6. Changes Summary

**File: `start.sh`** — Update the `mlx` case:
- Model: `mlx-community/Mistral-Small-24B-Instruct-2501-4bit`
- Add: `OPENAI_SEND_TOOLS=1`
- Remove: `OPENAI_SYSTEM_ROLE=0`
- Document the required MLX server startup with `--max-kv-size 32768`

**No translate layer changes needed.** The existing `translateToolDefinition`, tool call parsing in `ingestChunk`, and response normalization already handle the OpenAI function calling format correctly.

## Known Limitations

1. **No deferred tool loading** — All tools are sent every request, consuming more context window. If this becomes a problem, a future enhancement could add tool filtering by category.
2. **Tool calling reliability** — While Mistral Small 24B is good at function calling, it won't match Claude's reliability. Complex multi-step tool chains may occasionally fail with malformed JSON.
3. **No streaming tool calls from MLX** — The MLX server may not support streaming function call deltas. The translate layer handles both streaming and non-streaming tool calls, so this should degrade gracefully (tool call arrives in final chunk rather than streaming incrementally).

## Testing

After the changes:
1. Start the MLX server with the new model and context window
2. Run `PROVIDER=mlx ./start.sh`
3. Test basic conversation (no tools)
4. Test built-in tools: ask to read a file, run a command
5. Test MCP tools: ask to search gmail, create a notion page
6. Verify tool call JSON is valid and responses are properly translated back
