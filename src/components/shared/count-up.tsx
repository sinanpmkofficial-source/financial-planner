"use client";

import { useEffect, useState, useRef } from "react";

// Cubic ease-out curve for natural deceleration
const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

interface CountUpProps {
  value: number;
  start?: number;
  duration?: number; // duration in ms
  decimals?: number;
  formatter?: (val: number) => string;
  className?: string;
}

export function CountUp({
  value,
  start = 0,
  duration = 800,
  decimals = 0,
  formatter,
  className,
}: CountUpProps) {
  const [count, setCount] = useState(start);
  const startValRef = useRef(start);
  const endValRef = useRef(value);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Animate whenever the target 'value' changes
  useEffect(() => {
    // Start from current count value to make the transition continuous
    startValRef.current = count;
    endValRef.current = value;
    startTimeRef.current = null;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);

      const easedProgress = easeOutCubic(percentage);
      const currentVal =
        startValRef.current + (endValRef.current - startValRef.current) * easedProgress;

      setCount(currentVal);

      if (percentage < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(endValRef.current);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  // Apply decimal rounding
  const roundedValue = parseFloat(count.toFixed(decimals));
  const displayValue = formatter ? formatter(roundedValue) : roundedValue.toLocaleString();

  return <span className={className}>{displayValue}</span>;
}
