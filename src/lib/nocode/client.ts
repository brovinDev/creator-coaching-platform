const NOCODE_API_URL = process.env.NOCODE_API_URL || "http://localhost:4000";
const NOCODE_APP_ID = process.env.NOCODE_APP_ID || "1";
const NOCODE_ORG_ID = process.env.NOCODE_ORG_ID || "";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
}

class NocodeApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "NocodeApiError";
  }
}

async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { token, body, ...fetchOpts } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "app-id": NOCODE_APP_ID,
    "org-id": NOCODE_ORG_ID,
    ...(opts.headers as Record<string, string>),
  };
  if (token) {
    if (token.startsWith("AAGA_")) {
      headers["x-api-key"] = token;
    } else {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${NOCODE_API_URL}${path}`, {
    ...fetchOpts,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new NocodeApiError(res.status, json.message || json.error || res.statusText, json);
  }
  return json as T;
}

function appPath(sub: string) {
  return `/api/${NOCODE_APP_ID}${sub}`;
}

function orgPath(sub: string) {
  return `/api/${NOCODE_APP_ID}/${NOCODE_ORG_ID}${sub}`;
}

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------

export interface NocodeSigninResponse {
  success: boolean;
  data: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    active_user: boolean;
    jwt: string;
    organizations: Array<{
      "org-id": string;
      org_name: string;
      role: string;
    }>;
  };
}

export async function nocodeSignin(email: string, password: string) {
  return request<NocodeSigninResponse>(appPath("/auth/signin"), {
    method: "POST",
    body: { email, password },
  });
}

export async function nocodeSignup(data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}) {
  return request(appPath("/auth/signup"), { method: "POST", body: data });
}

export async function nocodeActivateUser(email: string, token: string) {
  return request(appPath("/auth/activate-user"), {
    method: "POST",
    body: { email },
    token,
  });
}

export async function nocodeForgotPassword(email: string) {
  return request(appPath("/auth/forgot_password"), { method: "POST", body: { email } });
}

export async function nocodeResetPassword(email: string, password: string, token: string) {
  return request(appPath("/auth/reset_password"), {
    method: "POST",
    body: { email, password, token },
  });
}

// ------------------------------------------------------------------
// Data CRUD (dynamic modules)
// ------------------------------------------------------------------

export interface DataResponse<T = Record<string, unknown>> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedData<T = Record<string, unknown>> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

export async function insertData(
  moduleId: string,
  data: Record<string, unknown> | Record<string, unknown>[],
  token: string
) {
  return request<DataResponse>(orgPath(`/data/${moduleId}`), {
    method: "POST",
    body: { data },
    token,
  });
}

export async function getData(
  moduleId: string,
  params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    noPagination?: boolean;
    columns?: string;
    [key: string]: unknown;
  },
  token: string
) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) query.set(k, String(v));
  }
  return request<DataResponse<PaginatedData>>(
    orgPath(`/data/${moduleId}?${query.toString()}`),
    { token }
  );
}

export async function getDataById(moduleId: string, rowId: string, token: string) {
  return request<DataResponse>(orgPath(`/data/${moduleId}?id=${rowId}`), { token });
}

export async function updateData(
  moduleId: string,
  rowId: string,
  data: Record<string, unknown>,
  token: string
) {
  return request<DataResponse>(orgPath(`/data/${moduleId}/${rowId}`), {
    method: "PUT",
    body: { dId: rowId, data },
    token,
  });
}

export async function updateDataByWhere(
  moduleId: string,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  token: string
) {
  return request<DataResponse>(orgPath(`/data/${moduleId}`), {
    method: "PUT",
    body: { ...where, data },
    token,
  });
}

export async function deleteData(moduleId: string, rowId: string, token: string) {
  return request<DataResponse>(orgPath(`/data/${moduleId}/${rowId}`), {
    method: "DELETE",
    token,
  });
}

// ------------------------------------------------------------------
// Modules (table management)
// ------------------------------------------------------------------

export async function getModules(token: string) {
  return request<DataResponse<Array<{ id: number; title: string }>>>(orgPath("/module"), { token });
}

export async function createModule(
  title: string,
  fields: Array<{ name: string; type: string; required?: boolean }>,
  token: string
) {
  return request(orgPath("/module"), {
    method: "POST",
    body: { title, fields },
    token,
  });
}

// ------------------------------------------------------------------
// Email
// ------------------------------------------------------------------

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  token: string
) {
  return request("/api/email/send-email", {
    method: "POST",
    body: { to: Array.isArray(to) ? to : [to], subject, html, orgId: NOCODE_ORG_ID },
    token,
  });
}

// ------------------------------------------------------------------
// File upload
// ------------------------------------------------------------------

export async function uploadFile(formData: FormData, token: string) {
  const uploadHeaders: Record<string, string> = {
    "app-id": NOCODE_APP_ID,
    "org-id": NOCODE_ORG_ID,
  };
  if (token.startsWith("AAGA_")) {
    uploadHeaders["x-api-key"] = token;
  } else {
    uploadHeaders["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${NOCODE_API_URL}/api/files/media/upload`, {
    method: "POST",
    headers: uploadHeaders,
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new NocodeApiError(res.status, json.message || "Upload failed", json);
  return json;
}

// ------------------------------------------------------------------
// Payments
// ------------------------------------------------------------------

/** Creates a Razorpay order with the keys connected to the org's payment integration. `amount` is in paise. */
export async function createRazorpayOrder(
  data: { amount: number; currency: string; description: string; metadata?: Record<string, string> },
  token: string
) {
  return request<{ orderId: string; keyId: string }>("/api/payments/intent", {
    method: "POST",
    body: { ...data, provider: "razorpay" },
    token,
  });
}

export interface RecordedPayment {
  paymentReference?: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
}

/**
 * Looks up the payment recorded for a Razorpay order. The record is written by Razorpay's webhook, so
 * returns null until the webhook has arrived.
 */
export async function getPaymentByOrderId(orderId: string): Promise<RecordedPayment | null> {
  try {
    return await request<RecordedPayment>(
      `/api/payments/verify?sessionId=${encodeURIComponent(orderId)}&appId=${NOCODE_APP_ID}`
    );
  } catch (error) {
    if (error instanceof NocodeApiError && error.status === 404) return null;
    throw error;
  }
}

export interface ProviderPayment {
  id: string;
  /** In the smallest currency unit (paise). */
  amount: number;
  currency: string;
  /** "succeeded" once Razorpay has captured it. */
  status: string;
  /** For a payment id: the order it was paid against. */
  orderId?: string;
}

/**
 * Asks Razorpay (through the backend, with the keys connected there) about a payment or order by id.
 * Unlike getPaymentByOrderId this does not wait for the webhook. Null when it cannot be found.
 */
export async function getRazorpayPayment(id: string, token: string): Promise<ProviderPayment | null> {
  try {
    const res = await request<{ payment?: ProviderPayment }>(`/api/payments/${encodeURIComponent(id)}`, { token });
    return res.payment ?? null;
  } catch (error) {
    if (error instanceof NocodeApiError && error.status === 404) return null;
    throw error;
  }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

export { NocodeApiError, NOCODE_API_URL, NOCODE_APP_ID, NOCODE_ORG_ID };
