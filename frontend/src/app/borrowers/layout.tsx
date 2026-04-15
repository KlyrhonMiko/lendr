import { AuthGuard } from '@/components/AuthGuard';
import { AppShell } from '@/components/AppShell';

export default function BorrowersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
