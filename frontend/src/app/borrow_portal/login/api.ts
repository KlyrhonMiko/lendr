import { api } from "@/lib/api";

export const borrowerLoginApi = {
  login: async (payload: { pin: string }) => {
    // Backend still expects OAuth username/password form fields.
    // PIN mode maps the same value to both fields.
    return api.borrowerLogin({
      username: payload.pin,
      password: payload.pin,
    });
  },
};
