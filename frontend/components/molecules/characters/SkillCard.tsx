import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { CharacterSkill, CharacterStats } from "@/components/organisms/characters/types";
import { resolveSkillDescription } from "@/components/organisms/characters/character-utils";
import { SKILL_TYPE_CONFIG, getSkillType } from "@/components/organisms/characters/character-config";

type SkillCardProps = {
  skill: CharacterSkill;
  stats: CharacterStats;
  maxSkillLevel: number;
  selectedSkillId: string | null;
  canUpgrade: boolean;
  onToggleDetails: (skill: CharacterSkill) => void;
  onUpgrade: (skillId: string) => Promise<boolean>;
  onPlusOne: (skillId: string) => Promise<boolean>;
  characterName?: string;
};

const CHARGE_STEPS = 10;
const HOLD_DELAY_MS = 260;
const HOLD_TICK_MS = 140;

// Molecule: carte de competence interactive avec details et progression.
export default function SkillCard({
  skill,
  stats,
  maxSkillLevel,
  selectedSkillId,
  canUpgrade,
  onToggleDetails,
  onUpgrade,
  onPlusOne,
  characterName,
}: SkillCardProps) {
  const [chargeProgress, setChargeProgress] = useState(0);
  const holdDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chargeProgressRef = useRef(0);
  const upgradeInFlightRef = useRef(false);
  const autoRepeatingRef = useRef(false);
  const skillType = getSkillType(skill, maxSkillLevel);
  const config = SKILL_TYPE_CONFIG[skillType];
  const isMaxLevel = skill.level >= maxSkillLevel;
  const resolved = resolveSkillDescription(skill.description, stats, skill, characterName);
  const visibleChargeProgress = canUpgrade && !isMaxLevel ? chargeProgress : 0;
  const ruby = "/gameResources/items/ruby.webp";

  const setChargeValue = (nextValue: number) => {
    chargeProgressRef.current = nextValue;
    setChargeProgress(nextValue);
  };

  useEffect(() => {
    setChargeValue(skill.xp);
  }, [])

  const stopHold = () => {
    if (holdDelayTimerRef.current) {
      clearTimeout(holdDelayTimerRef.current);
      holdDelayTimerRef.current = null;
    }
    if (holdTickTimerRef.current) {
      clearInterval(holdTickTimerRef.current);
      holdTickTimerRef.current = null;
    }
    autoRepeatingRef.current = false;
  };

  const executePlusOne = async () => {

    const success = await onPlusOne(skill.id);

    if (!success) {
      stopHold();
    }
  }

  const executeUpgrade = async () => {
    if (upgradeInFlightRef.current) {
      return;
    }

    upgradeInFlightRef.current = true;
    const success = await onUpgrade(skill.id);
    upgradeInFlightRef.current = false;

    if (!success) {
      stopHold();
    }
    skill.level += 1;
  };

  const triggerChargeTick = () => {
    if (!canUpgrade || isMaxLevel || upgradeInFlightRef.current) {
      return;
    }

    const next = chargeProgressRef.current + 1;
    void executePlusOne();

    if (next < CHARGE_STEPS) {
      setChargeValue(next);
      return;
    }

    setChargeValue(0);
    void executeUpgrade();
  };

  const handleUpgradePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    if (!canUpgrade || isMaxLevel) {
      return;
    }

    stopHold();
    autoRepeatingRef.current = false;

    holdDelayTimerRef.current = setTimeout(() => {
      autoRepeatingRef.current = true;
      holdTickTimerRef.current = setInterval(() => {
        triggerChargeTick();
      }, HOLD_TICK_MS);
    }, HOLD_DELAY_MS);
  };

  const handleUpgradePointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const shouldIncrementOnce = !autoRepeatingRef.current;
    stopHold();

    if (shouldIncrementOnce) {
      triggerChargeTick();
    }
  };

  useEffect(() => {
    if (!canUpgrade || isMaxLevel) {
      stopHold();
    }
  }, [canUpgrade, isMaxLevel]);

  useEffect(() => {
    return () => {
      stopHold();
    };
  }, []);

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border transition-all duration-300 ${
        selectedSkillId === skill.id
          ? "border-[#c9a227]/50 bg-[#1e1a24]"
          : "border-[#c9a227]/10 bg-[#15121a]/60 hover:border-[#c9a227]/30"
      }`}
      onClick={() => onToggleDetails(skill)}
    >
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: config.color }}
      />

      <div className="p-3 pl-4">
        <div className="flex items-start gap-3">
          <div
            className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 ${isMaxLevel ? "prismatic-border" : ""}`}
            style={{
              borderColor: isMaxLevel ? "transparent" : config.borderColor,
              boxShadow: isMaxLevel ? "0 0 12px rgba(180, 136, 255, 0.35)" : "none",
            }}
          >
            <Image
              src={skill.image}
              alt={skill.name}
              fill
              sizes="(max-width: 768px) 100vw"
              loading="eager"
              className="object-cover"
            />
            <div
              className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${isMaxLevel ? "prismatic-gradient" : ""}`}
              style={{
                backgroundColor: isMaxLevel ? undefined : "#0c0a0f",
                color: "#f5e6c8",
                border: `1px solid ${isMaxLevel ? "transparent" : config.color}`,
                fontFamily: "var(--font-display), serif",
              }}
            >
              {skill.level}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className="font-bold text-[#f5e6c8]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {skill.name}
              </span>
              {isMaxLevel && (
                <span className="prismatic-gradient flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f5e6c8]">
                  <i className={"fa-solid fa-crown text-[8px]"} />
                  Max
                </span>
              )}
            </div>
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: config.color }}
            >
              {config.label}
            </span>

            {selectedSkillId === skill.id && (
              <div className="mt-2 text-sm leading-relaxed text-[#c9b896]">
                {resolved.segments.map((segment, idx) =>
                  segment.highlight ? (
                    <span
                      key={idx}
                      style={{ color: config.color, fontWeight: 700 }}
                    >
                      {segment.text}
                    </span>
                  ) : (
                    <span key={idx}>{segment.text}</span>
                  ),
                )}
              </div>
            )}
          </div>

          {!isMaxLevel && (
            <button
              onPointerDown={handleUpgradePointerDown}
              onPointerUp={handleUpgradePointerEnd}
              onPointerCancel={handleUpgradePointerEnd}
              onClick={(event) => event.stopPropagation()}
              disabled={!canUpgrade}
              className={`shrink-0 rounded border px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                canUpgrade
                  ? "border-[#c9a227]/50 bg-[#c9a227]/10 text-[#f5e6c8] hover:bg-[#c9a227]/20 hover:border-[#c9a227]"
                  : "cursor-not-allowed border-[#2a2638] bg-black/30 text-[#5a5668]"
              }`}
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              <div className="flex items-center gap-1.5">
                <i className="fa-solid fa-arrow-up text-[10px]" />
                <span>{visibleChargeProgress}/{CHARGE_STEPS}</span>
                <img
                src={ruby}
                alt="Ruby"
                width={34}
                height={34}
                />
              </div>
            </button>
          )}
        </div>

        {!isMaxLevel ? (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/50">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(visibleChargeProgress / CHARGE_STEPS) * 100}%`,
                backgroundColor: config.color,
                opacity: 0.7,
              }}
            />
          </div>
        ) : (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#c9a227]/20">
            <div className="prismatic-gradient h-full w-full rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
