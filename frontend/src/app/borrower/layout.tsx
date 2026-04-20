import { AuthGuard } from '@/components/AuthGuard';
import { AppShell } from '@/components/AppShell';

export default function BorrowerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard redirectTo="/borrow">
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
