'use client';

import { clsx } from 'clsx';

type HorizontalAction = 'save' | 'foul' | 'pass';
type VerticalAction = 'clear' | 'fail' | 'pass';

interface HorizontalAttemptButtonsProps {
  onAction: (action: HorizontalAction) => void;
  disabled?: boolean;
  hasDistance: boolean;
}

export function HorizontalAttemptButtons({
  onAction,
  disabled = false,
  hasDistance,
}: HorizontalAttemptButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <button
        type="button"
        onClick={() => onAction('save')}
        disabled={disabled || !hasDistance}
        className={clsx(
          'py-4 px-6 rounded-xl font-bold text-lg transition-all',
          'min-h-[60px] active:scale-95',
          disabled || !hasDistance
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 shadow-lg'
        )}
      >
        GODKJENT
      </button>

      <button
        type="button"
        onClick={() => onAction('foul')}
        disabled={disabled}
        className={clsx(
          'py-4 px-6 rounded-xl font-bold text-lg transition-all',
          'min-h-[60px] active:scale-95',
          disabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-lg'
        )}
      >
        X
      </button>

      <button
        type="button"
        onClick={() => onAction('pass')}
        disabled={disabled}
        className={clsx(
          'py-4 px-6 rounded-xl font-bold text-lg transition-all',
          'min-h-[60px] active:scale-95',
          disabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-gray-400 text-white hover:bg-gray-500 active:bg-gray-600 shadow-lg'
        )}
      >
        -
      </button>
    </div>
  );
}

interface VerticalAttemptButtonsProps {
  onAction: (action: VerticalAction) => void;
  disabled?: boolean;
}

export function VerticalAttemptButtons({
  onAction,
  disabled = false,
}: VerticalAttemptButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <button
        type="button"
        onClick={() => onAction('clear')}
        disabled={disabled}
        className={clsx(
          'py-4 px-6 rounded-xl font-bold text-2xl transition-all',
          'min-h-[70px] active:scale-95',
          disabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 shadow-lg'
        )}
      >
        O
      </button>

      <button
        type="button"
        onClick={() => onAction('fail')}
        disabled={disabled}
        className={clsx(
          'py-4 px-6 rounded-xl font-bold text-2xl transition-all',
          'min-h-[70px] active:scale-95',
          disabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-lg'
        )}
      >
        X
      </button>

      <button
        type="button"
        onClick={() => onAction('pass')}
        disabled={disabled}
        className={clsx(
          'py-4 px-6 rounded-xl font-bold text-2xl transition-all',
          'min-h-[70px] active:scale-95',
          disabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-gray-400 text-white hover:bg-gray-500 active:bg-gray-600 shadow-lg'
        )}
      >
        -
      </button>
    </div>
  );
}

// Compact version for inline use
interface CompactAttemptButtonProps {
  type: 'O' | 'X' | '-';
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

export function CompactAttemptButton({
  type,
  onClick,
  disabled = false,
  isActive = false,
}: CompactAttemptButtonProps) {
  const colors = {
    O: 'bg-green-100 text-green-600 hover:bg-green-200',
    X: 'bg-red-100 text-red-600 hover:bg-red-200',
    '-': 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  };

  const activeColors = {
    O: 'bg-green-500 text-white',
    X: 'bg-red-500 text-white',
    '-': 'bg-gray-500 text-white',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'w-10 h-10 rounded-lg font-bold text-lg transition-all',
        'active:scale-95',
        disabled
          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
          : isActive
          ? activeColors[type]
          : colors[type]
      )}
    >
      {type}
    </button>
  );
}
