import { useCallback } from 'react';
import bridge from '@vkontakte/vk-bridge';

const API_URL = import.meta.env.VITE_API_URL;
const APP_ID = Number(import.meta.env.VITE_VK_APP_ID);

let authToken = null;
let tokenPromise = null;
const getAuthToken = () => {
    if (authToken) return Promise.resolve(authToken);
    if (tokenPromise) return tokenPromise;
    tokenPromise = bridge.send('VKWebAppGetAuthToken', { app_id: APP_ID, scope: '' })
        .then(data => {
            if (!data.access_token) throw new Error('VK Bridge не вернул access_token');
            authToken = data.access_token;
            tokenPromise = null;
            return authToken;
        }).catch(error => {
            tokenPromise = null;
            throw error;
        });
    return tokenPromise;
};

export const useApi = () => {
    const apiRequest = useCallback(async (endpoint, method = 'GET', body = null) => {
        if (!API_URL || !APP_ID) {
            throw new Error('VITE_API_URL or VITE_VK_APP_ID is not defined in .env');
        }

        const accessToken = await getAuthToken();
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` };
        const config = { method, headers, body: body ? JSON.stringify(body) : null };

        const response = await fetch(`${API_URL}${endpoint}`, config);

        if (!response.ok) {
            if (response.status === 404 && endpoint === '/users/me') {
                return null;
            }

            const errorData = await response.json().catch(() => ({ detail: `Server error: ${response.status}` }));
            throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
        }

        if (response.status === 204 || (response.status === 200 && method === 'DELETE')) {
            return { status: 'ok' };
        }

        return response.json();
    }, []);

    const apiGet = useCallback((endpoint) => apiRequest(endpoint, 'GET'), [apiRequest]);
    const apiPost = useCallback((endpoint, body) => apiRequest(endpoint, 'POST', body), [apiRequest]);
    const apiPut = useCallback((endpoint, body) => apiRequest(endpoint, 'PUT', body), [apiRequest]);
    const apiDelete = useCallback((endpoint) => apiRequest(endpoint, 'DELETE'), [apiRequest]);

    return { apiGet, apiPost, apiPut, apiDelete };
};