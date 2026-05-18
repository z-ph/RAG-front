import apiClient from "../core/apiClient";
import { type AxiosResponse } from "axios";
import type { Result } from "../types/api";
export interface LoginParams {
    username: string;
    password: string;
}
export async function login(params: LoginParams) {
    const response = await apiClient.post('/api/auth/login', {
            username: params.username,
            password: params.password
        }) as AxiosResponse<Result<string>>;
    return response.data;
}