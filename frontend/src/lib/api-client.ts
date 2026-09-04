import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 30000, // Increased timeout for file uploads
})

apiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('accessToken') ||
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('accessToken='))
      ?.split('=')[1]

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  console.log('[api-client] request:', config.method?.toUpperCase(), config.url, {
    auth: !!token,
    hasBody: !!config.data,
  })

  // Don't set Content-Type for FormData - let browser set it with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => {
    console.log('[api-client] response:', response.config.url, response.status, response.data)
    return response
  },
  async (error) => {
    const originalRequest = error.config

    console.error('[api-client] response error:', {
      url: originalRequest?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    })

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refreshToken')

      if (refreshToken) {
        try {
          const { data: refreshResponse } = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'}/auth/refresh`,
            { refreshToken },
            { withCredentials: true }
          )
          const tokenData = refreshResponse.data || refreshResponse
          localStorage.setItem('accessToken', tokenData.accessToken)
          localStorage.setItem('refreshToken', tokenData.refreshToken)
          originalRequest.headers.Authorization = `Bearer ${tokenData.accessToken}`
          return apiClient(originalRequest)
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
