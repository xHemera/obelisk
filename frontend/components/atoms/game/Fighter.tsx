"use client";

import Image from "next/image";
import { CHARACTERS } from "@/public/gameResources/heroes";

export type StatusEffect = {
  type: "buff" | "debuff" | "dot" | "cc";
  label: string;
  turns?: number;
};

type FighterVariant = "player" | "enemy";

type FighterProps = {
  character: (typeof CHARACTERS)[number];
  variant?: FighterVariant;
  active?: boolean;
  currentHp?: number;
  effects?: StatusEffect[];
  onClick?: () => void;
  isTargetable?: boolean;
};

const effectStyles: Record<StatusEffect["type"], { border: string; glow: string; label: string }> = {
  buff:   { border: "border-[#c9a84c]", glow: "shadow-[0_0_6px_rgba(201,168,76,0.3)]", label: "bg-[#c9a84c]" },
  debuff: { border: "border-[#8f3a5a]", glow: "shadow-[0_0_6px_rgba(143,58,90,0.3)]", label: "bg-[#8f3a5a]" },
  dot:    { border: "border-[#4a8a4a]", glow: "shadow-[0_0_6px_rgba(74,138,74,0.3)]", label: "bg-[#4a8a4a]" },
  cc:     { border: "border-[#5a6a8a]", glow: "shadow-[0_0_6px_rgba(90,106,138,0.3)]", label: "bg-[#5a6a8a]" },
};

const hpBarColors: Record<FighterVariant, { border: string; bg: string; fill: string }> = {
  player: {
    border: "border-[#4a3a28]",
    bg: "bg-[#1a1410]",
    fill: "from-[#5a8a6a] via-[#7aaa6a] to-[#4a9a6a]",
  },
  enemy: {
    border: "border-[#3a2020]",
    bg: "bg-[#1a0a0a]",
    fill: "from-[#6a1a1a] via-[#8a2a2a] to-[#5a1a1a]",
  },
};

const glowVariant: Record<FighterVariant, { active: string; default: string }> = {
  player: {
    active: "drop-shadow-[0_0_3px_rgba(96,211,148,0.9)]",
    default: "drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]",
  },
  enemy: {
    active: "drop-shadow-[0_0_6px_rgba(232,88,106,0.9)]",
    default: "drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]",
  },
};

const floatAnimations: Record<FighterVariant, string> = {
  player: "fighterFloat",
  enemy: "enemyFloat",
};

const hpCornerOpacity: Record<FighterVariant, string> = {
  player: "border-[#c9a84c]/30",
  enemy: "border-[#c9a84c]/20",
};

export default function Fighter({
  character,
  variant = "player",
  active = false,
  currentHp,
  effects,
  onClick,
  isTargetable,
}: FighterProps) {
  const chibi = character.identity.assets.chibi;
  const maxHealth = character.baseStats.hp;
  const hp = currentHp ?? maxHealth;
  const healthPercent = (hp / maxHealth) * 100;

  const glows = glowVariant[variant];
  const chibiGlowClass = active ? glows.active : glows.default;
  const hpColors = hpBarColors[variant];
  const floatAnim = floatAnimations[variant];
  const cornerOpacity = hpCornerOpacity[variant];

  const targetRing = isTargetable
    ? "ring-2 ring-[#c9a84c] ring-offset-2 ring-offset-[#0f0e13] cursor-pointer hover:ring-[#e8dcc8] hover:shadow-[0_0_20px_rgba(201,168,76,0.25)] pointer-events-auto"
    : "";

  const renderHpBar = () => (
    <div className="relative w-[88%] max-w-[11rem] pt-1">
      <div className="relative overflow-hidden rounded border border-[#2a1f14] bg-gradient-to-b from-[#14100a] to-[#0f0a06] shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
        <div className={`m-[2px] overflow-hidden rounded-[2px] border ${hpColors.border} ${hpColors.bg}`}>
          <div
            className={`h-4 bg-gradient-to-r ${hpColors.fill} transition-all duration-300 ease-out`}
            style={{ width: `${healthPercent}%` }}
          >
            <div className="h-full bg-[linear-gradient(to_bottom,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_60%)]" />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-[10px] font-semibold tracking-wide text-[#c9b896] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {hp}/{maxHealth}
          </span>
        </div>
      </div>

      <div className={`pointer-events-none absolute -left-[1px] -top-[1px] h-2 w-2 border-l-2 border-t-2 ${cornerOpacity}`} />
      <div className={`pointer-events-none absolute -right-[1px] -top-[1px] h-2 w-2 border-r-2 border-t-2 ${cornerOpacity}`} />
      <div className={`pointer-events-none absolute -bottom-[1px] -left-[1px] h-2 w-2 border-b-2 border-l-2 ${cornerOpacity}`} />
      <div className={`pointer-events-none absolute -bottom-[1px] -right-[1px] h-2 w-2 border-b-2 border-r-2 ${cornerOpacity}`} />
    </div>
  );

  const renderChibi = () => (
    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden">
      <Image
        src={chibi}
        alt={`Chibi de ${character.identity.name}`}
        fill
        className={`object-contain p-3 transition-[filter] duration-200 ${chibiGlowClass}`}
        style={active ? { animation: `${floatAnim} 1s ease-in-out infinite`, transformOrigin: "center bottom" } : undefined}
        sizes="(max-width: 768px) 160px, 240px"
        unoptimized
      />
    </div>
  );

  const renderName = () => (
    <p className="font-serif text-center text-sm font-semibold leading-tight tracking-wide text-[#c9b896]">
      {character.identity.name}
    </p>
  );

  const renderEffects = () => {
    if (!effects || effects.length === 0) return null;
    return (
      <div className="flex flex-wrap justify-center gap-1">
        {effects.map((effect, i) => {
          const s = effectStyles[effect.type];
          return (
            <div
              key={i}
              className={`group relative flex h-[22px] w-[22px] items-center justify-center rounded-[3px] border ${s.border} ${s.glow} bg-[#14100a]`}
              title={effect.turns ? `${effect.label} (${effect.turns} turns)` : effect.label}
            >
              <span className={`h-2 w-2 rotate-45 ${s.label}`} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div
        className={`flex w-full flex-col items-center gap-1 rounded-xl transition-all duration-200 ${targetRing} ${onClick ? "cursor-pointer" : ""}`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      >
        {variant === "player" ? (
          <>
            {renderChibi()}
            {renderName()}
            {renderHpBar()}
            {renderEffects()}
          </>
        ) : (
          <>
            {renderHpBar()}
            {renderEffects()}
            {renderName()}
            {renderChibi()}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fighterFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes enemyFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
