import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rankrush_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Do not intercept 401s for login/auth routes to allow components to handle auth errors
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
      return Promise.reject(error.response?.data || error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('rankrush_refresh_token');

      if (!refreshToken) {
        clearTokens();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/app/login';
        }
        return Promise.reject(error.response?.data || error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh-token`,
          { refreshToken },
        );
        const newAccess = data.data?.accessToken;
        const newRefresh = data.data?.refreshToken;
        if (newAccess) localStorage.setItem('rankrush_access_token', newAccess);
        if (newRefresh) localStorage.setItem('rankrush_refresh_token', newRefresh);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/app/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);

function clearTokens() {
  localStorage.removeItem('rankrush_access_token');
  localStorage.removeItem('rankrush_refresh_token');
  localStorage.removeItem('rankrush_user');
}

export function setTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem('rankrush_access_token', accessToken);
  if (refreshToken) localStorage.setItem('rankrush_refresh_token', refreshToken);
}

export { clearTokens };

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  studentSignup: (data) => api.post('/auth/student-signup', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  refreshToken: (data) => api.post('/auth/refresh-token', data),
  logout: (data) => api.post('/auth/logout', data),
  logoutAll: () => api.post('/auth/logout-all'),
  getProfile: () => api.get('/auth/profile'),
  getSessions: () => api.get('/auth/sessions'),
  getUsers: () => api.get('/auth/users'),
};

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  completeProfile: (data) => api.post('/user/profile/complete', data),
  updateProfile: (data) => api.patch('/user/profile', data),
  uploadProfilePicture: (formData) =>
    api.post('/user/profile/picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const questionsAPI = {
  upload: (data) => api.post('/questions/upload', data),
  getAll: (params) => api.get('/questions', { params }),
  getById: (id) => api.get(`/questions/${id}`),
  update: (id, data) => api.put(`/questions/${id}`, data),
  updateStatus: (id, data) => api.patch(`/questions/${id}/status`, data),
  bulkUpdateStatus: (data) => api.post('/questions/bulk-status', data),
  bulkDelete: (data) => api.post('/questions/bulk-delete', data),
  delete: (id) => api.delete(`/questions/${id}`),
  getFilters: () => api.get('/questions/filters'),
  getDynamicFilters: (params) => api.get('/questions/filters/dynamic', { params }),
  uploadImage: (formData) =>
    api.post('/questions/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getUploads: (params) => api.get('/analytics/uploads', { params }),
  getAuditLogs: (params) => api.get('/analytics/audit-logs', { params }),
};

export const aiGenerateAPI = {
  generate: (data) => api.post('/ai-generate', data),
  retry: (jobId, encryptedApiKey) => api.post('/ai-generate/retry', { jobId, encryptedApiKey }),
  getProviders: () => api.get('/ai-generate/providers'),
  getJobs: (params) => api.get('/ai-generate/jobs', { params }),
  getJob: (jobId) => api.get(`/ai-generate/jobs/${jobId}`),
  verifyKey: (provider, apiKey) => api.post('/ai-generate/verify-key', { provider, apiKey }),
  encryptKey: (apiKey) => api.post('/ai-generate/encrypt-key', { apiKey }),
  listModels: (provider, apiKey) => api.post('/ai-generate/models', { provider, apiKey }),
};

export const quizzesAPI = {
  create: (data) => api.post('/quizzes', data),
  getAll: (params) => api.get('/quizzes', { params }),
  getById: (id) => api.get(`/quizzes/${id}`),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  updateStatus: (id, data) => api.patch(`/quizzes/${id}/status`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
};

export const studentAPI = {
  // Dashboard aggregate (stats + recent activity + topic insights + badges)
  getDashboard: () => api.get('/student/dashboard'),

  // Stats (sidebar, profile — streak, XP, level, rank)
  getStats: () => api.get('/student/stats'),

  // Published quizzes available to students
  listAvailableQuizzes: (params) => api.get('/student/quizzes', { params }),

  // Quiz detail (for starting an attempt — correct answers stripped)
  getQuiz: (id) => api.get(`/student/quizzes/${id}`),

  // Start a quiz attempt
  startAttempt: (quizId) => api.post(`/student/quizzes/${quizId}/start`),

  // Submit quiz answers
  submitAttempt: (quizId, data) => api.post(`/student/quizzes/${quizId}/submit`, data),

  // Activity feed + subject performance
  getActivity: (params) => api.get('/student/activity', { params }),
};

export const paymentsAPI = {
  createRedeemCode: (data) => api.post('/payments/admin/redeem-codes', data),
  getAllRedeemCodes: () => api.get('/payments/admin/redeem-codes'),
  toggleRedeemCodeStatus: (id, isActive) => api.patch(`/payments/admin/redeem-codes/${id}/toggle`, { isActive }),
};

export default api;
