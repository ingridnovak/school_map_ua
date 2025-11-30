// API Service for School 16 Donates Backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

// Helper to get auth headers for JSON requests
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper to get auth headers for multipart requests (images)
const getAuthHeadersMultipart = () => {
  const token = localStorage.getItem('token');
  return {
    ...(token && { 'Authorization': `Bearer ${token}` })
    // Note: Do NOT set Content-Type for multipart - browser sets it with boundary
  };
};

// Generic error handler
const handleResponse = async (response) => {
  // Check if response is ok first
  if (!response.ok) {
    // Try to parse error from JSON, otherwise use status text
    try {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Помилка сервера: ${response.status}`);
    } catch (parseError) {
      // If JSON parsing fails, the server returned non-JSON (like HTML error page)
      if (parseError instanceof SyntaxError) {
        throw new Error(`Сервер недоступний або повернув некоректну відповідь (${response.status})`);
      }
      throw parseError;
    }
  }

  // Try to parse successful response
  try {
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Помилка сервера');
    }
    return data;
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      throw new Error('Сервер повернув некоректну відповідь');
    }
    throw parseError;
  }
};

export const api = {
  // ==================== AUTH ====================

  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: userData.name,
        password: userData.password,
        gender: userData.gender,
        userType: userData.userType,
        studentClass: userData.userType === 'student' ? userData.studentClass : null
      })
    });
    return handleResponse(response);
  },

  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return handleResponse(response);
  },

  verifyToken: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  changePassword: async (oldPassword, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ oldPassword, newPassword })
    });
    return handleResponse(response);
  },

  // ==================== PINS/ADVENTURES ====================

  getRegionSummary: async () => {
    const response = await fetch(`${API_BASE_URL}/adventures/summary`);
    return handleResponse(response);
  },

  getPinsByRegion: async (regionId, limit = 50, offset = 0, sortBy = 'newest') => {
    const response = await fetch(
      `${API_BASE_URL}/adventures/pins/${encodeURIComponent(regionId)}?limit=${limit}&offset=${offset}&sortBy=${sortBy}`
    );
    return handleResponse(response);
  },

  createPin: async (pinData) => {
    const response = await fetch(`${API_BASE_URL}/adventures/pins`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        regionId: pinData.regionId,
        regionName: pinData.regionName,
        pinType: pinData.pinType,
        description: pinData.description
      })
    });
    return handleResponse(response);
  },

  createPinWithImages: async (pinData, imageFiles) => {
    const formData = new FormData();
    formData.append('regionId', pinData.regionId);
    formData.append('regionName', pinData.regionName);
    formData.append('pinType', pinData.pinType);
    formData.append('description', pinData.description);

    // Add images (max 5)
    for (let i = 0; i < Math.min(imageFiles.length, 5); i++) {
      formData.append('images', imageFiles[i]);
    }

    const response = await fetch(`${API_BASE_URL}/adventures/pins`, {
      method: 'POST',
      headers: getAuthHeadersMultipart(),
      body: formData
    });
    return handleResponse(response);
  },

  getMyPins: async () => {
    const response = await fetch(`${API_BASE_URL}/adventures/my-pins`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  deletePin: async (pinId) => {
    const response = await fetch(`${API_BASE_URL}/adventures/pins/${pinId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ==================== TESTS ====================

  submitTest: async (testData) => {
    const response = await fetch(`${API_BASE_URL}/tests/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        regionId: testData.regionId,
        regionName: testData.regionName,
        score: testData.score,
        totalQuestions: testData.totalQuestions
      })
    });
    return handleResponse(response);
  },

  getTestProgress: async () => {
    const response = await fetch(`${API_BASE_URL}/tests/progress`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPassedRegions: async () => {
    const response = await fetch(`${API_BASE_URL}/tests/passed-regions`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  deleteTestResult: async (regionId) => {
    const response = await fetch(`${API_BASE_URL}/tests/results/${encodeURIComponent(regionId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ==================== DONATIONS ====================

  submitDonation: async (donationData = {}) => {
    const response = await fetch(`${API_BASE_URL}/donations/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(donationData)
    });
    return handleResponse(response);
  },

  getDonationStatus: async () => {
    const response = await fetch(`${API_BASE_URL}/donations/status`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // ==================== CERTIFICATES ====================

  checkCertificateEligibility: async () => {
    const response = await fetch(`${API_BASE_URL}/certificates/eligibility`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCertificateInfo: async () => {
    const response = await fetch(`${API_BASE_URL}/certificates/my-certificate`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  downloadCertificate: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/certificates/generate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Не вдалося згенерувати сертифікат');
    }

    return response.blob();
  },

  // ==================== ADMIN ENDPOINTS ====================

  getAdminPermissions: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/permissions`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPendingPins: async (limit = 50, offset = 0) => {
    const response = await fetch(`${API_BASE_URL}/admin/pins/pending?limit=${limit}&offset=${offset}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  verifyPin: async (pinId, approved) => {
    const response = await fetch(`${API_BASE_URL}/admin/pins/${pinId}/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ approved })
    });
    return handleResponse(response);
  },

  getPendingDonations: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/donations/pending`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  verifyDonation: async (donationId, status, amount, notes) => {
    const response = await fetch(`${API_BASE_URL}/admin/donations/${donationId}/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, amount, notes })
    });
    return handleResponse(response);
  },

  resetUserPassword: async (userId, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword })
    });
    return handleResponse(response);
  },

  getStudentsByClass: async (className) => {
    const response = await fetch(`${API_BASE_URL}/admin/users/class/${encodeURIComponent(className)}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getAllUsers: async (limit = 100, offset = 0) => {
    const response = await fetch(`${API_BASE_URL}/admin/users?limit=${limit}&offset=${offset}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateUser: async (userId, userData) => {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  deleteUser: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

// Helper function to save auth data after login/register
export const saveAuthData = (authData) => {
  localStorage.setItem('token', authData.token);
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('currentUser', JSON.stringify({
    userId: authData.userId,
    name: authData.name,
    gender: authData.gender,
    userType: authData.userType,
    role: authData.role,
    studentClass: authData.studentClass,
    avatarNumber: authData.avatarNumber,
    hasCertificate: authData.hasCertificate,
    createdAt: authData.createdAt
  }));
};

// Helper function to clear auth data on logout
export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  localStorage.setItem('isLoggedIn', 'false');
};

// Helper to check if user is logged in
export const isAuthenticated = () => {
  return localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('token');
};

// Helper to get current user
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
};

export default api;
