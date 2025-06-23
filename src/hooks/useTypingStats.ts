import { useCallback } from "react";

export function useTypingStats() {
  const calculateWPM = useCallback((value: string, startTime: Date | null) => {
    if (!startTime) return 0;
    const now = new Date();
    const timeElapsed = (now.getTime() - startTime.getTime()) / 1000 / 60;
    const words = value.split(" ").length - 1;
    return Math.round(words / timeElapsed);
  }, []);

  const calculateAccuracy = useCallback((value: string, target: string) => {
    if (value.length === 0) return 100;
    
    let mistakes = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== target[i]) {
        mistakes++;
      }
    }
    
    return Math.max(0, ((value.length - mistakes) / value.length) * 100);
  }, []);

  const calculateProgress = useCallback((value: string, target: string) => {
    return Math.min((value.length / target.length) * 100, 100);
  }, []);

  return {
    calculateWPM,
    calculateAccuracy,
    calculateProgress,
  };
} 