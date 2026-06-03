"use client";

type GameLoadingScreenProps = {
  phase: "connecting" | "fetching" | "waiting" | "error";
};

const phaseMessages: Record<string, { title: string; subtitle: string }> = {
  connecting: {
    title: "Connecting to server...",
    subtitle: "Establishing connection",
  },
  fetching: {
    title: "Fetching your data...",
    subtitle: "Preparing the arena",
  },
  waiting: {
    title: "Waiting for opponent...",
    subtitle: "Your opponent is preparing their team",
  },
  error: {
    title: "Connection error",
    subtitle: "Please try again",
  },
};

export default function GameLoadingScreen({ phase }: GameLoadingScreenProps) {
  const { title, subtitle } = phaseMessages[phase];

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0a0806] px-4">
      <div className="pointer-events-none fixed inset-0 -z-10 animate-aurora bg-[radial-gradient(ellipse_at_50%_30%,#1a1420_0%,#0a0806_60%)]" />

      <div className="flex flex-col items-center gap-6">
        {/* decorative ring */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-t-[#c9a84c] border-r-transparent border-b-[#c9a84c]/30 border-l-transparent" />
          <div className="absolute inset-2 animate-spin-slower rounded-full border-2 border-t-transparent border-r-[#c9a84c]/40 border-b-transparent border-l-[#c9a84c]/20" />
          <div className="h-3 w-3 rotate-45 bg-[#c9a84c]/60" />
        </div>

        <div className="text-center">
          <p className="font-serif text-xl tracking-wider text-[#f5e6c8]">
            {title}
          </p>
          {subtitle && (
            <p className="mt-2 font-serif text-sm tracking-wide text-[#8b82a6]">
              {subtitle}
            </p>
          )}
        </div>

        {phase === "error" && (
          <a
            href="/home"
            className="mt-4 rounded-md border-2 border-[#c9a84c] bg-gradient-to-b from-[#c9a84c] to-[#a8883c] px-6 py-2 font-serif font-semibold text-[#0a0806] transition-all duration-150 hover:shadow-[0_0_14px_rgba(201,168,76,0.3)]"
          >
            Back to home
          </a>
        )}
      </div>


    </div>
  );
}
