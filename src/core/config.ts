export const apiClientConfig = {
    baseURL: import.meta.env.DEV ? '/asdfasdf' : import.meta.env.VITE_BACK_API,
}

// Mock数据开关已移除，所有接口调用均走真实API
