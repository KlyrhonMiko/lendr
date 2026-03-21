export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] bg-indigo-500/[0.07] blur-[100px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[45%] h-[45%] bg-purple-500/[0.05] blur-[100px] rounded-full" />

      <div className="relative z-10 w-full max-w-[420px] px-6 py-12">
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
            <span className="text-white font-bold text-2xl font-heading">L</span>
          </div>
          <span className="text-lg font-bold font-heading tracking-tight text-foreground">
            Lendr
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
