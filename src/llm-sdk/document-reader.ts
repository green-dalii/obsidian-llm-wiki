import { APICallError, generateText, type LanguageModel } from 'ai';
import { withTransientRetry } from '../core/transient-retry';
import {
  isDocumentMissingResponse,
  PDF_EXTRACTION_PROMPT,
  PDF_MEDIA_TYPE,
  PdfUnsupportedError,
} from '../core/pdf-support';

export async function sendDocumentRequest(params: {
  languageModel: LanguageModel;
  data: ArrayBuffer;
  filename?: string;
  maxOutputTokens: number;
  providerOptions: Record<string, Record<string, unknown>>;
}): Promise<string> {
  // AI SDK's provider option type is more restrictive than the plugin's
  // forward-compatible provider option record. This is the sole boundary.
  const providerOptions = params.providerOptions as unknown as Parameters<typeof generateText>[0]['providerOptions'];
  const result = await withTransientRetry({
    fn: async () => {
      const response = await generateText({
        model: params.languageModel,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PDF_EXTRACTION_PROMPT },
            {
              type: 'file',
              data: params.data,
              mediaType: PDF_MEDIA_TYPE,
              ...(params.filename ? { filename: params.filename } : {}),
            },
          ],
        }],
        maxOutputTokens: params.maxOutputTokens,
        providerOptions,
      });
      if (isDocumentMissingResponse(response.text)) {
        throw new PdfUnsupportedError('The configured provider or model did not receive the PDF file.');
      }
      return response.text;
    },
    shouldRetry: (error) => APICallError.isInstance(error)
      && (error.statusCode === 429 || (error.statusCode !== undefined && error.statusCode >= 500 && error.statusCode < 600)),
    label: 'PDF extraction',
  });

  if (result.error) throw result.error;
  if (result.value === undefined) throw new Error('PDF extraction returned no text.');
  return result.value;
}
