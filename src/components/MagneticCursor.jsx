import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  '[role="button"]',
  'select',
  'textarea',
  'input:not([type="hidden"])',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'summary',
  'label',
  '[data-cursor="pointer"]',
].join(',');

const MagneticCursor = () => {
  const rootRef = useRef(null);
  const cursorRef = useRef(null);
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

    const root = rootRef.current;
    const cursor = cursorRef.current;

    if (!root || !cursor) {
      return undefined;
    }

    document.body.classList.add('custom-cursor-enabled');

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const smooth = { ...pointer };
    const easing = 0.15;

    const showGlow = () => {
      root.classList.add('cursor-visible');
    };

    const hideGlow = () => {
      root.classList.remove('cursor-visible');
    };

    const isInteractiveTarget = (target) => {
      if (!target?.closest) return false;
      const el = target.closest(INTERACTIVE_SELECTOR);
      if (!el) return false;
      if (el.getAttribute?.('aria-disabled') === 'true') return false;
      if (el.disabled) return false;
      return true;
    };

    const animate = () => {
      smooth.x += (pointer.x - smooth.x) * easing;
      smooth.y += (pointer.y - smooth.y) * easing;

      cursor.style.left = `${smooth.x}px`;
      cursor.style.top = `${smooth.y}px`;

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    const handlePointerMove = (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      root.dataset.mode = isInteractiveTarget(event.target) ? 'pointer' : 'cursor';
      showGlow();
    };

    const handlePointerLeaveViewport = () => {
      hideGlow();
    };

    const handlePointerDown = () => {
      root.classList.add('cursor-pressed');
    };

    const handlePointerUp = () => {
      root.classList.remove('cursor-pressed');
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerleave', handlePointerLeaveViewport);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      document.body.classList.remove('custom-cursor-enabled');
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeaveViewport);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const content = (
    <div ref={rootRef} className="neon-cursor" aria-hidden="true" data-mode="cursor">
      <div ref={cursorRef} className="cursor-icon-layer">
        <svg
          className="cursor-icon cursor-icon--cursor"
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cursorGrad" x1="10" y1="6" x2="34" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0EA5E9" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          <path
            d="M12 7.5L34.5 20.5L23.8 24.1L28.2 35.5L23.4 37.6L19 26.2L12 33.8V7.5Z"
            fill="url(#cursorGrad)"
          />
        </svg>

        <svg
          className="cursor-icon cursor-icon--pointer"
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="pointerGrad" x1="12" y1="6" x2="34" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0EA5E9" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          <path
            d="M19 9.5C19 8.1 20.1 7 21.5 7C22.9 7 24 8.1 24 9.5V21.5"
            stroke="url(#pointerGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M24 21.5V15.5C24 14.1 25.1 13 26.5 13C27.9 13 29 14.1 29 15.5V22.5"
            stroke="url(#pointerGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M29 22.5V17.5C29 16.1 30.1 15 31.5 15C32.9 15 34 16.1 34 17.5V27"
            stroke="url(#pointerGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19 21.5V18.5C19 17.1 17.9 16 16.5 16C15.1 16 14 17.1 14 18.5V27.5C14 33.3 18.7 38 24.5 38H27.5C32.2 38 36 34.2 36 29.5V27"
            stroke="url(#pointerGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(content, document.body);
};

export default MagneticCursor;
