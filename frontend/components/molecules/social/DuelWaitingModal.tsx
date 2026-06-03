"use client";

type DuelWaitingModalProps = {
  opponentName: string;
  onCancel: () => void;
};

export function DuelWaitingModal({ opponentName, onCancel }: DuelWaitingModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-2xl border border-[#c9a227]/30 bg-[#15131d] p-8 font-['Arial',_Helvetica,_sans-serif] shadow-2xl">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white">Waiting for response</h2>
            <p className="mt-2 text-sm text-gray-400">
              Challenge sent to <span className="font-semibold text-[var(--accent-color)]">{opponentName}</span>
            </p>
          </div>

          {/* Loading animation */}
          <div className="flex gap-2">
            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent-color)]" style={{ animationDelay: "0s" }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent-color)]" style={{ animationDelay: "0.2s" }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent-color)]" style={{ animationDelay: "0.4s" }} />
          </div>

          <button
            onClick={onCancel}
            className="w-full rounded-lg border border-red-500/70 bg-red-900/20 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-900/35"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
