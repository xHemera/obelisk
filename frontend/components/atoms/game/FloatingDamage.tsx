"use client";

type FloatingDamageProps = {
  damage: number;
  isCrit: boolean;
  lethal?: boolean;
  delay?: number;
  onComplete: () => void;
};

export default function FloatingDamage({ damage, isCrit, lethal, delay = 0, onComplete }: FloatingDamageProps) {
  const isLethal = lethal ?? false;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center">
      {/* Red flash overlay on lethal */}
      {isLethal && (
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background: "radial-gradient(circle, rgba(200,0,0,0.35) 0%, rgba(200,0,0,0) 70%)",
            animation: "lethalFlash 1.2s ease-out forwards",
            animationDelay: `${delay}ms`,
          }}
        />
      )}

      <div
        className="flex flex-col items-center"
        style={{ marginTop: "8%" }}
      >
        <span
          className="font-serif leading-none"
          style={{
            color: isCrit ? "#ffd700" : isLethal ? "#ff2040" : "#ffffff",
            fontSize: isCrit ? "3.5rem" : isLethal ? "3rem" : "2.5rem",
            fontWeight: isCrit || isLethal ? 900 : 800,
            WebkitTextStroke: isCrit || isLethal
              ? "2.5px rgba(0,0,0,0.9)"
              : "1.5px rgba(0,0,0,0.75)",
            textShadow: isCrit
              ? "0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,215,0,0.25)"
              : isLethal
              ? "0 0 20px rgba(255,0,0,0.6), 0 0 40px rgba(255,0,0,0.3)"
              : "0 3px 8px rgba(0,0,0,0.7)",
            animation: isCrit ? "critDmg 1.4s ease-out forwards" : "dmgPop 1.2s ease-out forwards",
            animationDelay: `${delay}ms`,
          }}
          onAnimationEnd={(e) => {
            if (e.animationName === (isCrit ? "critDmg" : "dmgPop")) onComplete();
          }}
        >
          {damage}
        </span>
        {isLethal && (
          <span
            className="font-serif font-black leading-none"
            style={{
              color: "#ff2040",
              fontSize: "1.5rem",
              WebkitTextStroke: "1px rgba(0,0,0,0.85)",
              textShadow: "0 0 15px rgba(255,0,0,0.5)",
              animation: "skullPop 1.2s ease-out forwards",
              animationDelay: `${delay}ms`,
            }}
          >
            ☠
          </span>
        )}
      </div>

      <style jsx>{`
        @keyframes dmgPop {
          0%   { opacity: 0; transform: scale(0.3) translateY(0); }
          18%  { opacity: 1; transform: scale(1.2) translateY(-6px); }
          35%  { opacity: 1; transform: scale(0.95) translateY(-14px); }
          55%  { opacity: 1; transform: scale(1) translateY(-24px); }
          75%  { opacity: 0.9; transform: scale(1) translateY(-36px); }
          100% { opacity: 0; transform: scale(0.9) translateY(-50px); }
        }
        @keyframes critDmg {
          0%   { opacity: 0; transform: scale(0.15) translateX(0) translateY(0); }
          10%  { opacity: 1; transform: scale(1.5) translateX(-8px) translateY(-4px); }
          18%  { opacity: 1; transform: scale(1.2) translateX(8px) translateY(-8px); }
          26%  { opacity: 1; transform: scale(1.35) translateX(-5px) translateY(-12px); }
          36%  { opacity: 1; transform: scale(1.1) translateX(5px) translateY(-18px); }
          50%  { opacity: 1; transform: scale(1.15) translateX(-2px) translateY(-24px); }
          65%  { opacity: 1; transform: scale(1) translateX(0) translateY(-32px); }
          82%  { opacity: 0.85; transform: scale(1) translateY(-42px); }
          100% { opacity: 0; transform: scale(0.9) translateY(-55px); }
        }
        @keyframes lethalFlash {
          0%   { opacity: 1; }
          30%  { opacity: 0.7; }
          60%  { opacity: 0.3; }
          100% { opacity: 0; }
        }
        @keyframes skullPop {
          0%   { opacity: 0; transform: scale(0.2) translateY(10px); }
          20%  { opacity: 1; transform: scale(1.4) translateY(0); }
          40%  { opacity: 1; transform: scale(0.9) translateY(-6px); }
          60%  { opacity: 1; transform: scale(1.1) translateY(-10px); }
          80%  { opacity: 0.85; transform: scale(1) translateY(-14px); }
          100% { opacity: 0; transform: scale(0.9) translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
