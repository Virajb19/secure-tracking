import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30, // 30s
      refetchOnWindowFocus: false, // ❗ important for RN
    },
  },
});
