import { useCallback, useEffect, useRef, useState } from "react";

export function useTimers({ limitSeconds = null, onLimitReached = null } = {}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef(null);
  const pausedAccumRef = useRef(0);
  const intervalRef = useRef(null);
  const limitReachedRef = useRef(false);
  const limitSecondsRef = useRef(limitSeconds);
  const onLimitReachedRef = useRef(onLimitReached);

  // Mantener refs actualizadas
  useEffect(() => {
    limitSecondsRef.current = limitSeconds;
  }, [limitSeconds]);

  useEffect(() => {
    onLimitReachedRef.current = onLimitReached;
  }, [onLimitReached]);

  const checkLimit = useCallback((elapsed) => {
    const limit = limitSecondsRef.current;
    if (limit !== null && limit > 0 && elapsed >= limit && !limitReachedRef.current) {
      limitReachedRef.current = true;
      onLimitReachedRef.current?.();
      return true;
    }
    return false;
  }, []);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    pausedAccumRef.current = 0;
    limitReachedRef.current = false;
    setElapsedSeconds(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current || Date.now()) - pausedAccumRef.current;
      const elapsedSec = Math.max(0, Math.floor(elapsed / 1000));
      setElapsedSeconds(elapsedSec);
      checkLimit(elapsedSec);
    }, 500);
  }, [checkLimit]);

  const pause = useCallback(() => {
    if (!startTimeRef.current) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current - pausedAccumRef.current;
    pausedAccumRef.current = elapsed;
  }, []);

  const resume = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current || Date.now()) - pausedAccumRef.current;
      const elapsedSec = Math.max(0, Math.floor(elapsed / 1000));
      setElapsedSeconds(elapsedSec);
      checkLimit(elapsedSec);
    }, 500);
  }, [checkLimit]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
    pausedAccumRef.current = 0;
    limitReachedRef.current = false;
    setElapsedSeconds(0);
  }, []);

  const formatTimer = useCallback(() => {
    const limit = limitSecondsRef.current;

    // Helper para formatear tiempo
    const formatTime = (secs) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = Math.floor(secs % 60);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    // Si hay límite, mostrar GRABADO - RESTANTE
    if (limit !== null && limit > 0) {
      const remaining = Math.max(0, limit - elapsedSeconds);
      return `${formatTime(elapsedSeconds)} - ${formatTime(remaining)}`;
    }

    // Sin límite, mostrar solo tiempo transcurrido
    return formatTime(elapsedSeconds);
  }, [elapsedSeconds]);

  const getRemainingSeconds = useCallback(() => {
    const limit = limitSecondsRef.current;
    if (limit === null || limit <= 0) return null;
    return Math.max(0, limit - elapsedSeconds);
  }, [elapsedSeconds]);

  useEffect(() => () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  return {
    elapsedSeconds,
    start,
    pause,
    resume,
    stop,
    formatTimer,
    getRemainingSeconds,
    hasLimit: limitSeconds !== null && limitSeconds > 0
  };
}
