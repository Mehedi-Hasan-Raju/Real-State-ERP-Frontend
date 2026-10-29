
import { apiRequest } from "@/lib/api";

export type ProjectType =
  | "RESIDENTIAL"
  | "COMMERCIAL"
  | "MIXED_USE"
  | "OTHER";

export type ProjectStatus =
  | "PLANNING"
  | "ONGOING"
  | "ON_HOLD"
  | "COMPLETED";

export type CreateProjectInput = {
  name: string;
  code: string;
  description?: string | null;
  type?: ProjectType;
  status?: ProjectStatus;
  address?: string | null;
  city?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  budget?: number | null;
  projectManagerId?: string | null;
};

export type Project = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  type: ProjectType;
  status: ProjectStatus;
  address?: string | null;
  city?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  budget?: number | null;
  projectManagerId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateProjectResponse = {
  message: string;
  project: Project;
};

export async function createProject(
  input: CreateProjectInput,
): Promise<CreateProjectResponse> {
  return apiRequest<CreateProjectResponse>("/projects", {
    method: "POST",
    body: input,
  });
}

export async function getProjects(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  type?: ProjectType;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  archived?: "true" | "false";
} = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString();

  return apiRequest<unknown>(
    `/projects${suffix ? `?${suffix}` : ""}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}



export async function updateProject(
  projectId: string,
  input: Partial<CreateProjectInput>,
) {
  return apiRequest<{
    message: string;
    project: Project;
  }>(`/projects/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    body: input,
  });
}

export async function archiveProject(
  projectId: string,
  reason: string,
) {
  return apiRequest<{
    message: string;
    project: Project;
  }>(`/projects/${encodeURIComponent(projectId)}/archive`, {
    method: "POST",
    body: { reason },
  });
}

export async function restoreProject(projectId: string) {
  return apiRequest<{
    message: string;
    project: Project;
  }>(`/projects/${encodeURIComponent(projectId)}/restore`, {
    method: "POST",
  });
}
