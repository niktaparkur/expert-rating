import { useCallback } from "react";
import bridge from "@vkontakte/vk-bridge";

const API_URL = import.meta.env.VITE_API_URL;
const APP_ID = Number(import.meta.env.VITE_VK_APP_ID);

let authToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

const getAuthToken = (): Promise<string> => {
  if (authToken) return Promise.resolve(authToken);
  if (tokenPromise) return tokenPromise;

  tokenPromise = bridge
    .send("VKWebAppGetAuthToken", { app_id: APP_ID, scope: "" })
    .then((data) => {
      if (!data.access_token) {
        throw new Error("VK Bridge не вернул access_token");
      }
      authToken = data.access_token;
      tokenPromise = null;
      return authToken;
    })
    .catch((error) => {
      tokenPromise = null;
      throw error;
    });
  return tokenPromise;
};

export interface ApiHook {
  apiGet: <T>(endpoint: string) => Promise<T>;
  apiPost: <T>(endpoint: string, body: unknown) => Promise<T>;
  apiPut: <T>(endpoint: string, body: unknown) => Promise<T>;
  apiDelete: <T>(endpoint: string) => Promise<T>;
}

export const useApi = (): ApiHook => {
  const apiRequest = useCallback(
    async <T>(
      endpoint: string,
      method = "GET",
      body: unknown = null,
    ): Promise<T> => {
      if (!API_URL || !APP_ID) {
        throw new Error(
          "VITE_API_URL or VITE_VK_APP_ID is not defined in .env",
        );
      }

      const accessToken = await getAuthToken();
      const headers = new Headers({
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      });

      const config: RequestInit = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      };

      const response = await fetch(`${API_URL}${endpoint}`, config);

      if (!response.ok) {
        if (response.status === 404 && endpoint === "/users/me") {
          return null as T;
        }

        const errorData = await response
          .json()
          .catch(() => ({ detail: `Server error: ${response.status}` }));

        let errorMessage = `Ошибка сервера: ${response.status}`;
        if (errorData.detail) {
          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail) && errorData.detail[0]) {
            const firstError = errorData.detail[0];
            errorMessage = `Ошибка валидации поля '${firstError.loc?.[1] || "unknown"}': ${firstError.msg}`;
          }
        }
        throw new Error(errorMessage);
      }

      if (
        response.status === 204 ||
        (response.status === 200 && method === "DELETE")
      ) {
        return { status: "ok" } as T;
      }

      return response.json() as Promise<T>;
    },
    [],
  );

  const apiGet = useCallback(
    <T>(endpoint: string) => apiRequest<T>(endpoint, "GET"),
    [apiRequest],
  );
  const apiPost = useCallback(
    <T>(endpoint: string, body: unknown) =>
      apiRequest<T>(endpoint, "POST", body),
    [apiRequest],
  );
  const apiPut = useCallback(
    <T>(endpoint: string, body: unknown) =>
      apiRequest<T>(endpoint, "PUT", body),
    [apiRequest],
  );
  const apiDelete = useCallback(
    <T>(endpoint: string) => apiRequest<T>(endpoint, "DELETE"),
    [apiRequest],
  );

  return { apiGet, apiPost, apiPut, apiDelete };
};
