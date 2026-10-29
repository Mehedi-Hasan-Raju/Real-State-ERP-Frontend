
import { apiRequest } from "@/lib/api";

export type EmployeeRole =
  | "ADMIN"
  | "MANAGER"
  | "SALES"
  | "ACCOUNTANT"
  | "CONSTRUCTION"
  | "VIEWER";

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  createdAt?: string;
};

export type CreateEmployeeInput = {
  name: string;
  email: string;
  password: string;
  role: EmployeeRole;
};

export async function getEmployees(
  page = 1,
  limit = 100,
): Promise<Employee[]> {
  const result = await apiRequest<{
    employees?: Employee[];
    data?: Employee[] | { employees?: Employee[] };
  }>(`/employees?page=${page}&limit=${limit}`, {
    method: "GET",
    cache: "no-store",
  });

  if (Array.isArray(result.employees)) return result.employees;
  if (Array.isArray(result.data)) return result.data;
  if (Array.isArray(result.data?.employees)) {
    return result.data.employees;
  }

  return [];
}

export async function createEmployee(
  input: CreateEmployeeInput,
) {
  return apiRequest<{
    message: string;
    employee?: Employee;
  }>("/employees", {
    method: "POST",
    body: input,
  });
}
