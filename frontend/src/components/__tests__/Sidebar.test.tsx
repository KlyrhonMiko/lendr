import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Sidebar } from '@/components/Sidebar';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt || ''} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/dashboard',
}));

vi.mock('@/lib/publicBranding', () => ({
  usePublicBranding: () => ({
    brandName: 'Lendr',
    logoUrl: null,
  }),
}));

describe('Sidebar branding fallback', () => {
  it('renders initial fallback when logo URL is missing', () => {
    render(<Sidebar open={true} onClose={vi.fn()} />);

    expect(screen.getByText('Lendr')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
  });
});
