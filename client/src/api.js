let authToken = null;
export const setAuthToken = (token) => { authToken = token || null; };
export async function api(path, options = {}) { const headers = new Headers(options.headers); if (authToken) headers.set('Authorization', `Bearer ${authToken}`); const baseUrl = import.meta.env.VITE_API_URL || ''; const response = await fetch(`${baseUrl}${path}`, { ...options, headers }); if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'Something went wrong'); } return response.status === 204 ? null : response.json(); }
