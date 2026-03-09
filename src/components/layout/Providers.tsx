'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { AppShell } from './AppShell';

const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PAGES.includes(pathname);

  return (
    <AuthProvider>
      <SocketProvider>
        {isAuthPage ? children : <AppShell>{children}</AppShell>}
      </SocketProvider>
    </AuthProvider>
  );
}
