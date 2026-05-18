import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rankrush_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rankrush_token');
      localStorage.removeItem('rankrush_user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  studentSignup: (data) => api.post('/auth/student-signup', data),
  getProfile: () => api.get('/auth/profile'),
  getUsers: () => api.get('/auth/users'),
};

export const questionsAPI = {
  upload: (data) => api.post('/questions/upload', data),
  getAll: (params) => api.get('/questions', { params }),
  getById: (id) => api.get(`/questions/${id}`),
  update: (id, data) => api.put(`/questions/${id}`, data),
  updateStatus: (id, data) => api.patch(`/questions/${id}/status`, data),
  bulkUpdateStatus: (data) => api.post('/questions/bulk-status', data),
  delete: (id) => api.delete(`/questions/${id}`),
  getFilters: () => api.get('/questions/filters'),
  uploadImage: (formData) => api.post('/questions/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
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

export default api;
