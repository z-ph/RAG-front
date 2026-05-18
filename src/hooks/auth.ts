import { useMutation } from "@tanstack/vue-query";
import { login, type LoginParams } from "../services/auth";
import { setToken } from "../utils/token";
import { ElMessage } from "element-plus";
import { reactive } from "vue";
export function useLogin() {
    const form = reactive<LoginParams>({
        username: '',
        password: ''
    });
    const mutation = useMutation({
        mutationFn: async (params: LoginParams) => login(params),
        onSuccess(res) {
            setToken(res.data);
        },
        onError(error) {
            ElMessage.error(error.message);
        },
    });

    return {
        form,
        mutation,
    };
}
