# Quick Start Guide

Get started with LLM Wiki Plugin in 5 minutes.

## 1. Install

Download latest release and copy to `.obsidian/plugins/llm-wiki-plugin/`.

Enable in Settings → Community plugins.

## 2. Configure

Open Settings → LLM Wiki:

1. Select **Provider**: Anthropic or OpenAI
2. Enter **API Key**
3. Add **Base URL** (optional, for custom endpoints)
4. Click **Test Connection** → verify success
5. Click **Save Settings**

## 3. Prepare

Create `sources/` folder in your vault.

Add Markdown files:

```markdown
# Machine Learning

Machine learning algorithms learn from data...

## Types
- Supervised learning
- Unsupervised learning
```

## 4. Ingest

Press `Cmd+P` → "Ingest Sources"

Wait for completion notification.

Check `wiki/` folder → generated pages.

## 5. Query

Press `Cmd+P` → "Query Wiki"

Enter question: "What is machine learning?"

View synthesized answer from Wiki content.

## 6. Maintain

Press `Cmd+P` → "Lint Wiki"

Review detected issues:
- Contradictions
- Outdated info
- Orphaned pages

## Next Steps

- Explore knowledge graph (Obsidian Graph View)
- Add more sources
- Customize folders in settings
- Check generated `index.md` and `log.md`

## Troubleshooting

**Connection failed**
- Check API key format
- Verify Base URL (for custom endpoints)
- Test with official API first

**No files processed**
- Check `sources/` folder exists
- Add `.md` files
- Verify folder path in settings

**TypeError**
- Update to latest version (v0.2.2+)
- Check console for details

## Examples

See [README.md](../README.md#example) for input/output examples.

---

**Need help?** Check [README.md](../README.md) or open an [Issue](https://github.com/yourusername/llm-wiki-plugin/issues).