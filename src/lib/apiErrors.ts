type ApiErrorPayload = {
  message?: string;
  error?: string;
};

function humanizeValidation(text: string): string {
  if (/vehicleType/i.test(text) && /enum/i.test(text)) {
    return 'Invalid vehicle type. Choose Bike, Scooter, Bicycle, or Car.';
  }
  if (/mobile/i.test(text)) {
    return 'Please enter a valid 10-digit mobile number.';
  }
  if (/email/i.test(text)) {
    return 'Please enter a valid email address.';
  }
  const cleaned = text
    .replace(/^ValidationError:\s*/i, '')
    .replace(/^Rider validation failed:\s*/i, '');
  return cleaned || text;
}

export function messageFromApiPayload(
  data: ApiErrorPayload | null | undefined,
  fallback: string,
): string {
  const candidates = [data?.error, data?.message].filter(
    (m): m is string => typeof m === 'string' && m.trim().length > 0,
  );

  for (const raw of candidates) {
    if (raw === 'Internal Server Error') continue;
    if (/validation failed|enum value|ValidationError/i.test(raw)) {
      return humanizeValidation(raw);
    }
    return raw;
  }

  return fallback;
}

/** Pull a user-facing message from apiFetch / apiUpload errors. */
export function extractApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const err = error as Error & { data?: ApiErrorPayload };
  if (err.data) {
    return messageFromApiPayload(err.data, err.message || fallback);
  }

  if (err.message && err.message !== 'Internal Server Error') {
    if (/validation failed|enum value|ValidationError/i.test(err.message)) {
      return humanizeValidation(err.message);
    }
    return err.message;
  }

  return fallback;
}

export function apiErrorFromResponse(
  status: number,
  data: ApiErrorPayload | null,
  fallback: string,
): Error & { status?: number; data?: unknown } {
  const err = new Error(messageFromApiPayload(data, fallback)) as Error & {
    status?: number;
    data?: unknown;
  };
  err.status = status;
  err.data = data;
  return err;
}
