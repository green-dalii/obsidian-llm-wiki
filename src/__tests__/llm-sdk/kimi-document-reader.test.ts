import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestUrl, type RequestUrlResponse } from 'obsidian';
import { readKimiDocument } from '../../llm-sdk/kimi-document-reader';

const mockRequestUrl = vi.mocked(requestUrl);

function response(status: number, text = '', json: unknown = {}): RequestUrlResponse {
  return {
    status,
    text,
    json,
    headers: {},
    arrayBuffer: new TextEncoder().encode(text).buffer,
  };
}

describe('readKimiDocument', () => {
  beforeEach(() => {
    mockRequestUrl.mockReset();
  });

  it('uploads the PDF, retrieves extracted text, and deletes the temporary file', async () => {
    mockRequestUrl
      .mockResolvedValueOnce(response(200, '', { id: 'file-kimi-123' }))
      .mockResolvedValueOnce(response(200, 'Kimi extracted document text'))
      .mockResolvedValueOnce(response(200, '', { id: 'file-kimi-123', deleted: true }));

    await expect(readKimiDocument({
      baseURL: 'https://api.moonshot.cn/v1/',
      apiKey: 'kimi-test-key',
      data: new Uint8Array([37, 80, 68, 70]).buffer,
      filename: 'paper.pdf',
    })).resolves.toBe('Kimi extracted document text');

    expect(mockRequestUrl).toHaveBeenCalledTimes(3);
    const uploadRequest = mockRequestUrl.mock.calls[0]?.[0];
    if (!uploadRequest || typeof uploadRequest === 'string') throw new Error('Kimi upload must use request parameters.');
    expect(uploadRequest).toMatchObject({
      url: 'https://api.moonshot.cn/v1/files',
      method: 'POST',
      headers: { Authorization: 'Bearer kimi-test-key' },
      throw: false,
    });
    expect(uploadRequest.contentType).toMatch(/^multipart\/form-data; boundary=/);
    const uploadBody = uploadRequest.body;
    if (!(uploadBody instanceof ArrayBuffer)) throw new Error('Kimi upload must use an ArrayBuffer body.');
    const multipart = new TextDecoder().decode(uploadBody);
    expect(multipart).toContain('name="purpose"');
    expect(multipart).toContain('file-extract');
    expect(multipart).toContain('filename="paper.pdf"');

    expect(mockRequestUrl.mock.calls[1]?.[0]).toMatchObject({
      url: 'https://api.moonshot.cn/v1/files/file-kimi-123/content',
      method: 'GET',
    });
    expect(mockRequestUrl.mock.calls[2]?.[0]).toMatchObject({
      url: 'https://api.moonshot.cn/v1/files/file-kimi-123',
      method: 'DELETE',
    });
  });

  it('still deletes the uploaded file when content extraction fails', async () => {
    mockRequestUrl
      .mockResolvedValueOnce(response(200, '', { id: 'file-kimi-123' }))
      .mockResolvedValueOnce(response(500, 'extract failed'))
      .mockResolvedValueOnce(response(200, '', { id: 'file-kimi-123', deleted: true }));

    await expect(readKimiDocument({
      baseURL: 'https://api.moonshot.cn/v1',
      apiKey: 'kimi-test-key',
      data: new ArrayBuffer(1),
    })).rejects.toThrow('Kimi file extraction failed (status 500): extract failed');

    expect(mockRequestUrl.mock.calls[2]?.[0]).toMatchObject({ method: 'DELETE' });
  });
});
