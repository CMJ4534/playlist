import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { queryClient } from '@/lib/queryClient';
import { runStorageMaintenance } from '@/lib/storageMaintenance';

type Props = {
  children: ReactNode;
};

export function AppProviders({ children }: Props) {
  useEffect(() => {
    try {
      runStorageMaintenance();
    } catch {
      // 유지보수 실패해도 앱은 계속 동작
    }
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AppErrorBoundary>
  );
}
