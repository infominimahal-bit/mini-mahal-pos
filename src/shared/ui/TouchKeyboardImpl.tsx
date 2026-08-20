import React from 'react';
import { X, Globe, GripHorizontal, Keyboard as KeyboardIcon, Minimize2 } from 'lucide-react';
import { LAYOUTS, CALC_LAYOUT } from './KeyboardLayouts';
import { useKeyboardLogic } from './useKeyboardLogic';
import { KeyboardKey, CalculatorKey } from './keyboardKeys';

interface TouchKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onInput: (char: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  inputElement: HTMLInputElement | HTMLTextAreaElement | null;
}

export const TouchKeyboard = React.memo(function TouchKeyboard(props: TouchKeyboardProps) {
  const {
    layout, isCaps,
    calcExpr, calcResult, calcHistoryExpr,
    position, scale, widthScale, setWidthScale,
    isFolded, forceOpen, setForceOpen,
    keyboardRef, innerRef, calcInputRef,
    handlePointerDown, handleKeyPointerDown, handleKeyPointerUp,
    handleCalcInputChange, handleCalcInputKeyDown, handleCalcInputClick, toggleFold
  } = useKeyboardLogic(props);

  if (!props.isOpen && !forceOpen && !isFolded) return null;

  if (isFolded) {
    return (
      <div
        ref={keyboardRef}
        style={{ transform: `translate3d(calc(-50% + ${position.x}px), ${position.y}px, 0)` }}
        className="fixed bottom-0 left-1/2 z-[9999] touch-none select-none p-4 pb-[24px]"
      >
        <div className="flex gap-2">
          <button
            onPointerDown={(e) => handlePointerDown(e, 'drag')}
            className="w-14 h-14 bg-black/80 dark:bg-white/90 backdrop-blur-xl rounded-full shadow-2xl flex items-center justify-center text-white dark:text-black hover:scale-105 active:scale-95 transition-all cursor-move"
          >
            <GripHorizontal className="w-6 h-6 opacity-50" />
          </button>
           
          <button
            onClick={toggleFold}
            className="w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          >
            <KeyboardIcon className="w-6 h-6" />
          </button>

          <button
            onClick={props.onClose}
            className="w-14 h-14 bg-red-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={keyboardRef}
      style={{
        transform: `translate3d(calc(-50% + ${position.x}px), ${position.y}px, 0)`,
        willChange: 'transform'
      }}
      className={`fixed bottom-0 left-1/2 z-[9999] touch-none select-none`}
    >
      <div 
        ref={innerRef}
        className="relative bg-gray-100/90 dark:bg-black/80 backdrop-blur-2xl rounded-t-3xl shadow-2xl border border-white/20 overflow-hidden flex flex-col"
        style={{
          transformOrigin: 'bottom center',
          transform: `scale(${scale})`,
          width: layout === 'calculator' ? '400px' : `${widthScale * 100}%`,
          minWidth: layout === 'calculator' ? '400px' : '700px',
          maxWidth: layout === 'calculator' ? '400px' : '1200px',
        }}
      >
        <div 
          className="h-10 bg-gray-200/50 dark:bg-white/10 flex items-center justify-between px-4 cursor-move rounded-t-3xl active:bg-gray-300/50 dark:active:bg-white/20 transition-colors"
          onPointerDown={(e) => handlePointerDown(e, 'drag')}
        >
          <div className="flex items-center gap-2 pointer-events-none opacity-50">
            <GripHorizontal className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {layout === 'calculator' ? 'Calculator' : 'Virtual Keyboard'}
            </span>
          </div>
           
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setForceOpen(!forceOpen)}
              className={`p-1.5 rounded-lg transition-colors ${forceOpen ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-gray-400'}`}
              title="Pin Keyboard"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFold}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
              title="Fold Keyboard"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={props.onClose}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"
              title="Close Keyboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-2 sm:p-4 pb-6 sm:pb-8 flex-1 flex flex-col justify-end">
          {layout === 'calculator' ? (
            <div className="flex flex-col gap-3">
              <div className="bg-white dark:bg-black/50 p-4 rounded-2xl shadow-inner border border-gray-200 dark:border-white/5 space-y-2">
                <div className="text-xs text-gray-500 font-mono text-right min-h-[16px]">
                  {calcHistoryExpr || '\u00A0'}
                </div>
                
                <input
                  ref={calcInputRef}
                  type="text"
                  value={calcExpr}
                  onChange={handleCalcInputChange}
                  onKeyDown={handleCalcInputKeyDown}
                  className={`w-full text-right bg-transparent border-none outline-none font-mono ${calcResult ? 'text-xl text-gray-400' : 'text-3xl font-bold text-gray-900 dark:text-white'}`}
                  placeholder="0"
                />

                {calcResult && (
                  <div 
                    className="text-right text-3xl font-bold text-primary font-mono cursor-pointer active:scale-95 transition-transform"
                    onClick={handleCalcInputClick}
                  >
                    = {calcResult}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {CALC_LAYOUT.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {row.map((key, keyIndex) => (
                      <CalculatorKey
                        key={`${rowIndex}-${keyIndex}`}
                        k={key}
                        onPointerDown={(e) => handleKeyPointerDown(e, key)}
                        onPointerUp={(e) => handleKeyPointerUp(e, key)}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {LAYOUTS[layout].map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1 sm:gap-2">
                  {row.map((key, keyIndex) => (
                    <KeyboardKey
                      key={`${rowIndex}-${keyIndex}`}
                      k={key}
                      isCaps={isCaps}
                      onPointerDown={(e) => handleKeyPointerDown(e, key)}
                      onPointerUp={(e) => handleKeyPointerUp(e, key)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div 
          className="absolute -top-3 -left-3 w-8 h-8 cursor-nwse-resize z-50 bg-primary/20 rounded-full opacity-0 hover:opacity-100"
          onPointerDown={(e) => handlePointerDown(e, 'resize')}
        />
        <div 
          className="absolute -top-3 -right-3 w-8 h-8 cursor-nesw-resize z-50 bg-primary/20 rounded-full opacity-0 hover:opacity-100"
          onPointerDown={(e) => handlePointerDown(e, 'resize')}
        />
        
        {layout !== 'calculator' && (
          <>
            <div 
              className="absolute top-1/2 -left-3 w-6 h-12 -translate-y-1/2 cursor-ew-resize z-50 bg-primary/20 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              onPointerDown={(e) => {
                const startX = e.clientX;
                const startWidthScale = widthScale;
                const handleMove = (e2: PointerEvent) => {
                  const dx = startX - e2.clientX;
                  const newScale = Math.max(0.5, Math.min(2.0, startWidthScale + (dx / 500)));
                  setWidthScale(newScale);
                  localStorage.setItem('keyboard_width_scale', String(newScale));
                };
                const handleUp = () => {
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                };
                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp);
              }}
            >
              <div className="w-1 h-6 bg-primary rounded-full"></div>
            </div>
            
            <div 
              className="absolute top-1/2 -right-3 w-6 h-12 -translate-y-1/2 cursor-ew-resize z-50 bg-primary/20 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              onPointerDown={(e) => {
                const startX = e.clientX;
                const startWidthScale = widthScale;
                const handleMove = (e2: PointerEvent) => {
                  const dx = e2.clientX - startX;
                  const newScale = Math.max(0.5, Math.min(2.0, startWidthScale + (dx / 500)));
                  setWidthScale(newScale);
                  localStorage.setItem('keyboard_width_scale', String(newScale));
                };
                const handleUp = () => {
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                };
                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp);
              }}
            >
              <div className="w-1 h-6 bg-primary rounded-full"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
