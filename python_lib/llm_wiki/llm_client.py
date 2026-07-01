"""
LLM client implementations — port of src/llm-client.ts

Three client classes:
  • AnthropicClient          — native Anthropic API
  • AnthropicCompatibleClient — third-party Anthropic-protocol endpoints
  • OpenAICompatibleClient   — OpenAI-protocol endpoints (OpenAI, Gemini,
                               DeepSeek, Ollama, LM Studio, RITS/vLLM, etc.)

All HTTP calls use `httpx` (sync or async) instead of Obsidian's requestUrl.
`asyncio.get_event_loop().run_until_complete()` is used internally so every
public method is also callable synchronously; the async variants are available
as `await client.create_message_async(...)`.

Factory function:
    create_llm_client(settings) → LLMClient
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import re
import time
from typing import Any, Callable, Dict, List, Literal, Optional, Set, Tuple

import httpx

from .constants import MAX_RETRIES, MAX_TOKENS_BATCH, RETRY_BASE_DELAY_MS
from .core.markdown import wrap_reasoning_content
from .core.sse_parser import parse_sse_events

log = logging.getLogger("llm_wiki.client")

# ──────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ──────────────────────────────────────────────────────────────────────────────

ThinkingControlDialect = Literal["anthropic", "openai", "none"]

_RETRYABLE = re.compile(
    r"status 5\d{2}|status 429|overload|network|fetch|econnrefused|etimedout|timeout|abort",
    re.IGNORECASE,
)
_IS_400 = re.compile(r"status 400|HTTP 400|Bad Request", re.IGNORECASE)
_THINKING_CTRL_ERR = re.compile(
    r"unknown field|unsupported field|invalid parameter|not supported|reasoning_effort|thinking",
    re.IGNORECASE,
)


def _is_thinking_control_error(err: BaseException) -> bool:
    msg = str(err)
    if not _IS_400.search(msg):
        return False
    return bool(_THINKING_CTRL_ERR.search(msg))


def _parse_unknown_fields(err: BaseException) -> List[str]:
    """Extract rejected field names from a 400 error body."""
    text = str(err)
    fields: Set[str] = set()
    for m in re.finditer(r'Unknown name "([^"]+)"', text):
        fields.add(m.group(1))
    for m in re.finditer(r"\b([A-Za-z_][A-Za-z0-9_]*)\s+must be in the range", text):
        fields.add(m.group(1))
    for m in re.finditer(r"Unknown field:?\s*([A-Za-z_][A-Za-z0-9_]*)", text):
        fields.add(m.group(1))
    for m in re.finditer(r"invalid parameter\s+['\"]?([A-Za-z_][A-Za-z0-9_]*)", text, re.IGNORECASE):
        fields.add(m.group(1))
    return list(fields)


async def _with_retry(fn: Callable, max_attempts: int = MAX_RETRIES + 1, label: str = "API") -> Any:
    last_err: Optional[BaseException] = None
    for attempt in range(max_attempts):
        try:
            return await fn()
        except Exception as err:
            last_err = err
            msg = str(err)
            if _RETRYABLE.search(msg) and attempt < max_attempts - 1:
                delay = (2 ** attempt) * RETRY_BASE_DELAY_MS / 1000 + random.random()
                log.warning("%s error on attempt %d, retrying in %.1fs: %s", label, attempt + 1, delay, msg)
                await asyncio.sleep(delay)
                continue
            raise
    raise last_err  # type: ignore[misc]


async def _with_truncation_retry(
    initial_fn: Callable,
    retry_fn: Callable,
    is_truncated: Callable,
    extract_text: Callable,
    get_max_tokens: Callable,
    max_cap: int = MAX_TOKENS_BATCH,
    label: str = "API",
    on_truncated: Optional[Callable] = None,
) -> str:
    initial = await initial_fn()
    text = extract_text(initial)

    if not is_truncated(initial):
        return text

    if on_truncated:
        on_truncated(initial)

    current_max = get_max_tokens()
    retry_tokens = min(current_max * 2, max_cap)
    log.warning("%s response truncated at %d tokens. Retrying with %d.", label, current_max, retry_tokens)
    retry_resp = await retry_fn(retry_tokens)
    return extract_text(retry_resp)


def _run(coro) -> Any:
    """Run an async coroutine synchronously (safe for non-async callers)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Inside an existing event loop (e.g. Jupyter / FastAPI)
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                fut = pool.submit(asyncio.run, coro)
                return fut.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


# ──────────────────────────────────────────────────────────────────────────────
# Base client protocol
# ──────────────────────────────────────────────────────────────────────────────

class LLMClient:
    """Abstract base class for all LLM clients."""

    async def create_message_async(
        self,
        model: str,
        max_tokens: int,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        response_format: Optional[Dict] = None,
        max_tokens_per_call: Optional[int] = None,
        enable_thinking: Optional[bool] = None,
        temperature: Optional[float] = None,
        repetition_penalty: Optional[float] = None,
        cache_breakpoint: Optional[int] = None,
        chat_template_kwargs: Optional[Dict] = None,
    ) -> str:
        raise NotImplementedError

    def create_message(self, **kwargs) -> str:
        """Synchronous wrapper around create_message_async."""
        return _run(self.create_message_async(**kwargs))

    async def create_message_stream_async(
        self,
        model: str,
        max_tokens: int,
        messages: List[Dict[str, str]],
        on_chunk: Callable[[str], None],
        system: Optional[str] = None,
        enable_thinking: Optional[bool] = None,
        temperature: Optional[float] = None,
        repetition_penalty: Optional[float] = None,
    ) -> str:
        raise NotImplementedError

    def create_message_stream(self, **kwargs) -> str:
        """Synchronous wrapper around create_message_stream_async."""
        return _run(self.create_message_stream_async(**kwargs))

    async def list_models_async(self) -> List[str]:
        return []

    def list_models(self) -> List[str]:
        return _run(self.list_models_async())


# ──────────────────────────────────────────────────────────────────────────────
# Anthropic-compatible client (third-party endpoints using the Anthropic protocol)
# ──────────────────────────────────────────────────────────────────────────────

class AnthropicCompatibleClient(LLMClient):
    """
    Client for third-party services that speak the Anthropic Messages API
    (e.g. local proxies, custom gateways).
    """

    def __init__(self, api_key: str, base_url: str) -> None:
        self.api_key = api_key
        base = re.sub(r"/v1/?$", "", base_url).rstrip("/")
        self.base_url = base + "/v1"
        self.api_version = "2023-06-01"
        self.thinking_control_supported: Optional[bool] = None
        self._prefilling_not_supported = False

    def _extract_text(self, content: List[Dict]) -> str:
        block = next((c for c in content if c.get("type") == "text"), None)
        return block.get("text", "") if block else ""

    async def create_message_async(
        self,
        model: str,
        max_tokens: int,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        response_format: Optional[Dict] = None,
        max_tokens_per_call: Optional[int] = None,
        enable_thinking: Optional[bool] = None,
        temperature: Optional[float] = None,
        repetition_penalty: Optional[float] = None,
        cache_breakpoint: Optional[int] = None,
        chat_template_kwargs: Optional[Dict] = None,
    ) -> str:
        should_prefill = (
            response_format and response_format.get("type") == "json_object"
            and not self._prefilling_not_supported
        )
        body: Dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": ([*messages, {"role": "assistant", "content": "{"}]
                         if should_prefill else list(messages)),
        }
        if system:
            body["system"] = system
        if temperature is not None:
            body["temperature"] = temperature
        if repetition_penalty is not None:
            body["repetition_penalty"] = repetition_penalty
        if chat_template_kwargs is not None:
            body["chat_template_kwargs"] = chat_template_kwargs
        if enable_thinking is False:
            body["thinking"] = {"type": "disabled"}

        async def do_request(request_body: Dict) -> str:
            return await _with_retry(
                lambda: self._post(request_body, max_tokens, max_tokens_per_call or MAX_TOKENS_BATCH,
                                   response_format, should_prefill),
                label="Anthropic-compatible API",
            )

        try:
            return await do_request(body)
        except Exception as e:
            msg = str(e)
            if should_prefill and _IS_400.search(msg):
                self._prefilling_not_supported = True
                no_prefill = {**body, "messages": list(messages)}
                return await do_request(no_prefill)
            if enable_thinking is False and _is_thinking_control_error(e):
                self.thinking_control_supported = False
                fallback = {**body, "messages": list(messages)}
                fallback.pop("thinking", None)
                if response_format and response_format.get("type") == "json_object":
                    fallback["messages"] = [*list(messages), {"role": "assistant", "content": "{"}]
                return await do_request(fallback)
            raise

    async def _post(
        self,
        body: Dict,
        max_tokens: int,
        max_cap: int,
        response_format: Optional[Dict],
        should_prefill: bool,
    ) -> str:
        headers = {
            "x-api-key": self.api_key,
            "Anthropic-Version": self.api_version,
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                self.base_url + "/messages",
                headers=headers,
                content=json.dumps(body),
            )

        if resp.status_code >= 400:
            raise RuntimeError(f"status {resp.status_code}: {resp.text[:500]}")

        data = resp.json()
        if "error" in data:
            raise RuntimeError(f"status {resp.status_code}: {data['error']['message']}")

        async def initial_fn():
            return data

        async def retry_fn(retry_tokens: int):
            async with httpx.AsyncClient(timeout=300.0) as client:
                r = await client.post(
                    self.base_url + "/messages",
                    headers=headers,
                    content=json.dumps({**body, "max_tokens": retry_tokens}),
                )
            if r.status_code >= 400:
                raise RuntimeError(f"status {r.status_code}: {r.text[:500]}")
            rd = r.json()
            if "error" in rd:
                raise RuntimeError(f"status {r.status_code}: {rd['error']['message']}")
            return rd

        text = await _with_truncation_retry(
            initial_fn=initial_fn,
            retry_fn=retry_fn,
            is_truncated=lambda r: r.get("stop_reason") == "max_tokens",
            extract_text=lambda r: self._extract_text(r.get("content") or []),
            get_max_tokens=lambda: max_tokens,
            max_cap=max_cap,
            label="Anthropic-compatible API",
        )

        if response_format and response_format.get("type") == "json_object" and text and text[0] != "{":
            return "{" + text
        return text

    async def create_message_stream_async(
        self,
        model: str,
        max_tokens: int,
        messages: List[Dict[str, str]],
        on_chunk: Callable[[str], None],
        system: Optional[str] = None,
        enable_thinking: Optional[bool] = None,
        temperature: Optional[float] = None,
        repetition_penalty: Optional[float] = None,
    ) -> str:
        body: Dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": list(messages),
            "stream": True,
        }
        if system:
            body["system"] = system
        if temperature is not None:
            body["temperature"] = temperature
        if repetition_penalty is not None:
            body["repetition_penalty"] = repetition_penalty
        if enable_thinking is False:
            body["thinking"] = {"type": "disabled"}

        headers = {
            "x-api-key": self.api_key,
            "Anthropic-Version": self.api_version,
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                self.base_url + "/messages",
                headers=headers,
                content=json.dumps(body),
            )

        response_text = resp.text
        deltas = parse_sse_events(response_text, "anthropic")
        full_text = ""
        for delta in deltas:
            if delta.text:
                full_text += delta.text
                on_chunk(delta.text)

        if not full_text:
            try:
                data = json.loads(response_text)
                if "error" in data:
                    raise RuntimeError(data["error"]["message"])
                full_text = self._extract_text(data.get("content") or [])
                if full_text:
                    on_chunk(full_text)
            except Exception:
                pass

        if not full_text:
            raise RuntimeError(
                "Anthropic-compatible endpoint returned neither SSE events "
                "nor a standard JSON response. "
                f"Response preview: {response_text[:300]}"
            )
        return full_text


# ──────────────────────────────────────────────────────────────────────────────
# Native Anthropic client
# ──────────────────────────────────────────────────────────────────────────────

class AnthropicClient(LLMClient):
    """Native Anthropic API client (api.anthropic.com)."""

    def __init__(self, api_key: str, base_url: Optional[str] = None) -> None:
        self.api_key = api_key
        normalized = (base_url or "https://api.anthropic.com")
        normalized = re.sub(r"/v1/?$", "", normalized).rstrip("/")
        self.base_url = normalized + "/v1"
        self.api_version = "2023-06-01"
        self.thinking_control_supported: Optional[bool] = None
        self._prefilling_not_supported = False

    async def create_message_async(
        self,
        model: str,
        max_tokens: int,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        response_format: Optional[Dict] = None,
        max_tokens_per_call: Optional[int] = None,
        enable_thinking: Optional[bool] = None,
        temperature: Optional[float] = None,
        repetition_penalty: Optional[float] = None,
        cache_breakpoint: Optional[int] = None,
        chat_template_kwargs: Optional[Dict] = None,
    ) -> str:
        should_prefill = (
            response_format and response_format.get("type") == "json_object"
            and not self._prefilling_not_supported
        )
        msgs: List[Any] = list(messages)
        if should_prefill:
            msgs = [*msgs, {"role": "assistant", "content": "{"}]

        body: Dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": msgs,
        }
        if system:
            body["system"] = system
        if temperature is not None:
            body["temperature"] = temperature
        if repetition_penalty is not None:
            body["repetition_penalty"] = repetition_penalty
        if chat_template_kwargs is not None:
            body["chat_template_kwargs"] = chat_template_kwargs
        if enable_thinking is False:
            body["thinking"] = {"type": "disabled"}

        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "Anthropic-Version": self.api_version,
        }

        async def do_request(request_body: Dict) -> str:
            async def _call() -> str:
                async with httpx.AsyncClient(timeout=300.0) as client:
                    resp = await client.post(
                        f"{self.base_url}/messages",
                        headers=headers,
                        content=json.dumps(request_body),
                    )
                if resp.status_code >= 400:
                    raise RuntimeError(f"status {resp.status_code}: {resp.text[:500]}")
                data = resp.json()
                if "error" in data:
                    raise RuntimeError(f"status {resp.status_code}: {data['error']['message']}")

                async def initial_fn():
                    return data

                async def retry_fn(retry_tokens: int):
                    async with httpx.AsyncClient(timeout=300.0) as c:
                        r = await c.post(
                            f"{self.base_url}/messages",
                            headers=headers,
                            content=json.dumps({**request_body, "max_tokens": retry_tokens}),
                        )
                    if r.status_code >= 400:
                        raise RuntimeError(f"status {r.status_code}: {r.text[:500]}")
                    rd = r.json()
                    if "error" in rd:
                        raise RuntimeError(f"status {r.status_code}: {rd['error']['message']}")
                    return rd

                text = await _with_truncation_retry(
                    initial_fn=initial_fn,
                    retry_fn=retry_fn,
                    is_truncated=lambda r: r.get("stop_reason") == "max_tokens",
                    extract_text=lambda r: next(
                        (b.get("text", "") for b in (r.get("content") or []) if b.get("type") == "text"), ""
                    ),
                    get_max_tokens=lambda: max_tokens,
                    max_cap=max_tokens_per_call or MAX_TOKENS_BATCH,
                    label="Anthropic API",
                )

                if response_format and response_format.get("type") == "json_object" and text and text[0] != "{":
                    return "{" + text
                return text

            return await _with_retry(_call, label="Anthropic API")

        try:
            return await do_request(body)
        except Exception as e:
            msg = str(e)
            if should_prefill and _IS_400.search(msg):
                self._prefilling_not_supported = True
                no_prefill = {**body, "messages": list(messages)}
                return await do_request(no_prefill)
            if enable_thinking is False and _is_thinking_control_error(e):
                self.thinking_control_supported = False
                fallback = {**body, "messages": list(messages)}
                fallback.pop("thinking", None)
                return await do_request(fallback)
            raise

    async def create_message_stream_async(
        self,
        model: str,
        max_tokens: int,
        messages: List[Dict[str, str]],
        on_chunk: Callable[[str], None],
        system: Optional[str] = None,
        enable_thinking: Optional[bool] = None,
        temperature: Optional[float] = None,
        repetition_penalty: Optional[float] = None,
    ) -> str:
        msgs = list(messages)
        if not system:
            msgs = [*msgs, {
                "role": "user",
                "content": (
                    "Please respond in the same language as the user's question. "
                    "If the user asks in Chinese, reply in Chinese. "
                    "If the user asks in English, reply in English."
                ),
            }]

        stream_body: Dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": msgs,
            "stream": True,
        }
        if system:
            stream_body["system"] = system
        if temperature is not None:
            stream_body["temperature"] = temperature
        if repetition_penalty is not None:
            stream_body["repetition_penalty"] = repetition_penalty
        if enable_thinking is False:
            stream_body["thinking"] = {"type": "disabled"}

        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "Anthropic-Version": self.api_version,
        }
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                f"{self.base_url}/messages",
                headers=headers,
                content=json.dumps(stream_body),
            )

        response_text = resp.text
        deltas = parse_sse_events(response_text, "anthropic")
        full_text = ""
        for d in deltas:
            if d.text:
                full_text += d.text
                on_chunk(d.text)
        return full_text

    async def list_models_async(self) -> List[str]:
        headers = {
            "x-api-key": self.api_key,
            "Anthropic-Version": self.api_version,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{self.base_url}/models", headers=headers)
        data = resp.json()
        models = data.get("data", [])
        return sorted(
            m["id"] for m in models
            if ":" not in m["id"] and "/" not in m["id"]
        )


# ──────────────────────────────────────────────────────────────────────────────
# OpenAI-compatible client (OpenAI, Gemini, DeepSeek, Ollama, LM Studio, RITS…)
# ──────────────────────────────────────────────────────────────────────────────

_PROTECTED_FIELDS = {"model", "messages", "stream"}


class OpenAICompatibleClient(LLMClient):
    """
    Client for all OpenAI chat/completions-protocol endpoints.
    Handles thinking-control dialect fallback, field-strip retry, and
    RITS custom header injection.
    """

    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        rits_api_key: str = "",
    ) -> None:
        self.api_key = api_key
        self.base_url = (base_url or "https://api.openai.com/v1").rstrip("/")
        self.rits_api_key = rits_api_key
        self.thinking_control_dialect: Optional[ThinkingControlDialect] = None
        self.unsupported_fields: Set[str] = set()
        self.language: str = "en"

    def _get_headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if self.rits_api_key:
            headers["RITS_API_KEY"] = self.rits_api_key
        return headers

    def _build_request_body(
        self,
        model: str,
        max_tokens: int,
        messages: List[Dict[str, str]],
        temperature: Optional[float],
        repetition_penalty: Optional[float],
        chat_template_kwargs: Optional[Dict],
        enable_thinking: Optional[bool],
        streaming: bool,
    ) -> Dict[str, Any]:
        is_gpt5 = model == "gpt-5" or model.startswith("gpt-5-")
        token_key = "max_completion_tokens" if is_gpt5 else "max_tokens"

        body: Dict[str, Any] = {
            "model": model,
            token_key: max_tokens,
            "messages": messages,
        }
        if streaming:
            body["stream"] = True

        if temperature is not None and "temperature" not in self.unsupported_fields:
            body["temperature"] = temperature
        if repetition_penalty is not None and "repetition_penalty" not in self.unsupported_fields:
            body["repetition_penalty"] = repetition_penalty
        if chat_template_kwargs is not None and "chat_template_kwargs" not in self.unsupported_fields:
            body["chat_template_kwargs"] = chat_template_kwargs

        if enable_thinking is False:
            dialect = self.thinking_control_dialect or "anthropic"
            if dialect == "anthropic":
                body["thinking"] = {"type": "disabled"}
            elif dialect == "openai":
                body["reasoning_effort"] = "none"
            # dialect == "none" → no field

        return body

    def _confirm_dialect(self, body: Dict[str, Any]) -> None:
        if "thinking" in body and self.thinking_control_dialect != "anthropic":
            self.thinking_control_dialect = "anthropic"
        elif "reasoning_effort" in body and self.thinking_control_dialect != "openai":
            self.thinking_control_dialect = "openai"

    def _retry_body_stripped(self, body: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.unsupported_fields:
            return None
        retry = dict(body)
        changed = False
        for f in self.unsupported_fields:
            if f in retry:
                del retry[f]
                changed = True
        return retry if changed else None

    async def _apply_thinking_fallback(
        self,
        body: Dict[str, Any],
        model: str,
        max_tokens: int,
        messages: List[Dict[str, str]],
        temperature: Optional[float],
        repetition_penalty: Optional[float],
        chat_template_kwargs: Optional[Dict],
        enable_thinking: Optional[bool],
        do_request: Callable,
    ) -> str:
        sent_thinking = "thinking" in body
        sent_reasoning = "reasoning_effort" in body
        started_at = self.thinking_control_dialect
        reached_tier2 = sent_thinking and (started_at is None or started_at == "anthropic")

        if reached_tier2:
            self.thinking_control_dialect = "openai"
            log.debug("thinking fallback anthropic → openai for %s", self.base_url)
            try:
                new_body = self._build_request_body(
                    model, max_tokens, messages, temperature,
                    repetition_penalty, chat_template_kwargs, enable_thinking, False,
                )
                return await do_request(new_body)
            except Exception as e2:
                if not _is_thinking_control_error(e2):
                    raise

        if reached_tier2 or sent_reasoning:
            self.thinking_control_dialect = "none"
            log.debug("thinking fallback → none for %s", self.base_url)
            new_body = self._build_request_body(
                model, max_tokens, messages, temperature,
                repetition_penalty, chat_template_kwargs, enable_thinking, False,
            )
            return await do_request(new_body)

        raise RuntimeError(
            f"Thinking control rejected by {self.base_url} for all known dialects "
            "(anthropic, openai, none). Try disabling thinking in settings."
        )

    async def create_message_async(
        self,
        model: str,
        max_tokens: int,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        response_format: Optional[Dict] = None,
        max_tokens_per_call: Optional[int] = None,
        enable_thinking: Optional[bool] = None,
        temperature: Optional[float] = None,
        repetition_penalty: Optional[float] = None,
        cache_breakpoint: Optional[int] = None,
        chat_template_kwargs: Optional[Dict] = None,
    ) -> str:
        full_messages: List[Dict[str, str]] = []
        if system:
            full_messages.append({"role": "system", "content": system})
        full_messages.extend(messages)

        body = self._build_request_body(
            model, max_tokens, full_messages, temperature,
            repetition_penalty, chat_template_kwargs, enable_thinking, False,
        )

        async def do_request(request_body: Dict) -> str:
            async def _call() -> str:
                async with httpx.AsyncClient(timeout=300.0) as client:
                    try:
                        resp = await client.post(
                            self.base_url + "/chat/completions",
                            headers=self._get_headers(),
                            content=json.dumps(request_body),
                        )
                    except httpx.HTTPStatusError as e:
                        self._handle_400_fields(e)
                        raise RuntimeError(f"status {e.response.status_code}: {e.response.text[:500]}") from e

                if resp.status_code >= 400:
                    err_text = resp.text
                    # Parse rejected fields
                    class FakeErr(Exception):
                        pass
                    fe = FakeErr(f"status {resp.status_code}: {err_text}")
                    unknown = _parse_unknown_fields(fe)
                    for f in unknown:
                        if f not in _PROTECTED_FIELDS:
                            self.unsupported_fields.add(f)
                    raise RuntimeError(f"status {resp.status_code}: {err_text[:500]}")

                data = resp.json()
                if "error" in data:
                    raise RuntimeError(f"status {resp.status_code}: {data['error']['message']}")

                choices = data.get("choices") or []
                first = choices[0] if choices else {}
                reasoning = first.get("message", {}).get("reasoning_content", "")
                content_text = first.get("message", {}).get("content", "") or ""
                initial_text = wrap_reasoning_content(reasoning, content_text)

                token_key = "max_completion_tokens" if "max_completion_tokens" in request_body else "max_tokens"

                async def initial_fn():
                    self._confirm_dialect(request_body)
                    return {"choices": choices, "initial_text": initial_text}

                async def retry_fn(retry_tokens: int):
                    async with httpx.AsyncClient(timeout=300.0) as c:
                        r = await c.post(
                            self.base_url + "/chat/completions",
                            headers=self._get_headers(),
                            content=json.dumps({**request_body, token_key: retry_tokens}),
                        )
                    if r.status_code >= 400:
                        raise RuntimeError(f"status {r.status_code}: {r.text[:500]}")
                    rd = r.json()
                    if "error" in rd:
                        raise RuntimeError(f"status {r.status_code}: {rd['error']['message']}")
                    rd_choices = rd.get("choices") or []
                    rd_first = rd_choices[0] if rd_choices else {}
                    rr = rd_first.get("message", {}).get("reasoning_content", "")
                    rc = rd_first.get("message", {}).get("content", "") or ""
                    return {
                        "choices": rd_choices,
                        "initial_text": wrap_reasoning_content(rr, rc),
                    }

                def _is_truncated(r: Dict) -> bool:
                    ch = r.get("choices") or []
                    return bool(ch) and ch[0].get("finish_reason") == "length"

                def _extract_text(r: Dict) -> str:
                    text = r.get("initial_text", "")
                    if text:
                        return text
                    ch = r.get("choices") or []
                    return (ch[0].get("message", {}).get("content", "") if ch else "") or ""

                return await _with_truncation_retry(
                    initial_fn=initial_fn,
                    retry_fn=retry_fn,
                    is_truncated=_is_truncated,
                    extract_text=_extract_text,
                    get_max_tokens=lambda: max_tokens,
                    max_cap=max_tokens_per_call or MAX_TOKENS_BATCH,
                    label="OpenAI-compatible API",
                )

            return await _with_retry(_call, label="OpenAI-compatible API")

        try:
            return await do_request(body)
        except Exception as e:
            if enable_thinking is False and _is_thinking_control_error(e):
                return await self._apply_thinking_fallback(
                    body, model, max_tokens, full_messages, temperature,
                    repetition_penalty, chat_template_kwargs, enable_thinking, do_request,
                )
            stripped = self._retry_body_stripped(body)
            if stripped is not None:
                log.debug("retrying without unsupported fields: %s", self.unsupported_fields)
                return await do_request(stripped)
            raise

    def _handle_400_fields(self, err: Exception) -> None:
        unknown = _parse_unknown_fields(err)
        for f in unknown:
            if f not in _PROTECTED_FIELDS:
                self.unsupported_fields.add(f)

    async def create_message_stream_async(
        self,
        model: str,
        max_tokens: int,
        messages: List[Dict[str, str]],
        on_chunk: Callable[[str], None],
        system: Optional[str] = None,
        enable_thinking: Optional[bool] = None,
        temperature: Optional[float] = None,
        repetition_penalty: Optional[float] = None,
    ) -> str:
        full_messages: List[Dict[str, str]] = []
        if system:
            full_messages.append({"role": "system", "content": system})
        else:
            full_messages.extend(messages)
            full_messages.append({
                "role": "user",
                "content": (
                    "Please respond in the same language as the user's question. "
                    "If the user asks in Chinese, reply in Chinese. "
                    "If the user asks in English, reply in English."
                ),
            })
        if system:
            full_messages.extend(messages)

        body = self._build_request_body(
            model, max_tokens, full_messages, temperature,
            repetition_penalty, None, enable_thinking, True,
        )

        async def do_request(request_body: Dict) -> str:
            async def _call() -> str:
                async with httpx.AsyncClient(timeout=300.0) as client:
                    resp = await client.post(
                        self.base_url + "/chat/completions",
                        headers=self._get_headers(),
                        content=json.dumps(request_body),
                    )
                if resp.status_code >= 400:
                    err_obj = RuntimeError(f"status {resp.status_code}: {resp.text[:500]}")
                    unknown = _parse_unknown_fields(err_obj)
                    for f in unknown:
                        if f not in _PROTECTED_FIELDS:
                            self.unsupported_fields.add(f)
                    raise err_obj

                response_text = resp.text
                deltas = parse_sse_events(response_text, "openai")
                full_text = ""
                reasoning_acc = ""
                for delta in deltas:
                    if delta.reasoning:
                        reasoning_acc += delta.reasoning
                    if delta.text:
                        full_text += delta.text
                        on_chunk(delta.text)

                if reasoning_acc:
                    full_text = wrap_reasoning_content(reasoning_acc, full_text)

                if not full_text:
                    try:
                        data = json.loads(response_text)
                        if "error" in data:
                            raise RuntimeError(data["error"]["message"])
                        t = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        r = data.get("choices", [{}])[0].get("message", {}).get("reasoning_content", "")
                        if t or r:
                            full_text = wrap_reasoning_content(r, t)
                            if t:
                                on_chunk(t)
                    except Exception:
                        pass

                if not full_text:
                    raise RuntimeError(
                        f"OpenAI-compatible endpoint returned neither SSE events "
                        f"nor a standard JSON response. Preview: {response_text[:300]}"
                    )
                return full_text

            return await _with_retry(_call, label="OpenAI-compatible stream")

        try:
            return await do_request(body)
        except Exception as e:
            if enable_thinking is False and _is_thinking_control_error(e):
                return await self._apply_thinking_fallback(
                    body, model, max_tokens, full_messages, temperature,
                    repetition_penalty, None, enable_thinking, do_request,
                )
            stripped = self._retry_body_stripped(body)
            if stripped is not None:
                return await do_request(stripped)
            raise

    async def list_models_async(self) -> List[str]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                self.base_url + "/models",
                headers=self._get_headers(),
            )
        try:
            data = resp.json()
        except Exception:
            return []
        if "error" in data:
            return []
        models = data.get("data", [])
        ids = [m["id"] for m in models if ":" not in m["id"] and "/" not in m["id"]]
        return sorted(ids)[:100]


# ──────────────────────────────────────────────────────────────────────────────
# Wrapper — inject advanced settings (port of llm-client-wrapper.ts)
# ──────────────────────────────────────────────────────────────────────────────

class _AdvancedSettingsWrapper(LLMClient):
    """
    Thin wrapper that injects maxTokensPerCall / temperature / repetitionPenalty
    into every create_message call without changing the wrapped client.
    """

    def __init__(
        self,
        inner: LLMClient,
        max_tokens_per_call: int = 0,
        extraction_temperature: Optional[float] = None,
        chat_temperature: Optional[float] = None,
        repetition_penalty: Optional[float] = None,
    ) -> None:
        self._inner = inner
        self._max_tokens = max_tokens_per_call
        self._extraction_temp = extraction_temperature
        self._chat_temp = chat_temperature
        self._rep_penalty = repetition_penalty

    async def create_message_async(self, **kwargs) -> str:  # type: ignore[override]
        if self._max_tokens > 0:
            kwargs["max_tokens"] = min(kwargs.get("max_tokens", 99999), self._max_tokens)
            kwargs["max_tokens_per_call"] = self._max_tokens
        if kwargs.get("temperature") is None and self._extraction_temp is not None:
            kwargs["temperature"] = self._extraction_temp
        if kwargs.get("repetition_penalty") is None and self._rep_penalty is not None:
            kwargs["repetition_penalty"] = self._rep_penalty
        return await self._inner.create_message_async(**kwargs)

    def create_message(self, **kwargs) -> str:
        return _run(self.create_message_async(**kwargs))

    async def create_message_stream_async(self, **kwargs) -> str:  # type: ignore[override]
        if self._max_tokens > 0:
            kwargs["max_tokens"] = min(kwargs.get("max_tokens", 99999), self._max_tokens)
        if kwargs.get("temperature") is None and self._chat_temp is not None:
            kwargs["temperature"] = self._chat_temp
        if kwargs.get("repetition_penalty") is None and self._rep_penalty is not None:
            kwargs["repetition_penalty"] = self._rep_penalty
        return await self._inner.create_message_stream_async(**kwargs)

    def create_message_stream(self, **kwargs) -> str:
        return _run(self.create_message_stream_async(**kwargs))

    async def list_models_async(self) -> List[str]:
        return await self._inner.list_models_async()

    def list_models(self) -> List[str]:
        return _run(self.list_models_async())


# ──────────────────────────────────────────────────────────────────────────────
# Factory
# ──────────────────────────────────────────────────────────────────────────────

def create_llm_client(settings: Any) -> LLMClient:
    """
    Build and configure an LLMClient from LLMWikiSettings.
    Mirrors createLLMClient() in src/main.ts.
    """
    from .types import PREDEFINED_PROVIDERS

    provider = settings.provider
    api_key = (settings.api_key or "").strip()
    base_url = (settings.base_url or "").strip()

    if provider == "anthropic":
        client: LLMClient = AnthropicClient(api_key)

    elif provider == "anthropic-compatible":
        if base_url:
            client = AnthropicCompatibleClient(api_key, base_url)
        else:
            client = AnthropicClient(api_key)

    elif provider == "rits":
        provider_cfg = PREDEFINED_PROVIDERS.get(provider)
        effective_url = base_url or (provider_cfg.base_url if provider_cfg else None) or None
        rits_api_key = (settings.rits_api_key or "").strip()
        client = OpenAICompatibleClient(api_key, effective_url, rits_api_key)

    else:
        provider_cfg = PREDEFINED_PROVIDERS.get(provider)
        effective_url = base_url or (provider_cfg.base_url if provider_cfg else None) or None
        if provider in ("ollama", "lmstudio"):
            api_key = api_key or "lmstudio"
        client = OpenAICompatibleClient(api_key, effective_url)

    # Sync thinking-control dialect cache
    if isinstance(client, OpenAICompatibleClient):
        cache = getattr(settings, "thinking_control_cache", None) or {}
        cache_key = base_url or (PREDEFINED_PROVIDERS[provider].base_url if provider in PREDEFINED_PROVIDERS else "")
        if cache_key and cache_key in cache:
            cached = cache[cache_key]
            if isinstance(cached, bool):
                client.thinking_control_dialect = "anthropic" if cached else "none"
            else:
                client.thinking_control_dialect = cached
        client.language = getattr(settings, "language", "en")

    # Wrap with advanced settings
    return _AdvancedSettingsWrapper(
        client,
        max_tokens_per_call=getattr(settings, "max_tokens_per_call", 0) or 0,
        extraction_temperature=getattr(settings, "extraction_temperature", None),
        chat_temperature=getattr(settings, "chat_temperature", None),
        repetition_penalty=getattr(settings, "repetition_penalty", None),
    )
