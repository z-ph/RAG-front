export const apiClientConfig = {
    baseURL: import.meta.env.DEV ? '/asdfasdf' : import.meta.env.VITE_BACK_API,
    headers: {
        "Content-Type": "application/json",
    },
}

// 是否使用Mock数据（开发模式下可切换）
// 设置为 true 使用Mock数据测试前端功能
// 设置为 false 使用真实API
export const USE_MOCK_DATA = true