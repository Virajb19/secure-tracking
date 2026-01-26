"use client";

import { useMutation } from "@tanstack/react-query";
import { authApi } from "./api";
import { LoginSchema } from "@/lib/zod";

export const useLogin = () => {
  return useMutation({
    mutationFn: (data: LoginSchema) => authApi.login(data.email, data.password, data.phone),
  })
}
