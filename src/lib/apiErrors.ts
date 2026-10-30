type ApiErrorPayload = {
  message?: string;
  error?: string;
  errors?: Array<{ path?: string | string[]; message?: string; msg?: string; field?: string }>;
};

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Full name',
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  mobile: 'Mobile number',
  password: 'Password',
  vehicleType: 'Vehicle type',
  vehicleNumber: 'Vehicle number',
  accountHolderName: 'Account holder name',
  accountNumber: 'Account number',
  otp: 'OTP',
};

function labelForField(raw: string): string {
  const key = raw.replace(/^body\.|^data\./, '').split('.').pop() || raw;
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}

function humanizeValidation(text: string): string {
  if (/unauthorized/i.test(text)) {
    return 'Email or password is incorrect. Please try again.';
  }
  if (/invalid credentials|wrong password|incorrect password/i.test(text)) {
    return 'Email or password is incorrect. Please try again.';
  }
  if (/must match pattern|Invalid string/i.test(text)) {
    if (/ifsc|A-Z\]\{4\}0/i.test(text)) {
      return 'Could not save bank branch code. Please try again after the server update.';
    }
    if (/mobile|phone/i.test(text)) {
      return 'Please enter a valid 10-digit mobile number.';
    }
    if (/email/i.test(text)) {
      return 'Please enter a valid email address.';
    }
    if (/password/i.test(text)) {
      return 'Password does not meet the requirements (at least 6 characters).';
    }
    return 'One of the fields has an invalid format. Please check and try again.';
  }
  if (/vehicleType/i.test(text) && /enum/i.test(text)) {
    return 'Invalid vehicle type. Choose Bike, Scooter, Bicycle, or Car.';
  }
  if (/mobile/i.test(text) && /regex|pattern|10/i.test(text)) {
    return 'Please enter a valid 10-digit mobile number.';
  }
  if (/email/i.test(text) && /valid|invalid|required/i.test(text)) {
    return 'Please enter a valid email address.';
  }
  const fieldReq = text.match(
    /(?:^|[\s.])(fullName|firstName|lastName|email|mobile|password|accountHolderName|accountNumber|vehicleType)[\s:.-]*(is\s+)?required/i,
  );
  if (fieldReq) {
    return `${labelForField(fieldReq[1])} is required.`;
  }
  const cleaned = text
    .replace(/^ValidationError:\s*/i, '')
    .replace(/^Rider validation failed:\s*/i, '');
  return cleaned || text;
}

export function messageFromApiPayload(
  data: ApiErrorPayload | null | undefined,
  fallback: string,
  status?: number,
): string {
  if (status === 401 || status === 403) {
    const raw = data?.error || data?.message || '';
    if (/pending/i.test(raw)) return humanizeValidation(raw);
    return 'Email or password is incorrect. Please try again.';
  }

  if (Array.isArray(data?.errors) && data!.errors!.length) {
    const parts = data!.errors!.map((e) => {
      const path = Array.isArray(e.path) ? e.path.join('.') : e.path || e.field || '';
      const msg = e.message || e.msg || 'is invalid';
      if (/required/i.test(msg) && path) return `${labelForField(String(path))} is required.`;
      if (path) return `${labelForField(String(path))}: ${msg}`;
      return msg;
    });
    if (parts.length) return parts.join('\n');
  }

  const candidates = [data?.error, data?.message].filter(
    (m): m is string => typeof m === 'string' && m.trim().length > 0,
  );

  for (const raw of candidates) {
    if (raw === 'Internal Server Error') continue;
    if (raw === 'Unauthorized') {
      return 'Email or password is incorrect. Please try again.';
    }
    return humanizeValidation(raw);
  }

  return fallback;
}

/** Pull a user-facing message from apiFetch / apiUpload errors. */
export function extractApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return humanizeValidation(error);

  const err = error as Error & { data?: ApiErrorPayload; status?: number };
  if (err.data || err.status) {
    return messageFromApiPayload(err.data, err.message || fallback, err.status);
  }

  if (err.message === 'Unauthorized') {
    return 'Email or password is incorrect. Please try again.';
  }

  if (err.message && err.message !== 'Internal Server Error') {
    return humanizeValidation(err.message);
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
