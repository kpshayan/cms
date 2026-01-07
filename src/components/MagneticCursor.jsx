import { useEffect, useRef } from 'react';

const MagneticCursor = () => {
  const glowRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

    if (!hasFinePointer || prefersReducedMotion) {
      return undefined;
    }

    const glow = glowRef.current;

    if (!glow) {
      return undefined;
    }

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const smooth = { ...pointer };
    const easing = 0.15;

    const showGlow = () => {
      glow.classList.add('cursor-visible');
    };

    const hideGlow = () => {
      glow.classList.remove('cursor-visible');
    };

    const animate = () => {
      smooth.x += (pointer.x - smooth.x) * easing;
      smooth.y += (pointer.y - smooth.y) * easing;

      glow.style.left = `${smooth.x}px`;
      glow.style.top = `${smooth.y}px`;

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    const handlePointerMove = (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      showGlow();
    };

    const handlePointerLeaveViewport = () => {
      hideGlow();
    };

    const handlePointerDown = () => {
      glow.classList.add('cursor-glow--pressed');
    };

    const handlePointerUp = () => {
      glow.classList.remove('cursor-glow--pressed');
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerleave', handlePointerLeaveViewport);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeaveViewport);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  return (
    <div className="neon-cursor" aria-hidden="true">
      <div ref={glowRef} className="cursor-glow" />
    </div>
  );
};

export default MagneticCursor;
