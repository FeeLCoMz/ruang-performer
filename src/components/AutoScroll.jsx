import React, { useState, useEffect, useRef } from 'react';

const AutoScroll = ({ isActive, speed = 1, scrollRef }) => {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isActive && scrollRef?.current) {
      // Semakin kecil speed, interval semakin besar (lebih lambat)
      // speed: 1 = 50ms, 0.5 = 100ms, 0.2 = 250ms, 0.1 = 500ms
      const minSpeed = 0.1;
      const pxPerStep = 1;
      const actualSpeed = Math.max(minSpeed, speed);
      const interval = Math.round(50 / actualSpeed); // Semakin kecil speed, interval makin besar
      intervalRef.current = setInterval(() => {
        scrollRef.current.scrollBy({
          top: pxPerStep,
          behavior: 'auto'
        });
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, speed, scrollRef]);

  return null;
};

export default AutoScroll;
