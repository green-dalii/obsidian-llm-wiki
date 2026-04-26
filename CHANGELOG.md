# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2026-04-26

### Fixed
- Vault operation errors (`TypeError: Cannot read properties of null`)
- Ensure folders exist before file operations
- Use `instanceof TFile` instead of unsafe type casting
- Handle file existence properly (create vs modify)
- Improve batch processing (individual failures don't stop execution)

### Improved
- Detailed logging for debugging
- Progress statistics (success/failure counts)
- Source folder validation
- User notifications with actionable messages

## [0.2.1] - 2026-04-26

### Fixed
- OpenAI SDK browser environment error
- Add `dangerouslyAllowBrowser: true` for Obsidian Electron environment
- Security documentation and best practices

### Security
- Detailed security analysis in SECURITY.md
- Alternative solutions (local LLM, Anthropic provider)

## [0.2.0] - 2026-04-26

### Added
- Manual save button in settings (replaces auto-save)
- Test connection button to validate LLM provider config
- LLM Client status display (initialized/uninitialized)
- Temporary settings object pattern

### Changed
- Removed problematic `onChange` auto-save
- Explicit user control over configuration saving
- Better user feedback and status indicators

### Fixed
- Configuration persistence issues
- API Key validation logic

## [0.1.0] - 2026-04-26

### Added
- Multi-provider LLM support (Anthropic + OpenAI)
- OpenAI compatible endpoint support (local LLM, custom services)
- Core features: ingest, query, lint, generate index
- Bidirectional links (`[[wiki-links]]`)
- Auto-generated index and operation log
- Git-friendly structure

### Technical
- TypeScript implementation
- Obsidian Plugin API integration
- Anthropic SDK integration
- OpenAI SDK integration
- esbuild build system