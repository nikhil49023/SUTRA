import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ENV_CONFIG } from '../config/env.config';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      gcTime: 10 * 60 * 1000, // 10 minutes cache retention
      retry: ENV_CONFIG.maxRetryCount,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
