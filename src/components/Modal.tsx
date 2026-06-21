import { useEffect, useRef } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '../lib/motion';

export interface ModalProps { onClose: () => void; children: ReactNode; maxWidth?: number; ariaLabel: string; }

export function Modal({ onClose, children, maxWidth = 1100, ariaLabel }: ModalProps): JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      prevActive?.focus();
    };
  }, [onClose]);

  // Entrance choreography: overlay fade + card scale/y, back.out easing for snap.
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const tl = gsap.timeline();
    tl.from(modalRef.current, { opacity: 0, duration: 0.25, ease: 'power2.out' });
    tl.from(cardRef.current, { scale: 0.96, y: 24, opacity: 0, duration: 0.5, ease: 'back.out(1.2)' }, '-=0.15');
  }, { scope: modalRef });

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'var(--bg-overlay)',
    zIndex: 100,
    overflowY: 'auto',
    padding: '24px 0',
  };
  const cardStyle: CSSProperties = {
    background: 'var(--bg-base)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-card)',
    maxWidth,
    margin: '0 auto',
    minHeight: 'min-content',
  };
  return (
    <div
      aria-label={ariaLabel}
      aria-modal="true"
      onClick={onClose}
      ref={modalRef}
      role="dialog"
      style={overlayStyle}
      tabIndex={-1}
    >
      <div ref={cardRef} onClick={(event) => { event.stopPropagation(); }} style={cardStyle}>
        {children}
      </div>
    </div>
  );
}
