export const apiClientConfig = {
    baseURL: import.meta.env.DEV ? '/asdfasdf' : import.meta.env.VITE_BACK_API,
    headers: {
        "Content-Type": "application/json",
    },
}

// Mock数据开关已移除，所有接口调用均走真实API
// 如需本地测试，请确保后端服务已启动