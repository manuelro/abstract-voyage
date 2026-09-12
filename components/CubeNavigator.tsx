import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  CTA_BUTTON_MOTION_EASINGS,
  type CtaButtonMotionEasing,
} from './CtaButton/config/registered';
import styles from './CubeNavigator.module.css';

export type CubeNavigatorFaceId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type CubeNavigatorConfig = {
  perspectivePx: number;
  landedPerspectivePx: number;
  rotationPushBackPx: number;
  fillViewportEnabled: boolean;
  rotationDurationMs: number;
  rotationEasing: CtaButtonMotionEasing;
  settleDurationMs: number;
  settleEasing: CtaButtonMotionEasing;
  /** How many ms winddown is allowed to start before turning's own rotation
   * transition naturally ends — see CubeLabConfig's own doc comment
   * (cube-lab.config.ts) for the full rationale. 0 keeps windup -> turning
   * -> winddown strictly sequential. */
  settleOverlapMs: number;
};

export const CUBE_FACE_ROTATIONS: Record<CubeNavigatorFaceId, { x: number; y: number }> = {
  A: { x: 0, y: 0 },
  B: { x: 0, y: -90 },
  C: { x: 0, y: 180 },
  D: { x: 0, y: 90 },
  // E/F keep their physical top/bottom hinge geometry, while their content
  // planes are flipped to put the front side on the outside of the cuboid.
  // These parent angles bring those outward-facing planes to the camera.
  E: { x: -90, y: 0 },
  F: { x: 90, y: 0 },
};

export type CubeNavigatorPhase = 'idle' | 'windup' | 'turning' | 'winddown';

type CubeNavigatorProps = {
  config: CubeNavigatorConfig;
  rotation: { x: number; y: number };
  faces: Partial<Record<CubeNavigatorFaceId, ReactNode>>;
  faceWidth?: string;
  faceHeight?: string;
  viewportMode?: boolean;
  frozen?: boolean;
  frozenScrollY?: number;
  zIndex?: number;
  interactiveFace?: CubeNavigatorFaceId;
  onPhaseChange?: (phase: CubeNavigatorPhase) => void;
  onSettled?: () => void;
};

const FALLBACK_GRACE_MS = 200;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return reduced;
}

export function CubeNavigator({
  config,
  rotation,
  faces,
  faceWidth = config.fillViewportEnabled ? '100vw' : '20vw',
  faceHeight = config.fillViewportEnabled ? '100dvh' : '40vw',
  viewportMode = false,
  frozen = false,
  frozenScrollY = 0,
  zIndex,
  interactiveFace,
  onPhaseChange,
  onSettled,
}: CubeNavigatorProps) {
  const reducedMotion = useReducedMotion();
  const pushRef = useRef<HTMLDivElement | null>(null);
  const cuboidRef = useRef<HTMLDivElement | null>(null);
  const previousRotationRef = useRef(rotation);
  const latestRotationRef = useRef(rotation);
  const [phase, setPhase] = useState<CubeNavigatorPhase>('idle');
  const [appliedRotation, setAppliedRotation] = useState(rotation);

  latestRotationRef.current = rotation;

  const setSequencePhase = (next: CubeNavigatorPhase) => {
    setPhase(next);
    onPhaseChange?.(next);
  };

  useEffect(() => {
    const previous = previousRotationRef.current;
    if (previous.x === rotation.x && previous.y === rotation.y) return;
    previousRotationRef.current = rotation;
    setSequencePhase('windup');
  }, [rotation.x, rotation.y]);

  const turnDurationMs = reducedMotion ? 1 : config.rotationDurationMs;
  const settleDurationMs = reducedMotion ? 1 : config.settleDurationMs;

  useEffect(() => {
    if (phase !== 'windup') return undefined;
    const element = pushRef.current;
    let advanced = false;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      setAppliedRotation(latestRotationRef.current);
      setSequencePhase('turning');
    };
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === element && event.propertyName === 'transform') advance();
    };
    element?.addEventListener('transitionend', onTransitionEnd);
    const timer = window.setTimeout(advance, turnDurationMs + FALLBACK_GRACE_MS);
    return () => {
      element?.removeEventListener('transitionend', onTransitionEnd);
      window.clearTimeout(timer);
    };
  }, [phase, turnDurationMs]);

  // Winddown may be allowed to start before turning's own rotation
  // transition naturally ends (config.settleOverlapMs) — the rotation
  // itself is never cut short (its own CSS transition keeps running for the
  // full turnDurationMs regardless), only how early CubeNavigator flips
  // into 'winddown' and starts easing perspective/push-back back in moves
  // earlier, so that motion overlaps the tail of the still-finishing turn.
  // The overlap can never exceed the turn's own duration (Math.min), and
  // config.settleOverlapMs is itself already clamped against
  // rotationDurationMs/settleDurationMs at normalize time
  // (cube-lab.config.ts's own normalizeCubeLabConfig).
  const overlapMs = Math.min(config.settleOverlapMs, turnDurationMs);

  useEffect(() => {
    if (phase !== 'turning') return undefined;
    const element = cuboidRef.current;
    let advanced = false;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      setSequencePhase('winddown');
    };
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === element && event.propertyName === 'transform') advance();
    };
    element?.addEventListener('transitionend', onTransitionEnd);
    const timer = window.setTimeout(advance, Math.max(0, turnDurationMs - overlapMs) + FALLBACK_GRACE_MS);
    return () => {
      element?.removeEventListener('transitionend', onTransitionEnd);
      window.clearTimeout(timer);
    };
  }, [phase, turnDurationMs, overlapMs]);

  useEffect(() => {
    if (phase !== 'winddown') return undefined;
    const element = pushRef.current;
    let advanced = false;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      setSequencePhase('idle');
      onSettled?.();
    };
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === element && event.propertyName === 'transform') advance();
    };
    element?.addEventListener('transitionend', onTransitionEnd);
    const timer = window.setTimeout(advance, settleDurationMs + FALLBACK_GRACE_MS);
    return () => {
      element?.removeEventListener('transitionend', onTransitionEnd);
      window.clearTimeout(timer);
    };
  }, [phase, settleDurationMs, onSettled]);

  const sequenceActive = phase !== 'idle';
  const pushedBack = phase === 'windup' || phase === 'turning';
  const settling = phase === 'winddown';
  const pushDurationMs = settling ? settleDurationMs : turnDurationMs;
  const pushEasing = CTA_BUTTON_MOTION_EASINGS[
    settling ? config.settleEasing : config.rotationEasing
  ];
  const rotationEasing = CTA_BUTTON_MOTION_EASINGS[config.rotationEasing];
  const perspective = pushedBack ? config.perspectivePx : config.landedPerspectivePx;

  const isFaceE = appliedRotation.x === CUBE_FACE_ROTATIONS.E.x
    && appliedRotation.y === CUBE_FACE_ROTATIONS.E.y;
  const isFaceF = appliedRotation.x === CUBE_FACE_ROTATIONS.F.x
    && appliedRotation.y === CUBE_FACE_ROTATIONS.F.y;
  const recenterY = isFaceE
    ? 'calc((var(--cube-height) - var(--cube-width)) / 2)'
    : isFaceF
      ? 'calc((var(--cube-width) - var(--cube-height)) / 2)'
      : '0px';

  const hostStyle = {
    '--cube-width': faceWidth,
    '--cube-height': faceHeight,
    '--cube-perspective': `${perspective}px`,
    '--cube-pushback': `${pushedBack ? -config.rotationPushBackPx : 0}px`,
    '--cube-rotate-x': `${appliedRotation.x}deg`,
    '--cube-rotate-y': `${appliedRotation.y}deg`,
    '--cube-recenter-y': recenterY,
    '--cube-turn-duration': `${turnDurationMs}ms`,
    '--cube-turn-easing': rotationEasing,
    '--cube-push-duration': `${pushDurationMs}ms`,
    '--cube-push-easing': pushEasing,
    '--cube-scroll-offset': `${Math.max(0, frozenScrollY)}px`,
    zIndex,
  } as CSSProperties;

  return (
    <div
      className={styles.host}
      style={hostStyle}
      data-viewport-mode={viewportMode ? 'true' : 'false'}
      data-frozen={frozen ? 'true' : 'false'}
      data-sequence-active={sequenceActive ? 'true' : 'false'}
    >
      <div className={styles.stage}>
        <div ref={pushRef} className={styles.cuboidPush}>
          <div ref={cuboidRef} className={styles.cuboid}>
            <div
              className={`${styles.face} ${styles.faceA}`}
              data-capped={sequenceActive || frozen ? 'true' : 'false'}
              data-pointer-disabled={interactiveFace != null && interactiveFace !== 'A' ? 'true' : 'false'}
            >
              <div className={styles.faceAContent}>{faces.A}</div>
            </div>
            {faces.B != null ? (
              <div
                className={`${styles.face} ${styles.faceB}`}
                data-pointer-disabled={interactiveFace != null && interactiveFace !== 'B' ? 'true' : 'false'}
              >
                {faces.B}
              </div>
            ) : null}
            {faces.C != null ? (
              <div
                className={`${styles.face} ${styles.faceC}`}
                data-pointer-disabled={interactiveFace != null && interactiveFace !== 'C' ? 'true' : 'false'}
              >
                {faces.C}
              </div>
            ) : null}
            {faces.D != null ? (
              <div
                className={`${styles.face} ${styles.faceD}`}
                data-pointer-disabled={interactiveFace != null && interactiveFace !== 'D' ? 'true' : 'false'}
              >
                {faces.D}
              </div>
            ) : null}
            {faces.E != null ? (
              <div className={styles.faceEDepth}>
                <div className={styles.faceEHinge}>
                  <div
                    className={`${styles.face} ${styles.faceE}`}
                    data-pointer-disabled={interactiveFace != null && interactiveFace !== 'E' ? 'true' : 'false'}
                  >
                    {faces.E}
                  </div>
                </div>
              </div>
            ) : null}
            {faces.F != null ? (
              <div className={styles.faceFDepth}>
                <div className={styles.faceFHinge}>
                  <div
                    className={`${styles.face} ${styles.faceF}`}
                    data-pointer-disabled={interactiveFace != null && interactiveFace !== 'F' ? 'true' : 'false'}
                  >
                    {faces.F}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CubeNavigator;
