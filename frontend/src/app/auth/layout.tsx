import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex bg-amber-50 relative overflow-hidden">
      {/* Left side - Branding */}
      <div className="hidden lg:flex w-[60%] flex-col items-center justify-center p-12 relative z-0">

        {/* Abstract yellow background blur blobs */}
        <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] bg-yellow-400/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[5%] w-[60%] h-[60%] bg-amber-500/15 blur-[120px] rounded-full" />

        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-lg pr-12">
          <div className="mb-10">
            <Image
              src="/Image/Powergold Enterprise Logo.png"
              alt="Powergold Logo"
              width={260}
              height={260}
              className="object-contain drop-shadow-sm"
              priority
            />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold font-heading text-zinc-900 mb-5 tracking-tight">
            Powergold Engineering Enterprises
          </h1>
          <div className="w-16 h-1.5 bg-yellow-400/90 rounded-full mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/30 w-full h-full skew-x-[-20deg] animate-[pulse_4s_ease-in-out_infinite]"></div>
          </div>
          <p className="text-lg lg:text-xl text-zinc-600 font-medium leading-relaxed">
            &ldquo;Powering Excellence, Delivering Satisfaction.&rdquo;
          </p>
        </div>
      </div>

      {/* Right side - Overlapping Form Panel */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-12 relative z-20 bg-background lg:absolute lg:right-0 lg:h-full lg:rounded-l-[3rem] lg:shadow-[-30px_0_60px_-15px_rgba(0,0,0,0.1)] lg:border-l lg:border-border/50">
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}
