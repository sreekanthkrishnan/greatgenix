import {
  QueryClient,
  QueryClientProvider as Provider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
export function QueryClientProvider({ children }: { children: ReactNode }) {
  return <Provider client={queryClient}>{children}</Provider>;
}
