import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MotionValue } from 'motion/react';
import { PanelShell, DEFAULT_PANEL_SHELL_CONFIG, type PanelShellConfig } from '../../../../components/Panel';
import { resolveDepthPassPose, resolveGoldenOvalVisibility, type DepthPassGeometry, type DepthPassPose } from './CoverFlow.depthPass';

type PreviewCard = { index: number; actualIndex: number };
type Props = {
  geometry: DepthPassGeometry;
  farEdgePercent: number;
  position: MotionValue<number>;
  cards: PreviewCard[];
  cardHeight: number;
  reduceMotion: boolean;
};
type Projection = {
  q: number;
  visible: boolean;
  opacity: number;
  ovalX: number;
  ovalY: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
type PlanMap = {
  focusCenter: number;
  backCenter: number;
  backZ: number;
  depthRange: number;
  exitCenter: number;
  exitZ: number;
  radiusY: number;
  guide: Array<{ q: number; x: number; y: number; z: number }>;
};

const WIDTH = 500;
const CX = 244;
const CY = 125;
const RX = 179;
const MAX_VIEW_WIDTH = 452;
const MAX_VIEW_HEIGHT = 166;
const PREVIEW_SHELL_CONFIG: PanelShellConfig = {
  ...DEFAULT_PANEL_SHELL_CONFIG,
  backgroundColorMode: 'custom',
  backgroundColor: '#191c21',
  backgroundOriginalHueRetention: 1,
  backgroundPigmentIntensity: 1,
  darkBackgroundDarkenRatio: 0,
  backgroundOpacity: 1,
  borderWidthPx: 1,
  borderOpacity: 0.18,
  hideOnNarrowTouchDevices: false,
  dragEnabled: true,
};

function projectedCenterX(pose: DepthPassPose, geometry: DepthPassGeometry) {
  const scale = geometry.perspectivePx / (geometry.perspectivePx - pose.z);
  const origin = (geometry.perspectiveOriginXPercent / 100 - 0.5) * geometry.containerWidth;
  return geometry.containerWidth / 2 + origin + scale * (pose.x - origin);
}

function planPoint(
  q: number, pose: DepthPassPose, centerX: number,
  geometry: DepthPassGeometry, plan: PlanMap,
) {
  if (q < 0) {
    const travel = Math.max(0, Math.min(1,
      Math.abs(centerX - plan.focusCenter)
        / Math.max(1, Math.abs(plan.exitCenter - plan.focusCenter)),
    ));
    const depth = Math.max(0, Math.min(1, pose.z / Math.max(1, plan.exitZ)));
    return {
      x: CX + RX - geometry.waitingSign * 30 * travel,
      y: CY + 28 * depth,
    };
  }
  const progress = (plan.focusCenter - centerX)
    / (plan.focusCenter - plan.backCenter || 1);
  const baselineDepth = plan.backZ * progress;
  return {
    x: CX + RX - 2 * RX * progress,
    y: CY - plan.radiusY * (baselineDepth - pose.z) / plan.depthRange,
  };
}

function createPlanMap(geometry: DepthPassGeometry, reduceMotion: boolean): PlanMap {
  const reach = Math.max(1, geometry.ovalReachCards);
  const displayedPose = (q: number) => {
    const pose = resolveDepthPassPose(q, geometry);
    return reduceMotion ? { ...pose, z: 0 } : pose;
  };
  const focus = displayedPose(0);
  const back = displayedPose(reach);
  const exit = displayedPose(-1);
  const focusCenter = projectedCenterX(focus, geometry);
  const backCenter = projectedCenterX(back, geometry);
  const exitCenter = projectedCenterX(exit, geometry);
  const radiusY = Math.max(22, Math.min(75,
    RX * geometry.ovalDepthRadiusCards / geometry.ovalHorizontalRadiusCards,
  ));
  const samples = Array.from({ length: 65 }, (_, index) => {
    const q = reach * (1 - index / 64);
    const pose = displayedPose(q);
    const centerX = projectedCenterX(pose, geometry);
    const progress = (focusCenter - centerX) / (focusCenter - backCenter || 1);
    return { q, pose, centerX, difference: back.z * progress - pose.z };
  });
  const depthRange = Math.max(1, ...samples.map(sample => Math.abs(sample.difference)));
  const base = { focusCenter, backCenter, backZ: back.z, depthRange,
    exitCenter, exitZ: exit.z, radiusY, guide: [] };
  return {
    ...base,
    guide: samples.map(sample => ({
      q: sample.q,
      z: sample.pose.z,
      ...planPoint(sample.q, sample.pose, sample.centerX, geometry, base),
    })),
  };
}

/** Project exactly the pose and camera used by each rendered CoverFlow card. */
function projectCard(
  index: number, livePosition: number, geometry: DepthPassGeometry,
  cardHeight: number, reduceMotion: boolean, viewScale: number, viewX: number, viewTop: number,
  plan: PlanMap,
): Projection {
  const q = geometry.waitingSign * (index - livePosition);
  const resolvedPose = resolveDepthPassPose(q, geometry);
  const pose = reduceMotion ? { ...resolvedPose, z: 0 } : resolvedPose;
  const z = pose.z;
  const scale = geometry.perspectivePx / (geometry.perspectivePx - z);
  const originX = (geometry.perspectiveOriginXPercent / 100 - 0.5) * geometry.containerWidth;
  const originY = (geometry.perspectiveOriginYPercent / 100 - 0.5) * geometry.containerHeight;
  const centerX = geometry.containerWidth / 2 + originX + scale * (pose.x - originX);
  const centerY = geometry.containerHeight / 2 + originY + scale * (pose.y - originY);
  const width = geometry.cardWidth * scale;
  const height = cardHeight * scale;
  const left = centerX - width / 2;
  const top = centerY - height / 2;
  const planPosition = planPoint(q, pose, centerX, geometry, plan);
  const opacity = resolveGoldenOvalVisibility(q, geometry);
  return {
    q,
    opacity,
    visible: q > -1 && opacity > 0.001
      && left < geometry.containerWidth && left + width > 0
      && top < geometry.containerHeight && top + height > 0,
    ovalX: planPosition.x,
    ovalY: planPosition.y,
    x: viewX + left * viewScale,
    y: viewTop + top * viewScale,
    width: width * viewScale,
    height: height * viewScale,
  };
}

/** Smooth line passing through the current card vertices in travel order. */
function splineThrough(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return '';
  let path = 'M ' + points[0].x + ' ' + points[0].y;
  for (let index = 0; index < points.length - 1; index += 1) {
    const before = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const after = points[Math.min(points.length - 1, index + 2)];
    path += ' C '
      + (current.x + (next.x - before.x) / 6) + ' '
      + (current.y + (next.y - before.y) / 6) + ' '
      + (next.x - (after.x - current.x) / 6) + ' '
      + (next.y - (after.y - current.y) / 6) + ' '
      + next.x + ' ' + next.y;
  }
  return path;
}

/** Spread labels only when projected vertices crowd together; their dots
 * remain at the exact live positions. */
function numberLabelLayout(items: Array<{ card: PreviewCard; projection: Projection }>) {
  const visible = items.filter(item => item.projection.visible)
    .sort((a, b) => a.projection.ovalX - b.projection.ovalX);
  const labelY = new Map<number, number>();
  let crowded = false;
  for (let start = 0; start < visible.length;) {
    let end = start + 1;
    while (end < visible.length
      && visible[end].projection.ovalX - visible[end - 1].projection.ovalX < 20) end += 1;
    if (end - start > 1) crowded = true;
    const firstBaseline = end - start > 1
      ? Math.max(20 + (end - start - 1) * 16, visible[start].projection.ovalY - 13)
      : visible[start].projection.ovalY - 13;
    for (let index = start; index < end; index += 1) {
      labelY.set(visible[index].card.index,
        firstBaseline - (index - start) * 16);
    }
    start = end;
  }
  return { labelY, crowded };
}

/** The inspector subscribes to the card MotionValue; it never samples a
 * separate animation or re-renders React on every frame. */
export function OvalGeometryPreview({
  geometry, farEdgePercent, position, cards, cardHeight, reduceMotion,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const clipId = 'oval-inspector-clip-' + useId().replace(/:/g, '');
  const markerRefs = useRef(new Map<number, SVGGElement>());
  const cardRefs = useRef(new Map<number, SVGRectElement>());
  const splineRef = useRef<SVGPathElement | null>(null);
  const backLabelRef = useRef<SVGTextElement | null>(null);
  const backLeaderRef = useRef<SVGPathElement | null>(null);
  const positionLabelRef = useRef<SVGTextElement | null>(null);
  const plan = useMemo(() => createPlanMap(geometry, reduceMotion), [geometry, reduceMotion]);
  const fullArch = geometry.ovalDistributionMode === 'full-arch';
  const cameraX = Math.max(460, Math.min(468,
    460 + (geometry.perspectiveOriginXPercent - 85) * 8 / 55,
  ));
  const viewScale = Math.min(
    MAX_VIEW_WIDTH / Math.max(1, geometry.containerWidth),
    MAX_VIEW_HEIGHT / Math.max(1, geometry.containerHeight),
  );
  const viewWidth = geometry.containerWidth * viewScale;
  const viewHeight = geometry.containerHeight * viewScale;
  const viewX = (WIDTH - viewWidth) / 2;
  const viewTop = Math.max(225, CY + plan.radiusY * 1.35 + 68);
  const expandedHeight = viewTop + viewHeight + 38;
  const arcPath = splineThrough(plan.guide);
  const backPoint = plan.guide[0];
  const focusPoint = plan.guide[plan.guide.length - 1];
  const deepestPoint = reduceMotion
    ? plan.guide[Math.floor(plan.guide.length / 2)]
    : plan.guide.reduce((deepest, point) => (
      point.z < deepest.z ? point : deepest
    ), plan.guide[0]);
  const initialPosition = position.get();
  const initial = cards.map(card => ({
    card,
    projection: projectCard(card.index, initialPosition, geometry, cardHeight,
      reduceMotion, viewScale, viewX, viewTop, plan),
  }));
  const initialLabels = numberLabelLayout(initial);
  const backLabelShift = deepestPoint.x > CX + RX - 70 ? -40 : 40;

  useEffect(() => {
    if (collapsed) return undefined;
    const update = (livePosition: number) => {
      const splinePoints: Array<{ x: number; y: number; q: number }> = [];
      const projectedCards: Array<{ card: PreviewCard; projection: Projection }> = [];
      for (const card of cards) {
        const projected = projectCard(card.index, livePosition, geometry,
          cardHeight, reduceMotion, viewScale, viewX, viewTop, plan);
        projectedCards.push({ card, projection: projected });
        const marker = markerRefs.current.get(card.index);
        const rectangle = cardRefs.current.get(card.index);
        if (marker) {
          marker.style.display = projected.visible ? '' : 'none';
          marker.style.opacity = String(projected.opacity);
          marker.setAttribute('transform', 'translate(' + projected.ovalX + ' ' + projected.ovalY + ')');
          marker.setAttribute('data-live-q', String(projected.q));
          marker.firstElementChild?.setAttribute('fill', projected.q >= 0 && projected.q < 0.5
            ? '#83b9ff' : '#ffc47c');
        }
        if (rectangle) {
          rectangle.style.display = projected.visible ? '' : 'none';
          rectangle.style.opacity = String(projected.opacity);
          rectangle.setAttribute('x', String(projected.x));
          rectangle.setAttribute('y', String(projected.y));
          rectangle.setAttribute('width', String(projected.width));
          rectangle.setAttribute('height', String(projected.height));
          rectangle.setAttribute('data-live-q', String(projected.q));
          rectangle.setAttribute('fill', projected.q >= 0 && projected.q < 0.5
            ? '#83b9ff' : '#a4b3c9');
          rectangle.setAttribute('fill-opacity', projected.q >= 0 && projected.q < 0.5
            ? '0.8' : '0.4');
          rectangle.setAttribute('stroke', projected.q >= 0 && projected.q < 0.5
            ? '#cee4ff' : '#d2deef');
        }
        if (projected.visible) splinePoints.push({
          x: projected.ovalX, y: projected.ovalY, q: projected.q,
        });
      }
      const labels = numberLabelLayout(projectedCards);
      for (const card of cards) {
        const marker = markerRefs.current.get(card.index);
        const point = projectedCards.find(item => item.card.index === card.index)?.projection;
        if (!point) continue;
        const relativeY = (labels.labelY.get(card.index) ?? point.ovalY - 13) - point.ovalY;
        marker?.querySelector('text')?.setAttribute('y', String(relativeY));
        const leader = marker?.querySelector('[data-number-leader]');
        leader?.setAttribute('y2', String(relativeY - 3));
        if (leader instanceof SVGLineElement) leader.style.display = relativeY < -15 ? '' : 'none';
      }
      const backX = deepestPoint.x + (labels.crowded ? backLabelShift : 0);
      backLabelRef.current?.setAttribute('x', String(backX));
      backLeaderRef.current?.setAttribute('d', labels.crowded
        ? `M ${deepestPoint.x} ${deepestPoint.y - 7} L ${backX} ${deepestPoint.y - 23}` : '');
      splinePoints.sort((a, b) => b.q - a.q);
      splineRef.current?.setAttribute('d', splineThrough(splinePoints));
      if (positionLabelRef.current) {
        positionLabelRef.current.textContent = 'LIVE POSITION ' + livePosition.toFixed(2);
      }
    };
    update(position.get());
    return position.on('change', update);
  }, [cards, cardHeight, collapsed, geometry, plan, position, reduceMotion,
    viewScale, viewX, viewTop, deepestPoint.x, deepestPoint.y, backLabelShift]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <PanelShell
      title="MOTION PATH PREVIEW"
      launcherLabel="MOTION PATH PREVIEW"
      isOpen={!collapsed}
      onToggle={() => setCollapsed(value => !value)}
      headerActions={<span style={{ font: '500 10px/1 var(--panel-font)',
        letterSpacing: '0.12em', color: '#91e4c8' }}>LIVE</span>}
      appearance="dark"
      backgroundColor="#191c21"
      foregroundColor="#f4f7fb"
      config={PREVIEW_SHELL_CONFIG}
      positionStorageKey="motion-path-preview-position"
      expandedWidthPx={552}
      collapsedWidthPx={220}
      horizontalAnchor="left"
      zIndex={10000}
      dismissible={false}
    >
      <div data-cover-flow-oval-preview="true" data-collapsed={collapsed}
        data-visible-reach={geometry.ovalGoldenPath?.visibleReach}
        style={{ width: WIDTH, maxWidth: '100%' }}>
      <svg width={WIDTH} height={expandedHeight}
        viewBox={'0 0 ' + WIDTH + ' ' + expandedHeight}
        role="img" aria-label="Live card motion path, camera point of view, and projected card positions"
        style={{ display: 'block', maxWidth: '100%', fontFamily: 'var(--panel-font)' }}>
        <defs>
          <clipPath id={clipId}>
            <rect x={viewX} y={viewTop} width={viewWidth} height={viewHeight} />
          </clipPath>
        </defs>
        <path d={arcPath + ' Z'}
          fill="#54d9ad" opacity="0.12" />
        <path d={arcPath + ' C ' + (CX + RX) + ' ' + (CY + plan.radiusY * 1.8)
          + ' ' + (CX - RX) + ' ' + (CY + plan.radiusY * 1.8)
          + ' ' + backPoint.x + ' ' + backPoint.y + ' Z'}
          fill="none" stroke="#4c94a9" strokeWidth="2" />
        <path d={arcPath} fill="none" stroke="#62ddb4" strokeWidth="3" strokeLinecap="round" />
        <path ref={splineRef} data-inspector-live-spline="true"
          d={splineThrough(initial.filter(({ projection }) => projection.visible)
            .sort((a, b) => b.projection.q - a.projection.q)
            .map(({ projection }) => ({ x: projection.ovalX, y: projection.ovalY })))}
          fill="none" stroke="#ffdc91" strokeWidth="1.5" strokeOpacity="0.9" />
        <text x={backPoint.x} y={CY + 27} textAnchor="middle" fill="#f3f5f9" fontSize="11" fontWeight="700">A</text>
        <path ref={backLeaderRef}
          d={initialLabels.crowded
            ? `M ${deepestPoint.x} ${deepestPoint.y - 7} L ${deepestPoint.x + backLabelShift} ${deepestPoint.y - 23}` : ''}
          fill="none" stroke="#f3f5f9" strokeOpacity="0.48" strokeWidth="0.8" />
        <text ref={backLabelRef}
          x={deepestPoint.x + (initialLabels.crowded ? backLabelShift : 0)}
          y={deepestPoint.y - 29} textAnchor="middle" fill="#f3f5f9" fontSize="11" fontWeight="700">B</text>
        <text x={focusPoint.x} y={CY + 27} textAnchor="middle" fill="#f3f5f9" fontSize="11" fontWeight="700">C</text>
        <text x="244" y={viewTop - 52} textAnchor="middle" fill="#a7b7c6" fontSize="10" fontWeight="600">
          {fullArch ? 'VISIBLE AREA A→B→C' : 'VISIBLE AREA B→C'}
        </text>
        {initial.map(({ card, projection }) => <g key={card.index}
          data-inspector-vertex={card.index}
          ref={element => {
            if (element) markerRefs.current.set(card.index, element);
            else markerRefs.current.delete(card.index);
          }}
          transform={'translate(' + projection.ovalX + ' ' + projection.ovalY + ')'}
          style={{ display: projection.visible ? undefined : 'none', opacity: projection.opacity }}>
          <circle r="5" fill={projection.q >= 0 && projection.q < 0.5 ? '#83b9ff' : '#ffc47c'}
            stroke="#191c21" strokeWidth="1.5" />
          <line data-number-leader="true" x1="0" y1="-7" x2="0"
            y2={(initialLabels.labelY.get(card.index) ?? projection.ovalY - 13) - projection.ovalY - 3}
            stroke="#c8d6e5" strokeOpacity="0.55" strokeWidth="0.8"
            style={{ display: (initialLabels.labelY.get(card.index) ?? projection.ovalY - 13) - projection.ovalY < -15 ? undefined : 'none' }} />
          <text y={(initialLabels.labelY.get(card.index) ?? projection.ovalY - 13) - projection.ovalY}
            textAnchor="middle" fill="#f4f7fb" fontSize="10" fontWeight="700">
            {card.actualIndex + 1}
          </text>
        </g>)}
        <g transform={'translate(' + cameraX + ' ' + (CY + 1) + ')'}
          fill="none" stroke="#83b9ff" strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round">
          <path d="M 6 -6 L 0 -10 L 0 5 L 6 1" />
          <rect x="6" y="-9" width="18" height="13" rx="2" />
          <path d="M -7 -3 H -19 M -19 -3 L -14 -7 M -19 -3 L -14 1" />
        </g>
        <text x={cameraX + 12} y={CY + 36} fill="#a9d2ff" fontSize="10" fontWeight="700"
          textAnchor="middle">POV</text>
        <text x="24" y={viewTop - 17} fill="#f3f5f9" fontSize="11" fontWeight="600"
          letterSpacing="0.4">PROJECTED CARDS</text>
        <text ref={positionLabelRef} x="476" y={viewTop - 17} fill="#a7b7c6"
          fontSize="10" textAnchor="end">LIVE POSITION {initialPosition.toFixed(2)}</text>
        <rect data-inspector-viewport="true" x={viewX} y={viewTop}
          width={viewWidth} height={viewHeight} rx="5" fill="#252c35" stroke="#627386" />
        <g clipPath={'url(#' + clipId + ')'}>
          {initial.map(({ card, projection }) => <rect key={card.index}
            data-oval-preview-card={card.index}
            ref={element => {
              if (element) cardRefs.current.set(card.index, element);
              else cardRefs.current.delete(card.index);
            }}
            x={projection.x} y={projection.y}
            width={projection.width} height={projection.height} rx="2"
            style={{ display: projection.visible ? undefined : 'none', opacity: projection.opacity }}
            fill={projection.q >= 0 && projection.q < 0.5 ? '#83b9ff' : '#a4b3c9'}
            fillOpacity={projection.q >= 0 && projection.q < 0.5 ? 0.8 : 0.4}
            stroke={projection.q >= 0 && projection.q < 0.5 ? '#cee4ff' : '#d2deef'}
            strokeWidth="0.7" />)}
        </g>
        <text x="24" y={viewTop + viewHeight + 16} fill="#a7b7c6"
          fontSize="10">Same X / Y / scale / clip as CoverFlow</text>
        <text x="476" y={viewTop + viewHeight + 30}
          fill="#a7b7c6" fontSize="10" textAnchor="end">
          {geometry.ovalGoldenPath
            ? `visible ${geometry.ovalGoldenPath.visibleReach}/${Math.floor(geometry.ovalReachCards)} waiting · far edge ${farEdgePercent}%`
            : `far edge ${farEdgePercent}%`}
        </text>
      </svg>
      </div>
    </PanelShell>, document.body,
  );
}
