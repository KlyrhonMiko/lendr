'use client';

import Image from "next/image";
import { usePublicBranding } from '@/lib/publicBranding';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { brandName, logoUrl } = usePublicBranding();

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/60">
      {/* Left side - Branding */}
      <div className="hidden lg:flex w-[60%] flex-col items-center justify-center p-12 relative z-0">

        {/* Layered ambient glow blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-400/20 blur-[100px] rounded-full animate-pulse [animation-duration:6s]" />
        <div className="absolute bottom-[-10%] right-[0%] w-[55%] h-[55%] bg-yellow-500/15 blur-[120px] rounded-full animate-pulse [animation-duration:8s]" />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-orange-400/10 blur-[80px] rounded-full animate-pulse [animation-duration:10s]" />

        {/* Refined grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(217,119,6,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(217,119,6,0.04)_1px,transparent_1px)] [background-size:40px_40px]" />

        {/* Subtle radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(251,243,219,0.6)_100%)]" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-lg pr-12">
          {/* Logo with glow ring */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 scale-[1.3] bg-amber-400/15 blur-[40px] rounded-full" />
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${brandName} logo`}
                width={240}
                height={240}
                className="relative object-contain drop-shadow-lg"
                priority
                unoptimized
              />
            ) : (
              <div className="relative w-[160px] h-[160px] rounded-3xl bg-gradient-to-br from-amber-500 to-yellow-500 text-white flex items-center justify-center text-6xl font-black font-heading shadow-xl shadow-amber-500/20">
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Brand name */}
          <h1 className="text-3xl lg:text-4xl font-bold font-heading text-zinc-800 mb-4 tracking-tight">
            {brandName}
          </h1>

          {/* Accent bar */}
          <div className="w-14 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full mb-5 shadow-sm shadow-amber-400/30" />

          {/* Tagline */}
          <p className="text-base lg:text-lg text-zinc-500 font-medium leading-relaxed tracking-wide">
            &ldquo;Powering Excellence, Delivering Satisfaction.&rdquo;
          </p>
        </div>
      </div>

      {/* Right side - Overlapping Form Panel */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-12 relative z-20 bg-white lg:absolute lg:right-0 lg:h-full lg:rounded-l-[2.5rem] lg:shadow-[0_0_80px_-20px_rgba(217,119,6,0.12),-20px_0_60px_-30px_rgba(0,0,0,0.08)] lg:border-l lg:border-amber-100/60">
        {/* Inner ambient light on the panel */}
        <div className="absolute top-0 left-0 w-full h-full rounded-l-[2.5rem] overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-amber-50/50 blur-[80px] rounded-full" />
        </div>
        <div className="w-full max-w-[420px] relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
