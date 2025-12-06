'use client';

import { useState, useRef, useCallback, ReactNode, useEffect } from 'react';
import { clsx } from 'clsx';

interface SwipeableViewsProps {
  children: ReactNode[];
  defaultView?: number;
  tabLabels?: string[];
  onViewChange?: (index: number) => void;
}

export function SwipeableViews({
  children,
  defaultView = 1,
  tabLabels = ['Startliste', 'Registrering', 'Resultater'],
  onViewChange,
}: SwipeableViewsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultView);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipeRef.current) {
      // Prevent vertical scroll during horizontal swipe
      e.preventDefault();
      setDragOffset(diffX);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    const threshold = 50; // Minimum swipe distance

    if (isHorizontalSwipeRef.current && Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && activeIndex > 0) {
        // Swipe right -> previous view
        setActiveIndex(activeIndex - 1);
        onViewChange?.(activeIndex - 1);
      } else if (dragOffset < 0 && activeIndex < children.length - 1) {
        // Swipe left -> next view
        setActiveIndex(activeIndex + 1);
        onViewChange?.(activeIndex + 1);
      }
    }

    setIsDragging(false);
    setDragOffset(0);
    isHorizontalSwipeRef.current = null;
  }, [isDragging, dragOffset, activeIndex, children.length, onViewChange]);

  const handleTabClick = useCallback((index: number) => {
    setActiveIndex(index);
    onViewChange?.(index);
  }, [onViewChange]);

  // Mouse support for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const diffX = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalSwipeRef.current) {
      setDragOffset(diffX);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    handleTouchEnd();
  }, [handleTouchEnd]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleTouchEnd();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, handleTouchEnd]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab indicators - bottom on mobile, top on tablet */}
      <div className="order-last md:order-first">
        <TabIndicator
          labels={tabLabels}
          activeIndex={activeIndex}
          onTabClick={handleTabClick}
        />
      </div>

      {/* Swipeable content area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className={clsx(
            'flex h-full',
            !isDragging && 'transition-transform duration-300 ease-out'
          )}
          style={{
            transform: `translateX(calc(-${activeIndex * 100}% + ${dragOffset}px))`,
          }}
        >
          {children.map((child, index) => (
            <div
              key={index}
              className="w-full h-full flex-shrink-0 overflow-y-auto"
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TabIndicatorProps {
  labels: string[];
  activeIndex: number;
  onTabClick: (index: number) => void;
}

function TabIndicator({ labels, activeIndex, onTabClick }: TabIndicatorProps) {
  return (
    <div className="flex justify-center gap-2 py-3 bg-white border-t md:border-t-0 md:border-b border-gray-200">
      {labels.map((label, index) => (
        <button
          key={index}
          onClick={() => onTabClick(index)}
          className={clsx(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            index === activeIndex
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
