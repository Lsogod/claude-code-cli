# Patched Mistral tool parser for mlx-lm
#
# The upstream parser only handles Mistral's native format: func_name[ARGS]{json}
# But Mistral-Small-24B-Instruct-2501 generates standard JSON format:
#   [{"name": "func", "arguments": {...}}]
#
# This patch handles both formats.
#
# Applied by start.sh to: mlx_lm/tool_parsers/mistral.py

import json
from typing import Any

import regex as re

_tool_call_regex = re.compile(r"\s*(\w+)\[ARGS\]\s*(\{.*\})", re.DOTALL)

tool_call_start = "[TOOL_CALLS]"
tool_call_end = ""


def parse_tool_call(text: str, tools: Any | None = None):
    # Try Mistral native format first: func_name[ARGS]{json}
    match = _tool_call_regex.search(text)
    if match is not None:
        func_name = match.group(1)
        func_args = json.loads(match.group(2))
        return dict(name=func_name, arguments=func_args)

    # Fallback: standard JSON format [{"name": "...", "arguments": {...}}]
    text = text.strip()
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list) and len(parsed) > 0:
            parsed = parsed[0]
        if isinstance(parsed, dict) and "name" in parsed:
            args = parsed.get("arguments", {})
            if isinstance(args, str):
                args = json.loads(args)
            return dict(name=parsed["name"], arguments=args)
    except (json.JSONDecodeError, KeyError):
        pass

    raise ValueError(f"Could not parse tool call from: {text}")
