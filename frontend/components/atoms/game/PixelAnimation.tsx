"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { AnimDef } from "@/lib/animationManager";
import { frameUrl } from "@/lib/animationManager";

type PixelAnimationProps = {
  anim: AnimDef;
  size?: number;
  onComplete: () => void;
};

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject();
    img.src = url;
  });
}

export default function PixelAnimation({ anim, size = 160, onComplete }: PixelAnimationProps) {
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setFrame(0);
    setReady(false);
    stop();

    const urls: string[] = [];
    for (let i = 0; i < anim.frames; i++) {
      urls.push(frameUrl(anim, i));
    }

    Promise.allSettled(urls.map(preloadImage)).then(() => {
      if (mountedRef.current) {
        setReady(true);
      }
    });

    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [anim]);

  useEffect(() => {
    if (!ready) return;

    const ms = anim.frameMs ?? 66;
    intervalRef.current = setInterval(() => {
      setFrame((prev) => {
        const next = prev + 1;
        if (next >= anim.frames) {
          stop();
          timeoutRef.current = setTimeout(() => onCompleteRef.current(), ms);
          return prev;
        }
        return next;
      });
    }, ms);

    return () => {
      stop();
    };
  }, [ready]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      {ready && (
        <img
          src={frameUrl(anim, frame)}
          alt=""
          width={size}
          height={size}
          style={{ imageRendering: "pixelated" }}
        />
      )}
    </div>
  );
}
