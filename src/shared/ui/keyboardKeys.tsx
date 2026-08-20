import React from 'react';
import { Delete, Type, Hash, Space, KeyboardIcon, CornerDownLeft } from 'lucide-react';

export function KeyboardKey({
  k,
  isCaps,
  onPointerDown,
  onPointerUp,
}: {
  k: string;
  isCaps: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  let content: React.ReactNode = k;
  let extraClasses = "text-sm sm:text-base font-medium flex-1 h-10 sm:h-12";

  if (k === 'BKSP') {
    content = <Delete className="w-5 h-5" />;
    extraClasses += " bg-gray-200/50 dark:bg-white/5 text-red-500 max-w-[60px] sm:max-w-[70px]";
  } else if (k === 'ENTER') {
    content = <CornerDownLeft className="w-5 h-5" />;
    extraClasses += " bg-primary/10 text-primary max-w-[60px] sm:max-w-[70px]";
  } else if (k === 'SHIFT') {
    content = <Type className="w-4 h-4" />;
    extraClasses += ` max-w-[50px] sm:max-w-[60px] ${isCaps ? 'bg-primary/20 text-primary ring-2 ring-primary/50' : 'bg-gray-200/50 dark:bg-white/5'}`;
  } else if (k === 'SPACE') {
    content = <Space className="w-6 h-6" />;
    extraClasses += " w-full max-w-[200px] sm:max-w-[300px]";
  } else if (['?123', 'ABC', '=\\<'].includes(k)) {
    extraClasses += " bg-gray-200/50 dark:bg-white/5 max-w-[60px] sm:max-w-[70px] text-xs font-bold";
  } else if (k === 'HIDE') {
    content = <KeyboardIcon className="w-5 h-5" />;
    extraClasses += " bg-gray-200/50 dark:bg-white/5 max-w-[50px] sm:max-w-[60px]";
  } else if (k === 'CALC') {
    content = <Hash className="w-5 h-5" />;
    extraClasses += " bg-amber-500/10 text-amber-500 max-w-[60px] sm:max-w-[70px]";
  } else {
    extraClasses += " bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 active:scale-95";
  }

  if (k === 'SPACE' || ['?123', 'ABC', '=\\<'].includes(k)) {
    return (
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`flex items-center justify-center rounded-xl shadow-sm backdrop-blur-sm transition-all select-none touch-none ${extraClasses}`}
      >
        {content}
      </button>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`flex items-center justify-center rounded-xl shadow-sm backdrop-blur-sm transition-all select-none touch-none active:bg-gray-200 dark:active:bg-white/20 ${extraClasses}`}
    >
      {isCaps && k.length === 1 ? k.toUpperCase() : k}
    </button>
  );
}

export function CalculatorKey({
  k,
  onPointerDown,
  onPointerUp,
}: {
  k: string;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  let content: React.ReactNode = k;
  let extraClasses = "text-lg font-semibold flex-1 h-12";

  if (k === 'BKSP') {
    content = <Delete className="w-5 h-5" />;
    extraClasses += " bg-red-500/10 text-red-500 hover:bg-red-500/20";
  } else if (k === 'C') {
    extraClasses += " bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold";
  } else if (['/', '*', '-', '+'].includes(k)) {
    extraClasses += " bg-primary/10 text-primary hover:bg-primary/20 text-xl font-black";
  } else if (k === '=') {
    extraClasses += " bg-emerald-500 text-white hover:bg-emerald-600 shadow-md font-bold";
  } else if (k === 'INSERT') {
    content = "Insert";
    extraClasses += " bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-bold text-sm col-span-2";
  } else {
    extraClasses += " bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 active:scale-95";
  }

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`flex items-center justify-center rounded-xl shadow-sm backdrop-blur-sm transition-all select-none touch-none ${extraClasses} ${k === 'INSERT' ? 'col-span-2' : ''}`}
    >
      {content}
    </button>
  );
}
