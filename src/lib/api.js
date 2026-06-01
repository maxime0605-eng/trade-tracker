async function req(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (res.status === 401) {
    window.location.reload();
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

export const api = {
  auth: {
    status: () => req('GET', '/api/auth/status'),
    setup: (password) => req('POST', '/api/auth/setup', { password }),
    login: (password) => req('POST', '/api/auth/login', { password }),
    logout: () => req('POST', '/api/auth/logout'),
    changePassword: (currentPassword, newPassword) => req('PUT', '/api/auth/password', { currentPassword, newPassword }),
  },
  entries: {
    list: () => req('GET', '/api/entries'),
    add: (entries) => req('POST', '/api/entries', entries),
    update: (id, data) => req('PUT', `/api/entries/${id}`, data),
    remove: (id) => req('DELETE', `/api/entries/${id}`),
    clear: () => req('DELETE', '/api/entries'),
  },
  values: {
    list: () => req('GET', '/api/values'),
    add: (values) => req('POST', '/api/values', values),
    remove: (id) => req('DELETE', `/api/values/${id}`),
    clear: () => req('DELETE', '/api/values'),
  },
};
