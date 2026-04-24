import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: {
    user_id: 'USER-001',
    username: 'borrower.user',
    email: 'borrower@example.com',
    first_name: 'Borrower',
    last_name: 'User',
    middle_name: '',
    contact_number: '09123456789',
    role: 'borrower',
  },
  refreshUser: vi.fn(),
  updateMe: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.user,
    loading: false,
    refreshUser: mocks.refreshUser,
  }),
}));

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');

  return {
    ...actual,
    auth: {
      ...actual.auth,
      updateMe: mocks.updateMe,
      getRedirectPath: vi.fn(() => '/borrower/history'),
    },
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

import BorrowerProfilePage from './page';

function renderWithQueryClient(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

describe('borrower profile password rules', () => {
  beforeEach(() => {
    mocks.refreshUser.mockReset();
    mocks.updateMe.mockReset();
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.replace.mockReset();
  });

  it('rejects non-numeric or non-6-digit password before API call', async () => {
    const { container } = renderWithQueryClient(<BorrowerProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    const currentPasswordInput = container.querySelector(
      'input[name="current_password"]',
    ) as HTMLInputElement;
    const newPasswordInput = container.querySelector(
      'input[name="new_password"]',
    ) as HTMLInputElement;
    const confirmPasswordInput = container.querySelector(
      'input[name="confirm_password"]',
    ) as HTMLInputElement;

    expect(currentPasswordInput).toBeTruthy();
    expect(newPasswordInput).toBeTruthy();
    expect(confirmPasswordInput).toBeTruthy();

    fireEvent.change(currentPasswordInput, {
      target: { value: '123456' },
    });
    fireEvent.change(newPasswordInput, {
      target: { value: '12ab56' },
    });
    fireEvent.change(confirmPasswordInput, {
      target: { value: '12ab56' },
    });

    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    expect(mocks.toastError).toHaveBeenCalledWith('Borrower password must be exactly 6 digits.');
    expect(mocks.updateMe).not.toHaveBeenCalled();
  });
});
