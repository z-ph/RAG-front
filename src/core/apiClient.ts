import axios from "axios";
import { apiClientConfig } from "./config";
import { getToken } from "../utils/token";
const apiClient = axios.create(apiClientConfig);

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  // 打印实际发出的请求配置，用于调试
  console.log('=== Request Interceptor 发出的请求 ===')
  console.log('URL:', config.url)
  console.log('BaseURL:', config.baseURL)
  console.log('Method:', config.method)
  console.log('Headers:', config.headers)
  console.log('Data (Request Body):', config.data)
  console.log('======================================')
  return config;
});

apiClient.interceptors.response.use((response) => {
  // 如果后端返回了标准 Result 格式（包含 code 字段），则进行状态码校验
  if (response.data && typeof response.data.code !== 'undefined') {
    if (response.data.code != 1) {
      throw new Error(response.data.msg || "Unknown error");
    }
  }
  // 如果没有 code 字段（后端直接返回数据），直接放行
  return response;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient