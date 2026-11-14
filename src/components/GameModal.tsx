import React from 'react';
import { RotateCcw, Play, Home } from 'lucide-react';
import { HudSnapshot } from '../game/types';

interface GameModalProps {
  snapshot: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameModal: React.FC<GameModalProps> = ({
  snapshot,
  onResume,
  onRestart,
  onMainMenu,
}) => {
  const isPause = snapshot.screen === 'paused';
  const isVictory = snapshot.screen === 'victory';

  const title = isPause
    ? 'Duel Paused'
    : isVictory
      ? 'You Survived the Chamber'
      : 'Chamber Fired — Out';

  const subtitle = isPause
    ? 'The cylinder rests on the table. Resume whenever you are ready.'
    : isVictory
      ? `The automaton fell on chamber ${snapshot.currentSlot} of 6.`
      : `The live round struck on chamber ${snapshot.currentSlot} of 6.`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-6">
      <div className="w-full max-w-md rounded-xl border border-[#d4a853]/30 bg-[#0e1014] p-7 shadow-2xl">
        <div className="font-mono text-xs tracking-widest text-[#d4a853]">
          {isPause ? 'MATCH PAUSED' : isVictory ? 'VICTORY' : 'GAME OVER'}
        </div>

        <h2
          className="mt-2 font-display text-2xl font-bold text-[#f7f4ec] md:text-3xl"
          style={{ textWrap: 'balance' }}
        >
          {title}
        </h2>

        <p className="mt-2 text-sm text-[#b9b4aa]">{subtitle}</p>

        {/* Tabular Match Breakdown */}
        <div className="mt-6 grid grid-cols-3 gap-3 border-y border-white/10 py-4 font-mono tabular-nums">
          <div>
            <div className="text-[11px] text-[#8d887e]">Rounds</div>
            <div className="mt-0.5 text-lg font-semibold text-[#f4f1ea]">{snapshot.round}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#8d887e]">Clicks</div>
            <div className="mt-0.5 text-lg font-semibold text-[#f4f1ea]">{snapshot.clicksSurvived}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#8d887e]">Chamber</div>
            <div className="mt-0.5 text-lg font-semibold text-[#d4a853]">
              {snapshot.currentSlot} / 6
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {isPause ? (
            <button
              type="button"
              onClick={onResume}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4a853] px-5 py-3 text-sm font-semibold text-[#0b0c0f] transition-colors hover:bg-[#e2b965] cursor-pointer"
            >
              <Play className="h-4 w-4" />
              <span>Resume Duel</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4a853] px-5 py-3 text-sm font-semibold text-[#0b0c0f] transition-colors hover:bg-[#e2b965] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Play Again</span>
            </button>
          )}

          <div className="flex gap-2.5">
            {isPause && (
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/12 bg-[#151820] px-4 py-2.5 text-xs font-medium text-[#e6e1d6] transition-colors hover:border-[#d4a853]/50 hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart</span>
              </button>
            )}
            <button
              type="button"
              onClick={onMainMenu}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/12 bg-[#151820] px-4 py-2.5 text-xs font-medium text-[#e6e1d6] transition-colors hover:border-[#d4a853]/50 hover:text-white cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Title Screen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
