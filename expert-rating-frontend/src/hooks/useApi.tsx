import React, { useCallback } from "react";
import bridge from "@vkontakte/vk-bridge";
import { useUiStore } from "../store/uiStore";
import { Snackbar } from "@vkontakte/vkui";
import { Icon16Cancel } from "@vkontakte/icons";

const API_URL = import.meta.env.VITE_API_URL;
// Предотвращаем NaN для APP_ID
const VITE_APP_ID = import.meta.env.VITE_VK_APP_ID;
const APP_ID = VITE_APP_ID ? Number(VITE_APP_ID) : 0;

let authToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

const getAuthToken = (): Promise<string> => {
    if (authToken) return Promise.resolve(authToken);
    if (tokenPromise) return tokenPromise;

    if (!APP_ID) {
        return Promise.reject(new Error("VITE_VK_APP_ID is missing in .env"));
    }

    tokenPromise = bridge
        .send("VKWebAppGetAuthToken", {
            app_id: APP_ID,
            scope: "" // Пустое поле scope, так как нам не нужны друзья
        })
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
            console.error("Bridge Auth Error:", error);
            throw error;
        });
    return tokenPromise;
};

export interface ApiHook {
    apiGet: <T>(endpoint: string) => Promise<T>;
    apiPost: <T>(endpoint: string, body: unknown) => Promise<T>;
    apiPut: <T>(endpoint: string, body: unknown) => Promise<T>;
    apiDelete: <T>(endpoint: string, body?: unknown) => Promise<T>;
}

export const useApi = (): ApiHook => {
    // Используем запятую <T,> чтобы TS не путал генерик с JSX тегом
    const apiRequest = useCallback(
        async <T,>(
            endpoint: string,
            method: string = "GET",
            body: unknown = null,
        ): Promise<T> => {
            if (!API_URL) {
                throw new Error("VITE_API_URL is not defined in .env");
            }

            let accessToken = "";
            try {
                // Пробуем получить токен, но не падаем, если не вышло (для публичных ручек)
                accessToken = await getAuthToken();
            } catch (e) {
                console.warn("API Request: Proceeding without token or with invalid one");
            }

            const headers = new Headers({
                "Content-Type": "application/json",
            });

            if (accessToken) {
                headers.append("Authorization", `Bearer ${accessToken}`);
            }

            // Идемпотентность
            const isCritical = (endpoint.includes("/vote") || endpoint.includes("/payment")) && method === "POST";
            if (isCritical) {
                headers.append("X-Idempotency-Key", crypto.randomUUID());
            }

            const config: RequestInit = {
                method,
                headers,
                body: body ? JSON.stringify(body) : null,
            };

            try {
                const fetchResponse = await fetch(`${API_URL}${endpoint}`, config);

                if (!fetchResponse.ok) {
                    if (fetchResponse.status === 404 && endpoint === "/users/me") {
                        return null as T;
                    }

                    if (fetchResponse.status >= 500) {
                        useUiStore.getState().setSnackbar(
                            <Snackbar
                                onClose={() => useUiStore.getState().setSnackbar(null)}
                                before={<Icon16Cancel />}
                            >
                                Сервер временно недоступен. Повторите попытку позже.
                            </Snackbar>
                        );
                    }

                    const errorData = await fetchResponse.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Server error: ${fetchResponse.status}`);
                }

                if (fetchResponse.status === 204) {
                    return { status: "ok" } as T;
                }

                const data = await fetchResponse.json();
                if (endpoint.includes("/votes")) {
                    console.log(`[DEBUG_FRONT_API] Data from ${endpoint}:`, data);
                }
                return data;
            } catch (error: any) {
                if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
                    useUiStore.getState().setSnackbar(
                        <Snackbar
                            onClose={() => useUiStore.getState().setSnackbar(null)}
                            before={<Icon16Cancel />}
                        >
                            Сетевая ошибка. Проверьте интернет-соединение.
                        </Snackbar>
                    );
                }
                throw error;
            }
        },
        []
    );

    const apiGet = useCallback(<T,>(endpoint: string) => apiRequest<T>(endpoint, "GET"), [apiRequest]);
    const apiPost = useCallback(<T,>(endpoint: string, body: unknown) => apiRequest<T>(endpoint, "POST", body), [apiRequest]);
    const apiPut = useCallback(<T,>(endpoint: string, body: unknown) => apiRequest<T>(endpoint, "PUT", body), [apiRequest]);
    const apiDelete = useCallback(<T,>(endpoint: string, body: unknown = null) => apiRequest<T>(endpoint, "DELETE", body), [apiRequest]);

    return { apiGet, apiPost, apiPut, apiDelete };
};