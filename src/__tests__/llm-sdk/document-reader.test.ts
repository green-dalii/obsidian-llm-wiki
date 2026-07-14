import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APICallError } from 'ai';

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
  return { ...actual, generateText: vi.fn() };
});

import { generateText, type LanguageModel } from 'ai';
import { sendDocumentRequest } from '../../llm-sdk/document-reader';

const mockGenerateText = vi.mocked(generateText);
const languageModel = {} as LanguageModel;
const response = { text: 'transcribed PDF' } as Awaited<ReturnType<typeof generateText>>;
const request = () => sendDocumentRequest({
  languageModel,
  data: new Uint8Array([37, 80, 68, 70]).buffer,
  maxOutputTokens: 16000,
  providerOptions: {},
});

function apiError(statusCode: number): APICallError {
  return new APICallError({
    message: `status ${statusCode}`,
    statusCode,
    responseHeaders: {},
    url: 'https://provider.test',
    requestBodyValues: {},
  });
}

describe('sendDocumentRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGenerateText.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries transient 429 and 5xx responses up to the shared retry limit', async () => {
    mockGenerateText
      .mockRejectedValueOnce(apiError(429))
      .mockRejectedValueOnce(apiError(503))
      .mockResolvedValueOnce(response);

    const promise = request();
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBe('transcribed PDF');
    expect(mockGenerateText).toHaveBeenCalledTimes(3);
  });

  it('surfaces a 400 response without retrying', async () => {
    mockGenerateText.mockRejectedValue(apiError(400));

    await expect(request()).rejects.toThrow('status 400');
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('rejects a gateway response that asks the user to upload the PDF', async () => {
    mockGenerateText.mockResolvedValue({ ...response, text: 'Please upload the PDF file.' });

    await expect(request()).rejects.toThrow('did not receive the PDF file');
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });
});
