export type GradientTextureSource = {
  getCanvas: () => HTMLCanvasElement | null;
  subscribe: (listener: () => void) => () => void;
};

export type MutableGradientTextureSource = GradientTextureSource & {
  notify: () => void;
  setCanvas: (canvas: HTMLCanvasElement | null) => void;
};

export type GradientTextureSurfacePaintOptions = {
  border: boolean;
  fill: boolean;
  panXPercent: number;
  panYPercent: number;
  pixelRatio: number;
  scale: number;
  sourceCanvas: HTMLCanvasElement | null;
  sourceRegion?: GradientTextureSourceRegion;
  targetCanvas: HTMLCanvasElement | null;
  targetElement: HTMLElement | null;
};

export type GradientTextureSourceRegion = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const clamp = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

export function createGradientTextureSource(
  initialCanvas: HTMLCanvasElement | null = null,
): MutableGradientTextureSource {
  let canvas = initialCanvas;
  const listeners = new Set<() => void>();
  return {
    getCanvas: () => canvas,
    notify: () => listeners.forEach(listener => listener()),
    setCanvas: nextCanvas => {
      canvas = nextCanvas;
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function resolveGradientTextureCoverCrop({
  panXPercent,
  panYPercent,
  scale,
  sourceHeight,
  sourceWidth,
  targetHeight,
  targetWidth,
}: {
  panXPercent: number;
  panYPercent: number;
  scale: number;
  sourceHeight: number;
  sourceWidth: number;
  targetHeight: number;
  targetWidth: number;
}) {
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);
  const coverScale = Math.max(
    Math.max(1, targetWidth) / safeSourceWidth,
    Math.max(1, targetHeight) / safeSourceHeight,
  );
  const magnification = coverScale * clamp(scale, 1, 3);
  const width = clamp(targetWidth / magnification, 1, safeSourceWidth);
  const height = clamp(targetHeight / magnification, 1, safeSourceHeight);
  return {
    height,
    width,
    x: (safeSourceWidth - width) * clamp(panXPercent / 100, 0, 1),
    y: (safeSourceHeight - height) * clamp(panYPercent / 100, 0, 1),
  };
}

export function resolveGradientTextureSourceCrop({
  panXPercent,
  panYPercent,
  scale,
  sourceHeight,
  sourceRegion,
  sourceWidth,
  targetHeight,
  targetWidth,
}: {
  panXPercent: number;
  panYPercent: number;
  scale: number;
  sourceHeight: number;
  sourceRegion?: GradientTextureSourceRegion;
  sourceWidth: number;
  targetHeight: number;
  targetWidth: number;
}) {
  const region = sourceRegion ?? {
    height: sourceHeight,
    width: sourceWidth,
    x: 0,
    y: 0,
  };
  const regionX = clamp(region.x, 0, Math.max(0, sourceWidth - 1));
  const regionY = clamp(region.y, 0, Math.max(0, sourceHeight - 1));
  const boundedRegion = {
    height: clamp(region.height, 1, Math.max(1, sourceHeight - regionY)),
    width: clamp(region.width, 1, Math.max(1, sourceWidth - regionX)),
    x: regionX,
    y: regionY,
  };
  const crop = resolveGradientTextureCoverCrop({
    panXPercent,
    panYPercent,
    scale,
    sourceHeight: boundedRegion.height,
    sourceWidth: boundedRegion.width,
    targetHeight,
    targetWidth,
  });

  return {
    ...crop,
    x: boundedRegion.x + crop.x,
    y: boundedRegion.y + crop.y,
  };
}

function traceRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const resolvedRadius = clamp(radius, 0, Math.min(width, height) / 2);
  context.beginPath();
  context.moveTo(x + resolvedRadius, y);
  context.lineTo(x + width - resolvedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + resolvedRadius);
  context.lineTo(x + width, y + height - resolvedRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - resolvedRadius, y + height);
  context.lineTo(x + resolvedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - resolvedRadius);
  context.lineTo(x, y + resolvedRadius);
  context.quadraticCurveTo(x, y, x + resolvedRadius, y);
  context.closePath();
}

export function paintGradientTextureSurface({
  border,
  fill,
  panXPercent,
  panYPercent,
  pixelRatio,
  scale,
  sourceCanvas,
  sourceRegion,
  targetCanvas,
  targetElement,
}: GradientTextureSurfacePaintOptions) {
  const clear = () => {
    if (targetCanvas) {
      targetCanvas.getContext('2d')?.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    }
    if (targetElement) delete targetElement.dataset.gradientSurfaceReady;
  };
  if (!sourceCanvas || !targetCanvas || !targetElement || (!border && !fill)) {
    clear();
    return false;
  }
  if (sourceCanvas.width < 1 || sourceCanvas.height < 1) {
    clear();
    return false;
  }

  const bounds = targetElement.getBoundingClientRect();
  const cssWidth = Math.max(1, bounds.width);
  const cssHeight = Math.max(1, bounds.height);
  const dpr = clamp(pixelRatio || 1, 1, 3);
  const width = Math.max(1, Math.round(cssWidth * dpr));
  const height = Math.max(1, Math.round(cssHeight * dpr));
  const context = targetCanvas.getContext('2d');
  if (!context) return false;
  if (targetCanvas.width !== width) targetCanvas.width = width;
  if (targetCanvas.height !== height) targetCanvas.height = height;

  const crop = resolveGradientTextureSourceCrop({
    panXPercent,
    panYPercent,
    scale,
    sourceHeight: sourceCanvas.height,
    sourceRegion,
    sourceWidth: sourceCanvas.width,
    targetHeight: height,
    targetWidth: width,
  });
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    sourceCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    width,
    height,
  );

  const computedStyle = window.getComputedStyle(targetElement);
  const borderWidth = Math.min(
    Math.min(width, height) / 2,
    (Number.parseFloat(computedStyle.borderTopWidth) || 0) * dpr,
  );
  const computedRadius = Number.parseFloat(computedStyle.borderTopLeftRadius);
  const outerRadius = Math.min(
    Number.isFinite(computedRadius) ? computedRadius * dpr : height / 2,
    Math.min(width, height) / 2,
  );

  context.globalCompositeOperation = 'destination-in';
  context.fillStyle = '#fff';
  if (fill && border) {
    traceRoundedRect(context, 0, 0, width, height, outerRadius);
    context.fill();
  } else {
    const inset = borderWidth;
    const innerWidth = Math.max(0, width - inset * 2);
    const innerHeight = Math.max(0, height - inset * 2);
    if (fill && innerWidth > 0 && innerHeight > 0) {
      traceRoundedRect(
        context,
        inset,
        inset,
        innerWidth,
        innerHeight,
        Math.max(0, outerRadius - inset),
      );
      context.fill();
    } else if (border && borderWidth > 0) {
      traceRoundedRect(context, 0, 0, width, height, outerRadius);
      context.fill();
      context.globalCompositeOperation = 'destination-out';
      traceRoundedRect(
        context,
        borderWidth,
        borderWidth,
        Math.max(0, width - borderWidth * 2),
        Math.max(0, height - borderWidth * 2),
        Math.max(0, outerRadius - borderWidth),
      );
      context.fill();
    }
  }
  context.globalCompositeOperation = 'source-over';
  targetElement.dataset.gradientSurfaceReady = 'true';
  return true;
}
