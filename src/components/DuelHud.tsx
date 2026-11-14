import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Volume2, VolumeX } from 'lucide-react';
import { CameraPreset, HudSnapshot, Move } from '../game/types';

interface DuelHudProps {
  snapshot: HudSnapshot;
  muted: boolean;
  onSelectMove: (move: Move) => void;
  onSelectCamera: (preset: CameraPreset) => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  dockCollapsed: boolean;
  onToggleDock: () => void;
}

const ChamberWheelSvg: React.FC<{ currentSlot: number; lastFired: boolean | null }> = ({
  currentSlot,
  lastFired,
}) => {
  const slots = [0, 1, 2, 3, 4, 5];
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="21" cy="21" r="19" stroke="#d4a853" strokeOpacity="0.45" strokeWidth="1.4" fill="#111318" />
      <circle cx="21" cy="21" r="3" fill="#d4a853" fillOpacity="0.7" />
      {slots.map((idx) => {
        const angle = -Math.PI / 2 + (idx * Math.PI) / 3;
        const cx = 21 + Math.cos(angle) * 11.5;
        const cy = 21 + Math.sin(angle) * 11.5;
        const isSpent = idx < currentSlot;
        const isJustFired = lastFired && idx === currentSlot - 1;
        const isNext = idx === currentSlot;
        return (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r="3.8"
            fill={
              isJustFired
                ? '#ef4444'
                : isSpent
                  ? '#1d2028'
                  : isNext
                    ? '#d4a853'
                    : '#2a2e39'
            }
            stroke={isSpent ? '#4b5263' : isNext ? '#fde68a' : '#6b7280'}
            strokeWidth="1.2"
          />
        );
      })}
    </svg>
  );
};

const MoveIcon: React.FC<{ move: Move }> = ({ move }) => {
  if (move === 1) {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M6 4L14 3L17 9L14 16L6 17L3 10L6 4Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (move === 2) {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="4" y="3" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 7H13M7 10H13M7 13H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="14.5" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13.5" cy="14.5" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.8 12.6L14 4M12.2 12.6L6 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

export const DuelHud: React.FC<DuelHudProps> = ({
  snapshot,
  muted,
  onSelectMove,
  onSelectCamera,
  onToggleMute,
  onTogglePause,
  dockCollapsed,
  onToggleDock,
}) => {
  const [hoveredBtn, setHoveredBtn] = useState<Move | null>(null);
  const canPickMove = snapshot.phase === 'awaiting_move' && snapshot.screen === 'playing';

  const cameraOptions: { id: CameraPreset; label: string }[] = [
    { id: 'duel', label: 'Duel' },
    { id: 'cylinder', label: 'Cylinder' },
    { id: 'overhead', label: 'Top' },
  ];

  const isDangerResult = snapshot.lastFired === true;
  const isSafeClick = snapshot.phase === 'trigger_result' && snapshot.lastFired === false;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 md:p-6">
      {/* Top Perimeter Clusters */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Duelists & Match Counters */}
        <div className="rounded-lg border border-white/10 bg-[#0d0e12]/88 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-3 font-medium">
            <span className={snapshot.playerAlive ? 'text-[#f4f1ea]' : 'text-[#ef4444]'}>
              You: {snapshot.playerAlive ? 'Alive' : 'Out'}
            </span>
            <span aria-hidden="true" className="text-white/25">·</span>
            <span className={snapshot.botAlive ? 'text-[#f4f1ea]' : 'text-[#9ca3af]'}>
              Bot: {snapshot.botAlive ? 'Alive' : 'Out'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2.5 font-mono text-[11px] text-[#a5a095] tabular-nums">
            <span>Round {snapshot.round}</span>
            <span aria-hidden="true">·</span>
            <span>Clicks {snapshot.clicksSurvived}</span>
            <span aria-hidden="true">·</span>
            <span>Ties {snapshot.tiesCount}</span>
          </div>
        </div>

        {/* Top-Right: Chamber Gauge & Utility Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0d0e12]/88 px-3.5 py-2">
            <ChamberWheelSvg currentSlot={snapshot.currentSlot} lastFired={snapshot.lastFired} />
            <div className="text-right font-mono tabular-nums">
              <div className="text-xs font-semibold text-[#f4f1ea]">
                Chamber {Math.min(snapshot.currentSlot + 1, 6)} / 6
              </div>
              <div className="text-[11px] text-[#d4a853]">
                {snapshot.shotProbability.toFixed(1)}% Live
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            title="Mute / Unmute (M)"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0d0e12]/88 text-[#e6e1d6] transition-colors hover:border-[#d4a853]/60 hover:text-white focus-visible:outline-2 focus-visible:outline-[#d4a853] cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4 text-[#a5a095]" /> : <Volume2 className="h-4 w-4 text-[#d4a853]" />}
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            aria-label="Pause duel"
            title="Pause (Esc)"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0d0e12]/88 text-[#e6e1d6] transition-colors hover:border-[#d4a853]/60 hover:text-white focus-visible:outline-2 focus-visible:outline-[#d4a853] cursor-pointer"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Upper-Center Non-Blocking Round Callout */}
      <div className="mx-auto mt-2 mb-auto text-center max-w-lg px-4">
        <div
          className={`inline-block rounded-lg border px-5 py-2.5 transition-colors duration-200 ${
            isDangerResult
              ? 'border-[#ef4444]/60 bg-[#230c0e]/92'
              : isSafeClick
                ? 'border-[#34d399]/40 bg-[#0d1f18]/90'
                : 'border-white/10 bg-[#0d0e12]/82'
          }`}
        >
          <div className="font-display text-base font-semibold tracking-wide text-[#f7f4ec] md:text-lg">
            {snapshot.headline}
          </div>
          <div className="mt-0.5 text-xs text-[#c2bdb3]">
            {snapshot.subline}
          </div>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div className="relative mx-auto flex w-full max-w-[820px] flex-col items-center">
        <button
          type="button"
          onClick={onToggleDock}
          className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0d0e12]/90 px-3 py-1 text-[11px] font-mono text-[#b8b3a8] transition-colors hover:border-[#d4a853]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-[#d4a853] cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        <div
          className={`pointer-events-auto w-full rounded-xl border border-white/12 bg-[#0d0e12]/92 p-2.5 transition-transform duration-200 ease-out ${
            dockCollapsed ? 'translate-y-[140%] pointer-events-none opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Primary RPS Hand Actions */}
            <div className="flex flex-1 items-center gap-2">
              {([
                { move: 1 as Move, label: 'Rock', keyHint: '1' },
                { move: 2 as Move, label: 'Paper', keyHint: '2' },
                { move: 3 as Move, label: 'Scissors', keyHint: '3' },
              ]).map((item) => {
                const isSelected = snapshot.playerMove === item.move && !canPickMove;
                const isHovered = hoveredBtn === item.move;
                return (
                  <button
                    key={item.move}
                    type="button"
                    disabled={!canPickMove}
                    onClick={() => onSelectMove(item.move)}
                    onMouseEnter={() => setHoveredBtn(item.move)}
                    onMouseLeave={() => setHoveredBtn(null)}
                    className={`flex flex-1 min-w-[100px] items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-[#d4a853] bg-[#d4a853] text-[#0b0c0f]'
                        : canPickMove
                          ? isHovered
                            ? 'border-[#d4a853]/80 bg-[#1c1f26] text-white'
                            : 'border-white/12 bg-[#14161c] text-[#f4f1ea] hover:border-[#d4a853]/70'
                          : 'border-white/5 bg-[#111318] text-[#6d6a63] opacity-60'
                    }`}
                  >
                    <MoveIcon move={item.move} />
                    <span>{item.label}</span>
                    <span
                      className={`font-mono text-[11px] ${
                        isSelected ? 'text-[#0b0c0f]/75' : 'text-[#9b968b]'
                      }`}
                    >
                      {item.keyHint}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Camera Angle Switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#13151b] p-1">
              {cameraOptions.map((cam) => {
                const active = snapshot.cameraPreset === cam.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => onSelectCamera(cam.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#d4a853] text-[#0b0c0f] font-semibold'
                        : 'text-[#b5b0a6] hover:text-white'
                    }`}
                  >
                    {cam.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
