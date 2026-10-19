/** Desktop depth path. All values are measured once per geometry/config change;
 * the pure resolver is safe to call from MotionValue transforms during a drag. */
export type DepthPassGeometry = {
  pathMode: 'depth-pass' | 'oval-pass';
  containerWidth: number;
  containerHeight: number;
  cardWidth: number;
  landingX: number;
  centerGap: number;
  stackSpacing: number;
  stackSpacingGrowthPercent: number;
  includesFirstNeighbor: boolean;
  depthPx: number;
  depthIncrementPercent: number;
  perspectivePx: number;
  perspectiveOriginXPercent: number;
  perspectiveOriginYPercent: number;
  waitingSign: -1 | 1;
  spacingPercent: number;
  waitingShiftPx: number;
  ovalConvergencePercent: number;
  ovalHorizontalRadiusCards: number;
  ovalDepthRadiusCards: number;
  ovalViewAngleDeg: number;
  ovalFocusAngleDeg: number;
  ovalBackAngleDeg: number;
  ovalExitAngleDeg: number;
  ovalReachCards: number;
  ovalDistributionMode: 'quarter' | 'full-arch';
  ovalBackDepthCards: number;
  ovalArchDepthCards: number;
  ovalArchSkew: number;
  ovalDepthMinimumPositionPercent?: number;
  ovalFirstNeighborGapPercent: number;
  ovalArcSpacingBend: number;
  ovalGoldenRhythmEnabled?: boolean;
  ovalGoldenSizeStep?: number;
  ovalGoldenSpacingStep?: number;
  ovalGoldenPath?: {
    centers: readonly number[];
    slopes: readonly number[];
    visibleReach: number;
    lastOpacity: number;
    widths: readonly number[];
    gaps: readonly number[];
  };
  ovalMinWaitingGapPx?: number;
  ovalMinActiveGapPx?: number;
  ovalHorizontalStretch: number;
  ovalFarEdgePercent: number;
  ovalDepthEase: number;
  ovalSpacingPower: number;
  yawDeg: number;
  yawMaxDeg: number;
  yawSpreadDepth: number;
  maxProjectedWidthRatio: number;
  arcBendPercent: number;
  arcReachCards: number;
  arcDropPx: number;
  verticalOffsetPx: number;
  exitScale: number;
  exitClearancePercent: number;
};

export type DepthPassPose = { x: number; y: number; z: number; rotateY: number };

/** WebKit can paint descendants of an off-axis 3D plane at their unprojected
 * size even though layout and hit testing use the projected bounds. Apply the
 * same camera projection to a 2D plane and keep its yaw local to that plane. */
export function resolveDepthPassWebKitTransform(pose: DepthPassPose, geometry: DepthPassGeometry) {
  const distance = geometry.perspectivePx - pose.z;
  const scale = geometry.perspectivePx / distance;
  const originX = (geometry.perspectiveOriginXPercent / 100 - 0.5) * geometry.containerWidth;
  const originY = (geometry.perspectiveOriginYPercent / 100 - 0.5) * geometry.containerHeight;
  const x = originX + scale * (pose.x - originX);
  const y = originY + scale * (pose.y - originY);
  // Local perspective keeps WebKit's paint inside its hit box. Compensate
  // for the off-axis camera position so its visible width still matches the
  // capped 3D projection used by the other engines and the panel control.
  const yaw = pose.rotateY * Math.PI / 180;
  const widthCorrection = 1 - (pose.x - originX) * Math.tan(yaw) / distance;
  return `translate3d(${x}px, ${y}px, 0) scale(${scale}) scaleX(${widthCorrection}) perspective(${distance}px) rotateY(${pose.rotateY}deg)`;
}

const saturate = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => {
  const t = saturate(value);
  return t * t * (3 - 2 * t);
};
// Reaches the full stack translation with zero slope at the first settled
// plane, while its bounded 7/6 starting slope avoids a mid-drag reversal.
const waitingJoin = (value: number) => {
  const t = saturate(value);
  return (7 * t - t ** 7) / 6;
};
const hermite = (t: number, a: number, b: number, da: number, db: number) => (
  (2 * t ** 3 - 3 * t ** 2 + 1) * a
  + (t ** 3 - 2 * t ** 2 + t) * da
  + (-2 * t ** 3 + 3 * t ** 2) * b
  + (t ** 3 - t ** 2) * db
);

/** Quarter mode's ellipse lives in a horizontal world plane. The fixed oblique view
 * rotates its coordinates into the CoverFlow camera's X/Z axes; the cards
 * themselves remain parallel to the image plane throughout the passage. */
function ovalPointAtAngle(angle: number, geometry: DepthPassGeometry) {
  const view = geometry.ovalViewAngleDeg * Math.PI / 180;
  const horizontal = geometry.cardWidth * geometry.ovalHorizontalRadiusCards;
  const depth = geometry.cardWidth * geometry.ovalDepthRadiusCards;
  const worldX = horizontal * Math.cos(angle);
  const worldZ = depth * Math.sin(angle);
  return {
    x: Math.sin(view) * worldX - Math.cos(view) * worldZ,
    z: Math.cos(view) * worldX + Math.sin(view) * worldZ,
  };
}

export function resolveOvalAngleDeg(q: number, geometry: DepthPassGeometry) {
  if (geometry.ovalDistributionMode === 'full-arch') {
    const pose = resolveFullOvalArchPose(q, geometry);
    const scale = geometry.perspectivePx / (geometry.perspectivePx - pose.z);
    const origin = (geometry.perspectiveOriginXPercent / 100 - 0.5) * geometry.containerWidth;
    const center = geometry.containerWidth / 2 + origin + scale * (pose.x - origin);
    const focusCenter = geometry.containerWidth / 2 + geometry.landingX;
    const backScale = geometry.perspectivePx
      / (geometry.perspectivePx + geometry.cardWidth * geometry.ovalBackDepthCards);
    const backCenter = geometry.containerWidth * geometry.ovalFarEdgePercent / 100
      + geometry.cardWidth * backScale / 2;
    const phase = (focusCenter - center) / (focusCenter - backCenter || 1);
    return geometry.ovalFocusAngleDeg
      + (geometry.ovalBackAngleDeg - geometry.ovalFocusAngleDeg)
      * phase;
  }
  if (q < 0) return resolveQuarterOvalExitAngle(q, geometry) * 180 / Math.PI;
  const focus = geometry.ovalFocusAngleDeg * Math.PI / 180;
  const sweep = (geometry.ovalBackAngleDeg - geometry.ovalFocusAngleDeg) * Math.PI / 180;
  const reach = Math.max(1, geometry.ovalReachCards);
  const power = geometry.ovalSpacingPower;
  const exponential = Math.exp(-power * q / reach);
  const denominator = 1 - Math.exp(-power);
  const angle = focus + sweep * (Math.abs(power) < 0.0001
    ? q / reach : (1 - exponential) / denominator);
  return angle * 180 / Math.PI;
}

function resolveQuarterOvalExitAngle(q: number, geometry: DepthPassGeometry) {
  const t = saturate(-q);
  const focusAngle = geometry.ovalFocusAngleDeg * Math.PI / 180;
  const exitAngle = Math.min(geometry.ovalExitAngleDeg, geometry.ovalFocusAngleDeg - 1) * Math.PI / 180;
  const power = geometry.ovalSpacingPower;
  const waitingStep = (geometry.ovalBackAngleDeg - geometry.ovalFocusAngleDeg)
    * Math.PI / 180 * (Math.abs(power) < 0.0001
      ? 1 / Math.max(1, geometry.ovalReachCards)
      : power / (Math.max(1, geometry.ovalReachCards) * (1 - Math.exp(-power))));
  return focusAngle - hermite(t, 0, focusAngle - exitAngle, waitingStep, 0);
}

function ovalPoint(q: number, geometry: DepthPassGeometry) {
  const angle = resolveOvalAngleDeg(q, geometry) * Math.PI / 180;
  return ovalPointAtAngle(angle, geometry);
}

/** Stretch the camera-space X component of the same oval until the last
 * waiting card reaches an authored viewport edge. Unlike a fixed radius in
 * card widths, this continues to fill wider desktop viewports. Z and the
 * projected card sizes stay unchanged. The first-neighbor overlap is solved
 * afterward, so focus spacing remains independent of the far edge. */
export function resolveOvalHorizontalStretch(geometry: DepthPassGeometry, farEdgePercent: number) {
  if (geometry.ovalDistributionMode === 'full-arch') return 1;
  const farPose = resolveOvalPose(geometry.ovalReachCards, { ...geometry, ovalHorizontalStretch: 1 });
  const deltaX = farPose.x - geometry.landingX;
  if (Math.abs(deltaX) < 0.001 || geometry.containerWidth <= 0) return 1;
  const scale = geometry.perspectivePx / (geometry.perspectivePx - farPose.z);
  const origin = (geometry.perspectiveOriginXPercent / 100 - 0.5) * geometry.containerWidth;
  const baseLeft = geometry.containerWidth / 2 + origin
    + scale * (geometry.landingX - geometry.cardWidth / 2 - origin);
  const targetLeft = geometry.containerWidth * farEdgePercent / 100;
  return Math.max(0.25, Math.min(4, (targetLeft - baseLeft) / (scale * deltaX)));
}

/** Keep the side-view oval's endpoints, but shape its camera-depth contour.
 * An ellipse alone recedes too slowly beside C and too quickly beside B,
 * flattening the projected card-edge arch. The exponential has a finite
 * derivative at focus; its linear continuation lets an exiting card keep the
 * same velocity at the join. Every card still follows one 3D curve. */
function ovalCameraDepth(
  pointZ: number, focusZ: number, backZ: number,
  geometry: DepthPassGeometry, fallbackProgress: number,
) {
  const rawSpan = focusZ - backZ;
  const span = rawSpan > 0 ? rawSpan : Math.max(1, geometry.cardWidth * geometry.ovalDepthRadiusCards);
  const progress = rawSpan > 0 ? (focusZ - pointZ) / rawSpan : fallbackProgress;
  const easing = geometry.ovalDepthEase;
  const denominator = 1 - Math.exp(-easing);
  const eased = easing < 0.0001 ? progress : progress < 0
    ? progress * easing / denominator
    : (1 - Math.exp(-easing * progress)) / denominator;
  // The foreground card is clipped before it reaches the camera plane.
  return Math.min(geometry.perspectivePx * 0.75, -span * eased);
}

/** Match the authored first-card edge gap by changing angular spacing on
 * the ellipse itself. All waiting poses therefore remain on one curve. */
export function resolveOvalSpacingPower(geometry: DepthPassGeometry, gapPercent: number) {
  const origin = (geometry.perspectiveOriginXPercent / 100 - 0.5) * geometry.containerWidth;
  const focusEdge = geometry.landingX + geometry.waitingSign * geometry.cardWidth / 2;
  const localEdge = -geometry.waitingSign * geometry.cardWidth / 2;
  const target = geometry.cardWidth * gapPercent / 100;
  const gapAt = (power: number) => {
    const pose = resolveOvalPose(1, { ...geometry, ovalSpacingPower: power });
    const scale = geometry.perspectivePx / (geometry.perspectivePx - pose.z);
    const edge = origin + scale * (pose.x + localEdge - origin);
    return geometry.waitingSign * (edge - focusEdge);
  };
  let low = -8;
  let high = 12;
  let lowDifference = gapAt(low) - target;
  const highDifference = gapAt(high) - target;
  if (lowDifference * highDifference > 0) {
    return Math.abs(lowDifference) <= Math.abs(highDifference) ? low : high;
  }
  for (let iteration = 0; iteration < 22; iteration += 1) {
    const middle = (low + high) / 2;
    const difference = gapAt(middle) - target;
    if (difference * lowDifference > 0) {
      low = middle;
      lowDifference = difference;
    } else high = middle;
  }
  return (low + high) / 2;
}

function resolveOvalPose(q: number, geometry: DepthPassGeometry): DepthPassPose {
  if (geometry.ovalDistributionMode === 'full-arch') return resolveFullOvalArchPose(q, geometry);
  const focus = ovalPoint(0, geometry);
  const back = ovalPoint(geometry.ovalReachCards, geometry);
  if (q >= 0) {
    const point = ovalPoint(q, geometry);
    const arcPosition = q / Math.max(1, geometry.ovalReachCards);
    const arcDrop = 2 * arcPosition ** 3 / (1 + arcPosition ** 3);
    const z = ovalCameraDepth(point.z, focus.z, back.z, geometry, q / Math.max(1, geometry.ovalReachCards));
    return {
      x: geometry.landingX - geometry.waitingSign * geometry.ovalHorizontalStretch * (point.x - focus.x),
      // Keep the projected centerline level when moving the oval vertically.
      // A constant world-space Y projects less on the distant cards and
      // unintentionally flattens the visible top/bottom arch.
      y: geometry.verticalOffsetPx * (geometry.perspectivePx - z) / geometry.perspectivePx
        + geometry.arcDropPx * arcDrop,
      z,
      rotateY: 0,
    };
  }

  // Depart on the same ellipse tangent used by the incoming waiting path.
  // The larger terminal sweep reaches the ellipse's near/right side within
  // one card traversal, with zero angular velocity at the clipped endpoint.
  const angle = resolveQuarterOvalExitAngle(q, geometry);
  const point = ovalPointAtAngle(angle, geometry);
  const z = ovalCameraDepth(point.z, focus.z, back.z, geometry, q / Math.max(1, geometry.ovalReachCards));
  return {
    x: geometry.landingX - geometry.waitingSign * geometry.ovalHorizontalStretch * (point.x - focus.x),
    y: geometry.verticalOffsetPx * (geometry.perspectivePx - z) / geometry.perspectivePx,
    z,
    rotateY: 0,
  };
}

const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

function fullOvalAuthoredDepth(q: number, geometry: DepthPassGeometry) {
  const progress = q / Math.max(1, geometry.ovalReachCards);
  const arcProgress = Math.min(1, progress);
  if (!geometry.ovalGoldenRhythmEnabled) {
    const arch = Math.pow(Math.max(0, Math.sin(Math.PI * arcProgress)), 2.5)
      * (1 + geometry.ovalArchSkew * (arcProgress - 0.5));
    return -geometry.cardWidth * (geometry.ovalBackDepthCards * arcProgress
      + geometry.ovalArchDepthCards * arch + Math.max(0, progress - 1) * 0.5);
  }
  const turn = Math.max(0.4, Math.min(1, (geometry.ovalDepthMinimumPositionPercent ?? 100) / 100));
  // At the far-tail setting, the depth approaches its minimum card size
  // quickly and then rounds off. This keeps the waiting cards on the broad
  // lower arc instead of turning their silhouettes into a size staircase.
  // Moving the minimum inward restores the original central depth hump.
  const tailBlend = smoothstep((turn - 0.6) / 0.4);
  const tailDepth = geometry.ovalBackDepthCards + 0.2 * geometry.ovalArchDepthCards * tailBlend;
  const peakDepth = tailDepth + 0.8 * geometry.ovalArchDepthCards * (1 - turn) / 0.4;
  let depth: number;
  if (arcProgress <= turn) {
    const u = arcProgress / turn;
    const centralArch = smoothstep(u) ** 1.3;
    const approachRate = Math.max(0, 0.6 * geometry.ovalArchDepthCards + geometry.ovalArchSkew / 3);
    const exponential = approachRate < 0.001
      ? u : -Math.expm1(-approachRate * u) / -Math.expm1(-approachRate);
    const endSlope = approachRate < 0.001
      ? 1 : approachRate * Math.exp(-approachRate) / -Math.expm1(-approachRate);
    const roundedTail = exponential + endSlope * u ** 8 * (1 - u);
    depth = peakDepth * (centralArch * (1 - tailBlend) + roundedTail * tailBlend);
  } else {
    const u = (arcProgress - turn) / (1 - turn);
    depth = tailDepth + (peakDepth - tailDepth) * (1 + Math.cos(Math.PI * u)) / 2;
  }
  return -geometry.cardWidth * (depth + Math.max(0, progress - 1) * 0.5);
}

function fullOvalDepthAndScale(q: number, geometry: DepthPassGeometry) {
  const authoredZ = fullOvalAuthoredDepth(q, geometry);
  if (!geometry.ovalGoldenRhythmEnabled) {
    return { z: authoredZ, scale: geometry.perspectivePx / (geometry.perspectivePx - authoredZ) };
  }
  // Golden powers tune apparent size along the authored depth curve. The
  // configured minimum may sit at the far tail or within the visible arch.
  const depthUnits = -authoredZ / Math.max(1, geometry.cardWidth);
  const scale = Math.pow(GOLDEN_RATIO, -(geometry.ovalGoldenSizeStep ?? 0) * depthUnits);
  return { z: geometry.perspectivePx * (1 - 1 / scale), scale };
}

/** Fit physical projected widths and golden edge gaps within the real clip.
 * The far edge and first gap are preferred targets; minimum clearances are
 * hard. If all cards cannot fit, only the farthest cards leave the visible
 * budget. They retain their navigation positions and fade at the boundary. */
export function resolveGoldenOvalArchPath(geometry: DepthPassGeometry) {
  if (!geometry.ovalGoldenRhythmEnabled || geometry.ovalDistributionMode !== 'full-arch') return undefined;
  const reach = Math.max(1, Math.floor(geometry.ovalReachCards));
  const focusCenter = geometry.containerWidth / 2 + geometry.landingX;
  // Measure outward from the focus, so the same solver works on either side.
  const axisFocus = geometry.waitingSign === -1 ? focusCenter : geometry.containerWidth - focusCenter;
  const focusEdge = axisFocus - geometry.cardWidth / 2;
  // The Timeline figure intentionally shares the card track in the stacked
  // composition. The track clip is its safe runway boundary; reserving the
  // floating figure's width would erase the far arm of the depth arch.
  const safeEdge = 12;
  const preferredEdge = Math.max(safeEdge, geometry.containerWidth * geometry.ovalFarEdgePercent / 100);
  const widths = Array.from({ length: reach + 1 }, (_, q) => (
    q === 0 ? geometry.cardWidth : geometry.cardWidth * fullOvalDepthAndScale(q, geometry).scale
  ));
  // Width changes between integer stops. Reserve a small interpolation
  // allowance so the moving, fractional poses still meet the configured
  // edge clearances at the narrowest part of the depth arch.
  const motionAllowance = Math.max(6, geometry.cardWidth * 0.025);
  const minActiveGap = Math.max(0, geometry.ovalMinActiveGapPx ?? 12) + motionAllowance;
  const minWaitingGap = Math.max(0, geometry.ovalMinWaitingGapPx ?? 8) + motionAllowance;
  const minSpan = (count: number) => widths.slice(1, count + 1).reduce((sum, width) => sum + width, 0)
    + (count > 0 ? minActiveGap + (count - 1) * minWaitingGap : 0);
  let visibleReach = 0;
  for (let count = 1; count <= reach; count += 1) {
    if (minSpan(count) > focusEdge - safeEdge + 0.001) break;
    visibleReach = count;
  }
  const count = Math.max(1, visibleReach);
  const available = Math.max(minSpan(count), Math.min(
    focusEdge - preferredEdge,
    focusEdge - safeEdge,
  ));
  const gapWeights = Array.from({ length: reach }, (_, index) => (
    Math.pow(GOLDEN_RATIO, -(geometry.ovalGoldenSpacingStep ?? 0) * index)
  ));
  const weightTotal = gapWeights.slice(0, count).reduce((sum, weight) => sum + weight, 0);
  const preferredFirstGap = Math.max(minActiveGap,
    geometry.cardWidth * geometry.ovalFirstNeighborGapPercent / 100);
  const spare = focusEdge - safeEdge - minSpan(visibleReach);
  const nextCost = visibleReach < reach
    ? minSpan(visibleReach + 1) - minSpan(visibleReach) : 0;
  // At a fit threshold the new far card starts transparent. Keep the
  // existing card centers continuous too: their extra gap eases to zero
  // before the budget increases, and the path includes hidden positions so
  // interpolation tangents do not change when that card enters.
  const thresholdProgress = nextCost > 0 ? saturate(spare / nextCost) : 0;
  const continuityTaper = visibleReach === reach
    ? 1 : Math.sin(Math.PI * thresholdProgress) ** 2;
  const extraGap = (visibleReach === 0 ? 0 : Math.min(
    Math.max(0, available - minSpan(count)) / weightTotal,
    Math.max(0, preferredFirstGap - minActiveGap),
  )) * continuityTaper;
  const gaps = gapWeights.map((weight, index) => (
    (index === 0 ? minActiveGap : minWaitingGap) + extraGap * weight
  ));
  const axisCenters = [axisFocus];
  for (let q = 1; q <= reach; q += 1) {
    axisCenters[q] = axisCenters[q - 1] - (widths[q - 1] + widths[q]) / 2 - gaps[q - 1];
  }
  const centers = axisCenters.map(center => geometry.waitingSign === -1
    ? center : geometry.containerWidth - center);
  const differences = centers.slice(1).map((center, index) => center - centers[index]);
  const slopes = centers.map((_, index) => {
    if (index === 0) return differences[0];
    if (index === reach) return differences[reach - 1];
    const before = differences[index - 1];
    const after = differences[index];
    return before * after <= 0 ? 0 : 2 * before * after / (before + after);
  });
  // Once the whole arc fits, reveal its terminal card over a short runway;
  // otherwise keep the gentler fallback fade for a genuinely culled tail.
  const fadeDistance = visibleReach === reach
    ? 24 : Math.max(24, Math.min(72, widths[visibleReach] * 0.45));
  return {
    centers, slopes, visibleReach,
    lastOpacity: visibleReach === 0 ? 0 : saturate(spare / fadeDistance),
    widths, gaps,
  };
}

export function resolveGoldenOvalVisibility(q: number, geometry: DepthPassGeometry) {
  const path = geometry.ovalGoldenPath;
  if (!path || q <= 0) return 1;
  const { visibleReach, lastOpacity } = path;
  if (visibleReach === 0) return 1 - saturate(q);
  if (q <= visibleReach - 1) return 1;
  if (q <= visibleReach) return 1 - (1 - lastOpacity) * (q - visibleReach + 1);
  return lastOpacity * (1 - saturate(q - visibleReach));
}

function goldenScreenCenter(q: number, path: NonNullable<DepthPassGeometry['ovalGoldenPath']>) {
  const reach = path.centers.length - 1;
  if (q >= reach) return path.centers[reach] + path.slopes[reach] * (q - reach);
  const index = Math.max(0, Math.floor(q));
  return hermite(q - index, path.centers[index], path.centers[index + 1],
    path.slopes[index], path.slopes[index + 1]);
}

/** The full upper arch keeps its screen-space path while the golden depth
 * minimum can move from its middle to the far end. Screen-space anchors are
 * inverted through the camera without stretching card planes. */
function resolveFullOvalArchPose(q: number, geometry: DepthPassGeometry): DepthPassPose {
  if (q < 0) {
    const t = saturate(-q);
    const focus = resolveFullOvalArchPose(0, geometry);
    const near = resolveFullOvalArchPose(0.001, geometry);
    const scale = Math.max(1.01, geometry.exitScale);
    const exitZ = geometry.perspectivePx * (1 - 1 / scale);
    const origin = (geometry.perspectiveOriginXPercent / 100 - 0.5) * geometry.containerWidth;
    const exitSign = -geometry.waitingSign;
    const clearance = geometry.cardWidth * scale * geometry.exitClearancePercent / 100;
    const projectedCenter = exitSign * (geometry.containerWidth / 2 + geometry.cardWidth * scale / 2 + clearance);
    const exitX = origin + (projectedCenter - origin) / scale;
    const x = hermite(t, focus.x, exitX, (focus.x - near.x) / 0.001, 0);
    const z = hermite(t, 0, exitZ, -near.z / 0.001, 0);
    return {
      x,
      y: geometry.verticalOffsetPx * (geometry.perspectivePx - z) / geometry.perspectivePx,
      z,
      rotateY: 0,
    };
  }
  const { z, scale: screenScale } = fullOvalDepthAndScale(q, geometry);
  const backScale = fullOvalDepthAndScale(geometry.ovalReachCards, geometry).scale;
  const focusScreenCenter = geometry.containerWidth / 2 + geometry.landingX;
  const backScreenCenter = geometry.containerWidth * geometry.ovalFarEdgePercent / 100
    + geometry.cardWidth * backScale / 2;
  const firstScale = fullOvalDepthAndScale(1, geometry).scale;
  const focusLeft = focusScreenCenter - geometry.cardWidth / 2;
  const firstScreenCenter = focusLeft
    - geometry.cardWidth * geometry.ovalFirstNeighborGapPercent / 100
    - geometry.cardWidth * firstScale / 2;
  const remainingSteps = Math.max(1, geometry.ovalReachCards - 1);
  const afterFirst = (q - 1) / remainingSteps;
  const distributed = afterFirst + geometry.ovalArcSpacingBend * Math.sin(2 * Math.PI * afterFirst);
  const nextSlope = (backScreenCenter - firstScreenCenter)
    * (1 + 2 * Math.PI * geometry.ovalArcSpacingBend) / remainingSteps;
  const screenCenter = geometry.ovalGoldenPath
    ? goldenScreenCenter(q, geometry.ovalGoldenPath)
    : q <= 1
      ? hermite(q, focusScreenCenter, firstScreenCenter,
        firstScreenCenter - focusScreenCenter, nextSlope)
      : firstScreenCenter + (backScreenCenter - firstScreenCenter) * distributed;
  const origin = (geometry.perspectiveOriginXPercent / 100 - 0.5) * geometry.containerWidth;
  // Reverse the perspective projection so the *visible* positions trace the
  // authored full-arc spacing. Otherwise the deep B is pulled toward an
  // off-axis camera origin and the waiting cards cross over each other.
  const worldX = origin + (screenCenter - geometry.containerWidth / 2 - origin) / screenScale;
  return {
    x: worldX,
    y: geometry.verticalOffsetPx * (geometry.perspectivePx - z) / geometry.perspectivePx,
    z,
    rotateY: 0,
  };
}

function waitingOffset(distance: number, geometry: DepthPassGeometry) {
  const spacing = geometry.stackSpacing * geometry.spacingPercent / 100;
  const growth = 1 + geometry.stackSpacingGrowthPercent / 100;
  if (geometry.includesFirstNeighbor) {
    return growth === 1
      ? spacing * distance
      : spacing * (Math.pow(growth, distance) - 1) / (growth - 1);
  }
  const further = Math.max(0, distance - 1);
  const sum = growth === 1 ? further : (Math.pow(growth, further) - 1) / (growth - 1);
  return (distance < 1 ? geometry.centerGap * distance : geometry.centerGap + geometry.stackSpacing * sum)
    * geometry.spacingPercent / 100;
}

function convergedWaitingOffset(distance: number, geometry: DepthPassGeometry) {
  const base = waitingOffset(distance, geometry);
  if (distance <= 1 || geometry.ovalConvergencePercent <= 0) return base;
  const first = waitingOffset(1, geometry);
  const beyondFirst = distance - 1;
  return first + (base - first) / (1 + geometry.ovalConvergencePercent / 100 * beyondFirst);
}

function firstWaitingSlope(geometry: DepthPassGeometry) {
  if (!geometry.includesFirstNeighbor) {
    return geometry.centerGap * geometry.spacingPercent / 100 - geometry.waitingShiftPx * 7 / 6;
  }
  const growth = 1 + geometry.stackSpacingGrowthPercent / 100;
  const spacing = geometry.stackSpacing * geometry.spacingPercent / 100;
  return (growth === 1 ? spacing : spacing * Math.log(growth) / (growth - 1))
    - geometry.waitingShiftPx * 7 / 6;
}

/** Solve the nearest visible edge in screen space once per geometry change.
 * This shifts the waiting path toward focus without modifying the Z arc. */
export function resolveDepthPassWaitingShift(geometry: DepthPassGeometry, gapPercent: number) {
  const targetGap = geometry.cardWidth * gapPercent / 100;
  const origin = (geometry.perspectiveOriginXPercent / 100 - 0.5) * geometry.containerWidth;
  const focusEdge = geometry.landingX + geometry.waitingSign * geometry.cardWidth / 2;
  const localEdge = -geometry.waitingSign * geometry.cardWidth / 2;
  let shift = 0;
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const pose = resolveDepthPassPose(1, { ...geometry, waitingShiftPx: shift });
    const yaw = pose.rotateY * Math.PI / 180;
    const edgeZ = pose.z - localEdge * Math.sin(yaw);
    const edgeScale = geometry.perspectivePx / (geometry.perspectivePx - edgeZ);
    const edgeX = origin + edgeScale * (pose.x + localEdge * Math.cos(yaw) - origin);
    const gap = geometry.waitingSign * (edgeX - focusEdge);
    shift += (gap - targetGap) / edgeScale;
  }
  return shift;
}

/** CSS perspective projects a yawed plane's two vertical edges at different
 * scales. Far off-axis, the nearer edge can make a deeper plane look wider
 * than a front-facing plane at the same Z. Compare the actual projected edge
 * separation, including the configured perspective origin, before yawing. */
function projectedWaitingWidth(x: number, z: number, yawRadians: number, geometry: DepthPassGeometry) {
  const perspective = geometry.perspectivePx;
  const distance = perspective - z;
  const halfWidth = geometry.cardWidth / 2;
  const origin = (geometry.perspectiveOriginXPercent / 100 - 0.5) * geometry.containerWidth;
  const center = x - origin;
  const sine = Math.sin(yawRadians);
  const cosine = Math.cos(yawRadians);
  return perspective * geometry.cardWidth * (cosine * distance - center * sine)
    / (distance * distance - halfWidth * halfWidth * sine * sine);
}

function limitedWaitingYaw(x: number, z: number, authoredYawDeg: number, geometry: DepthPassGeometry) {
  if (authoredYawDeg <= 0) return 0;
  const direction = -geometry.waitingSign;
  const authoredRadians = authoredYawDeg * Math.PI / 180;
  const frontWidth = geometry.cardWidth * geometry.perspectivePx / (geometry.perspectivePx - z);
  const limit = frontWidth * geometry.maxProjectedWidthRatio;
  let previous = 0;
  // Find the first crossing, even if width falls again at a very high yaw.
  // This keeps orientation continuous as a card travels across the camera.
  for (let step = 1; step <= 6; step += 1) {
    const angle = authoredRadians * step / 6;
    if (projectedWaitingWidth(x, z, direction * angle, geometry) > limit) {
      let low = previous;
      let high = angle;
      for (let iteration = 0; iteration < 9; iteration += 1) {
        const middle = (low + high) / 2;
        if (projectedWaitingWidth(x, z, direction * middle, geometry) > limit) high = middle;
        else low = middle;
      }
      return direction * low * 180 / Math.PI;
    }
    previous = angle;
  }
  return direction * authoredYawDeg;
}

/** Exit X is solved in projected screen space, not guessed from card width.
 * The exit plane is front-facing; perspective makes its half-width w*s/2. */
export function resolveDepthPassExitX(geometry: DepthPassGeometry): number {
  const exitSign = -geometry.waitingSign;
  const scale = geometry.exitScale;
  const origin = (geometry.perspectiveOriginXPercent / 100 - 0.5) * geometry.containerWidth;
  const projectedHalfWidth = geometry.cardWidth * scale / 2;
  const clearance = projectedHalfWidth * 2 * geometry.exitClearancePercent / 100;
  const projectedCenter = exitSign * (geometry.containerWidth / 2 + clearance + projectedHalfWidth);
  const calculated = origin + (projectedCenter - origin) / scale;
  // Keep the Hermite departure monotonic even when focus is very near an edge.
  const minimumTravel = firstWaitingSlope(geometry) / 3;
  return geometry.landingX + exitSign * Math.max(
    minimumTravel, exitSign * (calculated - geometry.landingX),
  );
}

/** q>0: upcoming plane; q=0: readable focus; q<0: foreground departure. */
export function resolveDepthPassPose(q: number, geometry: DepthPassGeometry): DepthPassPose {
  if (geometry.pathMode === 'oval-pass') return resolveOvalPose(q, geometry);
  const progression = geometry.depthIncrementPercent / 100;
  if (q >= 0) {
    const arcPosition = q / Math.max(1, geometry.arcReachCards);
    const arcPositionSquared = arcPosition * arcPosition;
    // A bounded quadratic bend makes the projected size progression curve
    // toward the distant planes. Its zero slope at focus preserves the
    // departure join; unlike a clamp it stays continuous past Arc reach.
    const arcBend = 2 * arcPositionSquared / (1 + arcPositionSquared);
    const arcPositionCubed = arcPositionSquared * arcPosition;
    const arcDrop = 2 * arcPositionCubed / (1 + arcPositionCubed);
    const firstDepth = geometry.depthPx * (1 + progression);
    const baseZ = q >= 1
      ? -geometry.depthPx * (1 + q * progression)
      : hermite(q, 0, -firstDepth, -2 * geometry.depthPx, -geometry.depthPx * progression);
    const z = baseZ - geometry.depthPx * geometry.arcBendPercent / 100 * arcBend;
    const nearestYaw = Math.min(geometry.yawDeg, geometry.yawMaxDeg);
    const fartherYaw = Math.max(nearestYaw, geometry.yawMaxDeg);
    const yawProgress = (q - 1) / Math.max(1, geometry.yawSpreadDepth - 1);
    const authoredYaw = nearestYaw * smoothstep(q)
      + (fartherYaw - nearestYaw) * smoothstep(yawProgress);
    const x = geometry.landingX + geometry.waitingSign * (
      convergedWaitingOffset(q, geometry) - geometry.waitingShiftPx * waitingJoin(q)
    );
    return {
      x,
      y: geometry.verticalOffsetPx + geometry.arcDropPx * arcDrop,
      z,
      rotateY: limitedWaitingYaw(x, z, authoredYaw, geometry),
    };
  }

  const t = saturate(-q);
  const exitX = resolveDepthPassExitX(geometry);
  const exitZ = geometry.perspectivePx * (1 - 1 / geometry.exitScale);
  return {
    x: hermite(t, geometry.landingX, exitX,
      -geometry.waitingSign * firstWaitingSlope(geometry), 0),
    y: geometry.verticalOffsetPx,
    z: hermite(t, 0, exitZ, 2 * geometry.depthPx, 0),
    rotateY: 0,
  };
}
