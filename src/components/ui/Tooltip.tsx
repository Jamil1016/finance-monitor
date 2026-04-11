'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
}

export default function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);

  // Desktop: hover
  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => setShow(true), 300);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
  };

  // Mobile: long press
  const handleTouchStart = useCallback(() => {
    longPressRef.current = setTimeout(() => {
      setShow(true);
      // Auto-hide after 2 seconds
      setTimeout(() => setShow(false), 2000);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  }, []);

  const posClass = position === 'top'
    ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
    : 'top-full mt-2 left-1/2 -translate-x-1/2';

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
      {show && (
        <div className={`absolute ${posClass} z-50 pointer-events-none`}>
          <div className="bg-slate-800 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg max-w-[200px] text-center leading-snug">
            {text}
            <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 ${position === 'top' ? '-bottom-1' : '-top-1'}`} />
          </div>
        </div>
      )}
    </div>
  );
}
