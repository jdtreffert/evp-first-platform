import { useEffect, useState } from "react";

/**
 * The width of an element in pixels, kept up to date as it is resized. Attach `ref` to the element; the width is
 * 0 until it has been measured, so a caller can draw a default meanwhile.
 */
export function useElementWidth(): { ref: (element: HTMLElement | null) => void; width: number } {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!element) return;
    // The observer reports the size once it starts watching, and again on every change.
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { ref: setElement, width };
}
