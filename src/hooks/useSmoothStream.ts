 
import { useState, useEffect, useRef } from 'react';

export function useSmoothStream(text: string, isStreaming: boolean, speed = 15) {
  const [displayedText, setDisplayedText] = useState(text);
  const textRef = useRef(text);
  const displayedRef = useRef(displayedText);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(textRef.current);
      displayedRef.current = textRef.current;
      return;
    }

    let animationFrameId: number;
    let lastTime = performance.now();

    const updateText = (time: number) => {
      const delta = time - lastTime;
      
      // Dynamic speed based on text length to prevent lag
      // If text is very long, we update less frequently but with larger chunks
      const targetLen = textRef.current.length;
      const dynamicSpeed = targetLen > 1000 ? 50 : targetLen > 500 ? 30 : speed;

      if (delta > dynamicSpeed) {
        const currentLen = displayedRef.current.length;
        
        if (currentLen < targetLen) {
          const diff = targetLen - currentLen;
          // Speed up if far behind or if text is very long
          const baseChunk = targetLen > 1000 ? 10 : targetLen > 500 ? 5 : 1;
          const charsToAdd = Math.max(baseChunk, Math.floor(diff / 3)); 
          
          displayedRef.current = textRef.current.substring(0, currentLen + charsToAdd);
          setDisplayedText(displayedRef.current);
          lastTime = time;
        } else if (currentLen > targetLen) {
           // Handle case where text is truncated or reset
           displayedRef.current = textRef.current;
           setDisplayedText(displayedRef.current);
        }
      }
      animationFrameId = requestAnimationFrame(updateText);
    };

    animationFrameId = requestAnimationFrame(updateText);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isStreaming, speed]);

  return displayedText;
}
