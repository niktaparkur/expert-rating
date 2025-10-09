import { useCallback } from 'react';
import bridge from '@vkontakte/vk-bridge';

const API_URL = 'https://testg.potokrechi.ru/api/v1';

export const useApi = () => {
    const apiRequest = useCallback(async (endpoint, method = 'GET', body = null) => {
        const tokenData = await bridge.send('VKWebAppGetAuthToken', {
            app_id: 54172799,
            scope: ''
        });

        if (!tokenData.access_token) {
            throw new Error('Не удалось получить токен авторизации');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenData.access_token}`
        };

        const config = { method, headers };
        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_URL}${endpoint}`, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Server returned non-JSON response' }));
            throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
        }

        if (response.status === 204) {
            return { status: 'ok' };
        }

        return response.json();
    }, []);

    const apiGet = useCallback((endpoint) => apiRequest(endpoint, 'GET'), [apiRequest]);
    const apiPost = useCallback((endpoint, body) => apiRequest(endpoint, 'POST', body), [apiRequest]);
    const apiPut = useCallback((endpoint, body) => apiRequest(endpoint, 'PUT', body), [apiRequest]);

    return { apiGet, apiPost, apiPut };
};