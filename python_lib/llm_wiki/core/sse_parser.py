"""
SSE event parser — port of src/core/sse-parser.ts
Pure function, no IO.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import List, Literal, Optional


SSEFormat = Literal["anthropic", "openai"]


@dataclass
class SSEDelta:
    text: str = ""
    reasoning: Optional[str] = None
    finish_reason: Optional[str] = None


def parse_sse_events(response_text: str, format: SSEFormat) -> List[SSEDelta]:
    """Parse a Server-Sent Events response body into per-event text deltas."""
    normalized = response_text.replace("\r\n", "\n")
    events = normalized.split("\n\n")
    deltas: List[SSEDelta] = []

    for event in events:
        if not event.strip():
            continue

        lines = event.split("\n")
        data_line = next((l for l in lines if l.startswith("data:")), None)
        if not data_line:
            continue

        if format == "openai":
            data_content = data_line[5:].strip()
            if data_content == "[DONE]":
                break

        try:
            json_start = data_line.index("{")
            parsed = json.loads(data_line[json_start:])

            if format == "anthropic":
                if (parsed.get("type") == "content_block_delta"
                        and parsed.get("delta", {}).get("type") == "text_delta"):
                    text = parsed["delta"].get("text", "")
                    if text:
                        deltas.append(SSEDelta(text=text))
            else:  # openai
                choices = parsed.get("choices", [])
                if choices:
                    delta = choices[0].get("delta", {})
                    content = delta.get("content")
                    reasoning = delta.get("reasoning_content")
                    finish = choices[0].get("finish_reason")
                    if content or reasoning:
                        deltas.append(SSEDelta(
                            text=content or "",
                            reasoning=reasoning or None,
                        ))
                    if finish:
                        deltas.append(SSEDelta(text="", finish_reason=finish))
        except (ValueError, KeyError):
            # Skip malformed JSON in SSE
            pass

    return deltas
