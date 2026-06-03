"use client";

import Image from "next/image";

type ManaBarProps = {
  currentMana: number;
  className?: string;
  maxMana: number;
};

const manaIcon = "/gameResources/items/mana.webp";

export default function ManaBar({ currentMana, className = "", maxMana }: ManaBarProps) {
  const manaPercent = maxMana > 0 ? Math.max(0, Math.min(100, (currentMana / maxMana) * 100)) : 0;
  const clampedMana = Math.round(Math.max(0, Math.min(maxMana, currentMana)));

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative flex flex-col items-center">
        {/* frame */}
        <div className="relative flex h-24 w-5 items-end overflow-hidden rounded-full border-2 border-[#2a2d42] bg-[#0c0d14] shadow-[inset_0_0_12px_rgba(0,0,0,0.6),0_0_8px_rgba(107,111,158,0.15)] sm:h-48 sm:w-7">
          {/* liquid fill */}
          <div
            className="absolute bottom-0 w-full animate-pulse-glow transition-all duration-300 ease-out"
            style={{
              height: `${manaPercent}%`,
              background:
                "linear-gradient(to top, #4a5fd4 0%, #6b80f0 50%, #a4b5ff 100%)",
              boxShadow:
                "inset 0 0 10px rgba(164,181,255,0.25), 0 0 14px rgba(91,110,232,0.2)",
            }}
          >
            {/* shine overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(255,255,255,0)_0%,rgba(255,255,255,0.08)_30%,rgba(255,255,255,0)_100%)]" />
          </div>

          {/* bubbles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute h-[2px] w-[2px] rounded-full bg-[#c8d4ff] opacity-50"
                style={{
                  left: `${30 + i * 20}%`,
                  bottom: `${manaPercent * (0.2 + i * 0.25)}%`,
                  animation: `bubble-${i} 2.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.8}s`,
                }}
              />
            ))}
          </div>

          {/* ripple lines */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(2)].map((_, i) => (
              <div
                key={`ripple-${i}`}
                className="absolute left-0 right-0 h-[1px] animate-ripple"
                style={{
                  bottom: `${20 + i * 30}%`,
                  animationDelay: `${i * 1.5}s`,
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(164,181,255,0.15) 50%, transparent 100%)",
                }}
              />
            ))}
          </div>

          {/* value */}
          <span
            className="absolute inset-0 z-10 flex items-center justify-center text-[10px] font-bold text-white"
            style={{
              textShadow: "0 0 6px rgba(164,181,255,0.6), 0 0 12px rgba(91,110,232,0.3)",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
            }}
          >
            {clampedMana}
          </span>
        </div>

        {/* mana icon */}
        <div className="mt-1.5">
          <Image src={manaIcon} alt="Mana" width={18} height={18} className="opacity-70" unoptimized />
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; filter: brightness(1); }
          50% { opacity: 0.92; filter: brightness(1.08); }
        }

        @keyframes bubble-0 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
          50% { transform: translateY(-18px) scale(1.5); opacity: 0; }
        }
        @keyframes bubble-1 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-14px) scale(1.3); opacity: 0; }
        }
        @keyframes bubble-2 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.45; }
          50% { transform: translateY(-22px) scale(1.6); opacity: 0; }
        }

        @keyframes ripple {
          0% { transform: scaleX(0.3); opacity: 0; }
          30% { opacity: 0.6; }
          100% { transform: scaleX(1.5); opacity: 0; }
        }

        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .animate-ripple {
          animation: ripple 3s ease-out infinite;
        }
      `}</style>
    </div>
  );
}
