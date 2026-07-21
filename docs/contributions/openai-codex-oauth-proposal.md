# Proposal: ChatGPT Plan (Codex OAuth)

## User value

Users can authenticate through OpenAI's Codex browser or device flow and use the Codex allowance attached to their ChatGPT plan without replacing the existing OpenAI API-key provider.

## Compatibility boundary

This is experimental third-party compatibility with the Codex OAuth flow, not an OpenAI partnership or a general ChatGPT API. Browser callback is desktop-only; device code works on desktop and mobile.

## Security

Tokens are stored only through Obsidian SecretStorage. The plugin validates PKCE and state, binds the callback to 127.0.0.1, performs one refresh retry, and never logs tokens.

## Review request

Please confirm the provider name, experimental label, Obsidian 1.11.4 minimum, authenticated Codex account-catalog synchronization with sanitized cache and minimal fallback, and direct Codex endpoint approach before the pull request is presented as upstream-ready.
