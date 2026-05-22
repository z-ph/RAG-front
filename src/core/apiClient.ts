import axios from 'axios'
import { apiClientConfig } from './config'
import { getToken } from '../utils/token'
const apiClient = axios.create(apiClientConfig)

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use((response) => {
  if (response.data.code != 1) {
    throw new Error(response.data.msg || 'Unknown error')
  }
  return response
}, (error) => {
  return Promise.reject(error)
})

export default apiClient