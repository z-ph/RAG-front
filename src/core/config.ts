export const apiClientConfig = {
    baseURL: import.meta.env.DEV ? '/asdfasdf' : import.meta.env.VITE_BACK_API,
    headers: {
        "Content-Type": "application/json",
    },
}