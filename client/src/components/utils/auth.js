export const isConnected = (response, navigate) => {
    if (response.status === 401) {
        navigate('/login');
        return false;
    }
    if (response.status === 403) {
        navigate('/');
        return false;
    }
    return true;
};

export const isAdmin = (user, navigate) => {
    if (user.role !== 'admin') {
        navigate('/');
        return false;
    }
    return true;
};

// Función para obtener el token CSRF del servidor
export const getCSRFToken = async () => {
    try {
        const response = await fetch('/api/csrf-token', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.csrfToken;
        }
        return null;
    } catch (error) {
        console.error('Error obteniendo token CSRF:', error);
        return null;
    }
};

// Función para hacer peticiones con token CSRF
export const fetchWithCSRF = async (url, options = {}) => {
    const csrfToken = await getCSRFToken();
    
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
            ...options.headers
        }
    };

    return fetch(url, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });
};

// Función helper para POST con CSRF
export const postWithCSRF = async (url, data) => {
    return fetchWithCSRF(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

// Función helper para PUT con CSRF
export const putWithCSRF = async (url, data) => {
    return fetchWithCSRF(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
};

// Función helper para DELETE con CSRF
export const deleteWithCSRF = async (url) => {
    return fetchWithCSRF(url, {
        method: 'DELETE'
    });
};
