import { describe, expect, it, vi } from 'vitest';
import { convertPdfToMarkdownWithBackends } from '../../core/pdf-converter';
import type {
  PdfBackendContext,
  PdfConversionBackend,
  PdfConversionBackendId,
} from '../../core/pdf-backends/types';

function makeBackend(convert: PdfConversionBackend['convert']): PdfConversionBackend {
  return { convert };
}

function makeBackends() {
  const nativeConvert = vi.fn<PdfConversionBackend['convert']>();
  const mineruConvert = vi.fn<PdfConversionBackend['convert']>();
  const backends: Record<PdfConversionBackendId, PdfConversionBackend> = {
    native: makeBackend(nativeConvert),
    mineru: makeBackend(mineruConvert),
  };

  return { backends, nativeConvert, mineruConvert };
}

function makeContext(pdfConversionBackend: unknown): PdfBackendContext {
  return {
    settings: { pdfConversionBackend },
  } as unknown as PdfBackendContext;
}

describe('convertPdfToMarkdownWithBackends', () => {
  it('routes an explicit native setting through the native backend', async () => {
    const { backends, nativeConvert, mineruConvert } = makeBackends();
    const ctx = makeContext('native');
    const result = {
      markdown: '# Native',
      metadata: { convertedAt: '2026-07-21T00:00:00Z', converter: 'native/test' },
    };
    nativeConvert.mockResolvedValueOnce(result);

    await expect(convertPdfToMarkdownWithBackends(ctx, backends)).resolves.toBe(result);
    expect(nativeConvert).toHaveBeenCalledWith(ctx);
    expect(mineruConvert).not.toHaveBeenCalled();
  });

  it('routes an unknown persisted setting through the native backend', async () => {
    const { backends, nativeConvert, mineruConvert } = makeBackends();
    const ctx = makeContext('legacy-value');
    const result = {
      markdown: '# Native',
      metadata: { convertedAt: '2026-07-21T00:00:00Z', converter: 'native/test' },
    };
    nativeConvert.mockResolvedValueOnce(result);

    await expect(convertPdfToMarkdownWithBackends(ctx, backends)).resolves.toBe(result);
    expect(nativeConvert).toHaveBeenCalledWith(ctx);
    expect(mineruConvert).not.toHaveBeenCalled();
  });

  it('does not fall back to native after the MinerU backend rejects', async () => {
    const { backends, nativeConvert, mineruConvert } = makeBackends();
    const ctx = makeContext('mineru');
    const failure = new Error('MinerU conversion failed');
    mineruConvert.mockRejectedValueOnce(failure);

    await expect(convertPdfToMarkdownWithBackends(ctx, backends)).rejects.toBe(failure);

    expect(mineruConvert).toHaveBeenCalledTimes(1);
    expect(mineruConvert).toHaveBeenCalledWith(ctx);
    expect(nativeConvert).not.toHaveBeenCalled();
  });

  it('does not fall forward from native to MinerU after native rejects', async () => {
    const { backends, nativeConvert, mineruConvert } = makeBackends();
    const ctx = makeContext('native');
    const failure = new Error('Native conversion failed');
    nativeConvert.mockRejectedValueOnce(failure);

    await expect(convertPdfToMarkdownWithBackends(ctx, backends)).rejects.toBe(failure);

    expect(nativeConvert).toHaveBeenCalledTimes(1);
    expect(nativeConvert).toHaveBeenCalledWith(ctx);
    expect(mineruConvert).not.toHaveBeenCalled();
  });
});
