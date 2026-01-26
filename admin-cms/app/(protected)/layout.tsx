import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { getServerAuth } from '@/lib/server-auth';
import ProtectedShell from '@/components/layout/ProtectedShell';
import { sleep } from '@/lib/utils';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  // Server-side authentication check
  const { isAuthenticated } = await getServerAuth();

  await sleep(0.5);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    redirect('/login?reason=auth');
  }

  return <ProtectedShell>{children}</ProtectedShell>;
}