import { requestUrl, type RequestUrlResponse } from 'obsidian';

export interface KimiDocumentRequest {
  baseURL: string;
  apiKey: string;
  data: ArrayBuffer;
  filename?: string;
}

export async function readKimiDocument(params: KimiDocumentRequest): Promise<string> {
  const baseURL = params.baseURL.replace(/\/$/, '');
  const upload = createMultipartUpload(params.data, params.filename ?? 'document.pdf');
  const headers = { Authorization: `Bearer ${params.apiKey}` };

  const uploadResponse = await requestUrl({
    url: `${baseURL}/files`,
    method: 'POST',
    contentType: `multipart/form-data; boundary=${upload.boundary}`,
    headers,
    body: upload.body,
    throw: false,
  });
  if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
    throw kimiRequestError('file upload', uploadResponse);
  }

  const fileId = readKimiFileId(uploadResponse.json);
  try {
    const contentResponse = await requestUrl({
      url: `${baseURL}/files/${encodeURIComponent(fileId)}/content`,
      method: 'GET',
      headers,
      throw: false,
    });
    if (contentResponse.status < 200 || contentResponse.status >= 300) {
      throw kimiRequestError('file extraction', contentResponse);
    }
    return contentResponse.text;
  } finally {
    try {
      await requestUrl({
        url: `${baseURL}/files/${encodeURIComponent(fileId)}`,
        method: 'DELETE',
        headers,
        throw: false,
      });
    } catch (error) {
      console.warn('Kimi temporary file cleanup failed:', error);
    }
  }
}

function createMultipartUpload(data: ArrayBuffer, filename: string): { boundary: string; body: ArrayBuffer } {
  const boundary = `----KarpathyWiki${crypto.randomUUID()}`;
  const safeFilename = filename.replace(/[\r\n"]/g, '_');
  const encoder = new TextEncoder();
  const prefix = encoder.encode(
    `--${boundary}\r\n`
    + 'Content-Disposition: form-data; name="purpose"\r\n\r\n'
    + 'file-extract\r\n'
    + `--${boundary}\r\n`
    + `Content-Disposition: form-data; name="file"; filename="${safeFilename}"\r\n`
    + 'Content-Type: application/pdf\r\n\r\n',
  );
  const suffix = encoder.encode(`\r\n--${boundary}--\r\n`);
  const file = new Uint8Array(data);
  const body = new Uint8Array(prefix.length + file.length + suffix.length);
  body.set(prefix);
  body.set(file, prefix.length);
  body.set(suffix, prefix.length + file.length);

  return { boundary, body: body.buffer };
}

function readKimiFileId(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'id' in payload && typeof payload.id === 'string') {
    return payload.id;
  }
  throw new Error('Kimi file upload returned no file id.');
}

function kimiRequestError(operation: string, response: RequestUrlResponse): Error {
  const detail = response.text.trim();
  return new Error(`Kimi ${operation} failed (status ${response.status})${detail ? `: ${detail}` : ''}`);
}
