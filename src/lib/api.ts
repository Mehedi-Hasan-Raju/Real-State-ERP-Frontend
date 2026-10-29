
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const contentType = response.headers.get("content-type");
  const result = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof result === "object" && result !== null
        ? result.message || result.error || "Request failed."
        : typeof result === "string" && result
          ? result
          : `Request failed (${response.status}).`;

    throw new Error(message);
  }

  return result as T;
}



export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId?: string;
};

export async function getCurrentUser(): Promise<CurrentUser> {
 
  const result = await apiRequest<{
    user?: CurrentUser;
    data?: { user?: CurrentUser };
  }>("/auth/me", { method: "GET", cache: "no-store" });

  const user = result.user ?? result.data?.user;

  if (!user) {
    throw new Error("The current-user API did not return a user.");
  }

  return user;
}

export async function logout(): Promise<void> {
  await apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}