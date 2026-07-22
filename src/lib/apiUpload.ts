import { getApiUrl } from '@/config/env';
import { apiErrorFromResponse } from '@/lib/apiErrors';
import { getAccessToken } from '@/lib/storage';
import {
  isRNFormData,
  isLocalImageUri,
  logFormDataParts,
  toUploadFile,
} from '@/lib/multipart';

function parseUploadResponse(xhr: XMLHttpRequest) {
  const text = xhr.responseText;
  let data: { message?: string; error?: string } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (xhr.status < 200 || xhr.status >= 300) {
    throw apiErrorFromResponse(xhr.status, data, `Upload failed (${xhr.status})`);
  }
  return data;
}

/** Multipart upload via XHR — more reliable than fetch for RN FormData. */
export async function apiUploadForm<T = unknown>(path: string, formData: FormData): Promise<T> {
  if (!isRNFormData(formData)) {
    throw new Error(
      'Unsupported FormData implementation. Rebuild the app; multipart requires React Native FormData.',
    );
  }

  const url = path.startsWith('http') ? path : `${getApiUrl()}${path}`;
  logFormDataParts(formData, `POST ${url}`);

  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  if (__DEV__) {
    console.log('[apiUpload] starting XHR upload', { url, hasAuth: Boolean(accessToken) });
  }

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));

    xhr.onload = () => {
      try {
        if (__DEV__) console.log('[apiUpload] done', { status: xhr.status });
        resolve(parseUploadResponse(xhr) as T);
      } catch (e) {
        if (__DEV__) console.error('[apiUpload] response error', e);
        reject(e);
      }
    };

    xhr.onerror = () => {
      if (__DEV__) console.error('[apiUpload] network error');
      reject(new Error('Network error during file upload'));
    };

    xhr.onabort = () => reject(new Error('Upload aborted'));

    try {
      xhr.send(formData);
    } catch (e) {
      if (__DEV__) console.error('[apiUpload] xhr.send failed', e);
      reject(e instanceof Error ? e : new Error('Failed to send upload'));
    }
  });
}

export async function uploadRiderDocument(
  type: 'profileImage' | 'drivingLicense' | 'aadhaarCard',
  localUri: string,
): Promise<string> {
  if (__DEV__) console.log('[apiUpload] uploadRiderDocument', { type, uri: localUri.slice(0, 100) });

  const formData = new FormData();
  formData.append('type', type);
  formData.append('file', toUploadFile(localUri, `${type}.jpg`) as unknown as Blob);

  const body = await apiUploadForm<{ data?: { url?: string } }>('/riders/upload-document', formData);

  const url = body.data?.url;
  if (!url) throw new Error('Upload did not return a URL');
  if (__DEV__) console.log('[apiUpload] uploaded', { type, url: url.slice(0, 80) });
  return url;
}

export { isLocalImageUri };
