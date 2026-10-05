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

export async function createPaymentCheckout(data: {
  amount: number;
  currency: string;
  description: string;
  metadata: Record<string, unknown>;
  successUrl: string;
  cancelUrl: string;
}) {
  return request("/api/payments/checkout", {
    method: "POST",
    body: {
      ...data,
      appId: Number(NOCODE_APP_ID),
      organizationId: NOCODE_ORG_ID,
      provider: "razorpay",
    },
  });
}

export async function verifyPayment(sessionId: string) {
  return request(`/api/payments/verify?sessionId=${sessionId}&appId=${NOCODE_APP_ID}`);
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

export { NocodeApiError, NOCODE_API_URL, NOCODE_APP_ID, NOCODE_ORG_ID };
