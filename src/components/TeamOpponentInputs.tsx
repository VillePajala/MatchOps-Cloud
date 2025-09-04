'use client';

import React from 'react';

export interface TeamOpponentInputsProps {
  teamName: string;
  opponentName: string;
  onTeamNameChange: (value: string) => void;
  onOpponentNameChange: (value: string) => void;
  teamLabel: string;
  teamPlaceholder: string;
  opponentLabel: string;
  opponentPlaceholder: string;
  teamInputRef?: React.Ref<HTMLInputElement>;
  opponentInputRef?: React.Ref<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  disabled?: boolean;
  stableInputProps?: {
    onFocus?: React.FocusEventHandler<HTMLInputElement>;
    onMouseDown?: React.MouseEventHandler<HTMLInputElement>;
  };
  teamNameError?: string;
  opponentNameError?: string;
  onTeamNameBlur?: React.FocusEventHandler<HTMLInputElement>;
  onOpponentNameBlur?: React.FocusEventHandler<HTMLInputElement>;
}

const TeamOpponentInputs: React.FC<TeamOpponentInputsProps> = ({
  teamName,
  opponentName,
  onTeamNameChange,
  onOpponentNameChange,
  teamLabel,
  teamPlaceholder,
  opponentLabel,
  opponentPlaceholder,
  teamInputRef,
  opponentInputRef,
  onKeyDown,
  disabled,
  stableInputProps,
  teamNameError,
  opponentNameError,
  onTeamNameBlur,
  onOpponentNameBlur,
}) => {
  return (
    <>
      <div className="mb-4">
        <label htmlFor="teamNameInput" className="block text-sm font-medium text-slate-300 mb-1">
          {teamLabel}
        </label>
        <input
          type="text"
          id="teamNameInput"
          ref={teamInputRef}
          value={teamName}
          onChange={(e) => onTeamNameChange(e.target.value)}
          onBlur={onTeamNameBlur}
          placeholder={teamPlaceholder}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          onKeyDown={onKeyDown}
          disabled={disabled}
          {...stableInputProps}
        />
        {teamNameError && <div className="text-red-400 text-sm mt-1">{teamNameError}</div>}
      </div>
      <div className="mb-4">
        <label htmlFor="opponentNameInput" className="block text-sm font-medium text-slate-300 mb-1">
          {opponentLabel}
        </label>
        <input
          type="text"
          id="opponentNameInput"
          ref={opponentInputRef}
          value={opponentName}
          onChange={(e) => onOpponentNameChange(e.target.value)}
          onBlur={onOpponentNameBlur}
          placeholder={opponentPlaceholder}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          onKeyDown={onKeyDown}
          disabled={disabled}
          {...stableInputProps}
        />
        {opponentNameError && <div className="text-red-400 text-sm mt-1">{opponentNameError}</div>}
      </div>
    </>
  );
};

export default TeamOpponentInputs;
