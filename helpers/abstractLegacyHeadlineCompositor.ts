import {
  getProceduralColorStackLayerHeightRatio,
  resolveProceduralColorStackRow,
} from './proceduralColorSnapshot';

export type LegacyHeadlineGradientFrame = {
  layerFaceIndices: number[];
  sourceWidth: number;
  sourceHeight: number;
  atlasCellCount: number;
  overlayFaceCount: number;
};

export type LegacyHeadlineLayerCrop = {
  destinationHeightRatio: number;
  destinationYRatio: number;
  sourceHeightRatio: number;
  sourceYRatio: number;
};

export type LegacyHeadlineCoverCrop = {
  sourceHeight: number;
  sourceWidth: number;
  sourceX: number;
  sourceY: number;
};

export type LegacyHeadlineDestinationRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type LegacyHeadlineSourceRegion = LegacyHeadlineDestinationRect;

export type LegacyHeadlineWordFragment = {
  height: number;
  left: number;
  text: string;
  top: number;
};

export type LegacyHeadlineLineFragment = LegacyHeadlineWordFragment;

type PaintLegacyGradientHeadlineParams = {
  atlasCanvas: HTMLCanvasElement | null;
  debugCanvas?: HTMLCanvasElement | null;
  debugSizeCssPixels?: number;
  frame: LegacyHeadlineGradientFrame | null;
  frozenLayerSources?: HTMLCanvasElement[] | null;
  headlineElement: HTMLHeadingElement | null;
  panXPercent?: number;
  panYPercent?: number;
  pixelRatio?: number;
  scale?: number;
  sourceCanvas?: HTMLCanvasElement | null;
  sourceMode?: 'full' | 'band';
  sourceRow: number;
  targetCanvas: HTMLCanvasElement | null;
};

type HeadlineWorkCanvases = {
  band: HTMLCanvasElement;
  mask: HTMLCanvasElement;
  texture: HTMLCanvasElement;
};

const MAX_HEADLINE_PIXEL_COUNT = 4_000_000;

const clamp = (value: number, min: number, max: number) => (
  Math.min(Math.max(value, min), max)
);

const headlineWorkCanvases = new WeakMap<HTMLCanvasElement, HeadlineWorkCanvases>();

function getHeadlineWorkCanvases(targetCanvas: HTMLCanvasElement) {
  const existing = headlineWorkCanvases.get(targetCanvas);
  if (existing) return existing;

  const canvases = {
    band: document.createElement('canvas'),
    mask: document.createElement('canvas'),
    texture: document.createElement('canvas'),
  };
  headlineWorkCanvases.set(targetCanvas, canvases);
  return canvases;
}

function setGradientReady(headlineElement: HTMLHeadingElement, ready: boolean) {
  if (ready) {
    headlineElement.dataset.gradientReady = 'true';
  } else {
    delete headlineElement.dataset.gradientReady;
  }
}

function clearDebugCanvas(debugCanvas: HTMLCanvasElement | null) {
  if (!debugCanvas) return;
  const debugContext = debugCanvas.getContext('2d');
  debugContext?.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
  delete debugCanvas.dataset.gradientReady;
}

/** Maps one bottom-anchored legacy layer into a selected top-to-bottom band. */
export function resolveLegacyHeadlineLayerCrop({
  layerIndex,
  overlayFaceCount,
  sourceRow,
}: {
  layerIndex: number;
  overlayFaceCount: number;
  sourceRow: number;
}): LegacyHeadlineLayerCrop | null {
  const row = resolveProceduralColorStackRow(sourceRow, overlayFaceCount);
  const layerHeightRatio = getProceduralColorStackLayerHeightRatio(
    layerIndex,
    overlayFaceCount,
  );
  const rowTop = row.rowIndex * row.rowHeightRatio;
  const rowBottom = rowTop + row.rowHeightRatio;
  const layerTop = 1 - layerHeightRatio;
  const intersectionTop = Math.max(rowTop, layerTop);
  const intersectionBottom = Math.min(rowBottom, 1);

  if (intersectionBottom <= intersectionTop) return null;

  return {
    destinationHeightRatio: (intersectionBottom - intersectionTop) / row.rowHeightRatio,
    destinationYRatio: (intersectionTop - rowTop) / row.rowHeightRatio,
    sourceHeightRatio: (intersectionBottom - intersectionTop) / layerHeightRatio,
    sourceYRatio: (intersectionTop - layerTop) / layerHeightRatio,
  };
}

/**
 * Resolves an aspect-preserving source crop. Unlike fitting the complete band
 * into the headline box, this retains the shader's original spatial frequency
 * and curved displacement.
 */
export function resolveLegacyHeadlineCoverCrop({
  panXPercent = 50,
  panYPercent = 50,
  scale = 1,
  sourceHeight,
  sourceWidth,
  targetHeight,
  targetWidth,
}: {
  panXPercent?: number;
  panYPercent?: number;
  scale?: number;
  sourceHeight: number;
  sourceWidth: number;
  targetHeight: number;
  targetWidth: number;
}): LegacyHeadlineCoverCrop {
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);
  const safeTargetWidth = Math.max(1, targetWidth);
  const safeTargetHeight = Math.max(1, targetHeight);
  const coverScale = Math.max(
    safeTargetWidth / safeSourceWidth,
    safeTargetHeight / safeSourceHeight,
  );
  const resolvedScale = coverScale * clamp(scale, 1, 3);
  const visibleWidth = clamp(safeTargetWidth / resolvedScale, 1, safeSourceWidth);
  const visibleHeight = clamp(safeTargetHeight / resolvedScale, 1, safeSourceHeight);
  const panX = clamp(panXPercent / 100, 0, 1);
  const panY = clamp(panYPercent / 100, 0, 1);

  return {
    sourceHeight: visibleHeight,
    sourceWidth: visibleWidth,
    sourceX: (safeSourceWidth - visibleWidth) * panX,
    sourceY: (safeSourceHeight - visibleHeight) * panY,
  };
}

/** Fits the exact headline texture inside the square debug surface without distortion. */
export function resolveLegacyHeadlineContainRect({
  sourceHeight,
  sourceWidth,
  targetHeight,
  targetWidth,
}: {
  sourceHeight: number;
  sourceWidth: number;
  targetHeight: number;
  targetWidth: number;
}): LegacyHeadlineDestinationRect {
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);
  const safeTargetWidth = Math.max(1, targetWidth);
  const safeTargetHeight = Math.max(1, targetHeight);
  const scale = Math.min(
    safeTargetWidth / safeSourceWidth,
    safeTargetHeight / safeSourceHeight,
  );
  const width = safeSourceWidth * scale;
  const height = safeSourceHeight * scale;

  return {
    height,
    width,
    x: (safeTargetWidth - width) / 2,
    y: (safeTargetHeight - height) / 2,
  };
}

/** Selects either the complete canonical frame or one semantic top-to-bottom band. */
export function resolveLegacyHeadlineSourceRegion({
  overlayFaceCount,
  sourceHeight,
  sourceMode,
  sourceRow,
  sourceWidth,
}: {
  overlayFaceCount: number;
  sourceHeight: number;
  sourceMode: 'full' | 'band';
  sourceRow: number;
  sourceWidth: number;
}): LegacyHeadlineSourceRegion {
  if (sourceMode === 'full') {
    return { height: sourceHeight, width: sourceWidth, x: 0, y: 0 };
  }

  const row = resolveProceduralColorStackRow(sourceRow, overlayFaceCount);
  return {
    height: Math.max(1, sourceHeight * row.rowHeightRatio),
    width: sourceWidth,
    x: 0,
    y: sourceHeight * row.rowIndex * row.rowHeightRatio,
  };
}

function resolveCanvasFont(style: CSSStyleDeclaration) {
  return [
    style.fontStyle,
    style.fontVariant,
    style.fontWeight,
    style.fontSize,
    style.fontFamily,
  ].filter(Boolean).join(' ');
}

/** Groups browser-measured words into visual lines without introducing DOM word wrappers. */
export function groupLegacyHeadlineWordFragments(
  wordFragments: LegacyHeadlineWordFragment[],
  lineTolerance = 1,
): LegacyHeadlineLineFragment[] {
  return wordFragments.reduce<LegacyHeadlineLineFragment[]>((lines, word) => {
    const line = lines.find(candidate => Math.abs(candidate.top - word.top) <= lineTolerance);
    if (!line) {
      lines.push({ ...word });
      return lines;
    }

    const bottom = Math.max(line.top + line.height, word.top + word.height);
    line.top = Math.min(line.top, word.top);
    line.left = Math.min(line.left, word.left);
    line.height = bottom - line.top;
    line.text = `${line.text} ${word.text}`;
    return lines;
  }, []);
}

function measureLegacyHeadlineLines(
  headlineElement: HTMLHeadingElement,
): LegacyHeadlineLineFragment[] {
  const textElement = headlineElement.querySelector<HTMLElement>(
    '[data-gradient-headline-text]',
  );
  const textNode = textElement?.firstChild;
  const text = textNode?.textContent ?? '';
  if (!textElement || !textNode || textNode.nodeType !== Node.TEXT_NODE || !text.trim()) return [];

  const wordFragments: LegacyHeadlineWordFragment[] = [];
  const wordPattern = /\S+/g;
  let match: RegExpExecArray | null = wordPattern.exec(text);
  while (match) {
    const range = document.createRange();
    range.setStart(textNode, match.index);
    range.setEnd(textNode, match.index + match[0].length);
    const bounds = range.getBoundingClientRect();
    if (bounds.width > 0 && bounds.height > 0) {
      wordFragments.push({
        height: bounds.height,
        left: bounds.left,
        text: match[0],
        top: bounds.top,
      });
    }
    range.detach();
    match = wordPattern.exec(text);
  }

  return groupLegacyHeadlineWordFragments(wordFragments);
}

function resolveHeadlinePixelRatio({
  cssHeight,
  cssWidth,
  requestedPixelRatio,
}: {
  cssHeight: number;
  cssWidth: number;
  requestedPixelRatio: number;
}) {
  const requested = clamp(requestedPixelRatio, 1, 3);
  const budgeted = Math.sqrt(MAX_HEADLINE_PIXEL_COUNT / Math.max(1, cssWidth * cssHeight));
  return Math.max(1, Math.min(requested, budgeted));
}

function paintLegacyBandMaster({
  atlasCanvas,
  bandCanvas,
  frame,
  frozenLayerSources,
  sourceRow,
}: {
  atlasCanvas: HTMLCanvasElement | null;
  bandCanvas: HTMLCanvasElement;
  frame: LegacyHeadlineGradientFrame;
  frozenLayerSources: HTMLCanvasElement[] | null;
  sourceRow: number;
}) {
  if (!atlasCanvas && !frozenLayerSources) return false;

  const row = resolveProceduralColorStackRow(sourceRow, frame.overlayFaceCount);
  const bandWidth = Math.max(1, Math.round(frame.sourceWidth));
  const bandHeight = Math.max(1, Math.round(frame.sourceHeight * row.rowHeightRatio));
  if (bandCanvas.width !== bandWidth) bandCanvas.width = bandWidth;
  if (bandCanvas.height !== bandHeight) bandCanvas.height = bandHeight;

  const context = bandCanvas.getContext('2d');
  if (!context) return false;
  context.clearRect(0, 0, bandWidth, bandHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  let paintedLayerCount = 0;
  frame.layerFaceIndices.forEach((faceIndex, layerIndex) => {
    const crop = resolveLegacyHeadlineLayerCrop({
      layerIndex,
      overlayFaceCount: frame.overlayFaceCount,
      sourceRow,
    });
    if (!crop) return;

    const frozenSource = frozenLayerSources?.[layerIndex] ?? null;
    const source = frozenSource ?? atlasCanvas;
    if (!source || source.width <= 0 || source.height <= 0) return;

    const sourceIndex = ((faceIndex % frame.atlasCellCount) + frame.atlasCellCount) %
      frame.atlasCellCount;
    const sourceCellWidth = frozenSource ? frozenSource.width : frame.sourceWidth;
    const sourceCellHeight = frozenSource ? frozenSource.height : frame.sourceHeight;
    const sourceCellY = frozenSource ? 0 : sourceIndex * frame.sourceHeight;

    context.globalCompositeOperation = paintedLayerCount === 0 ? 'source-over' : 'overlay';
    context.drawImage(
      source,
      0,
      sourceCellY + crop.sourceYRatio * sourceCellHeight,
      sourceCellWidth,
      crop.sourceHeightRatio * sourceCellHeight,
      0,
      crop.destinationYRatio * bandHeight,
      bandWidth,
      crop.destinationHeightRatio * bandHeight,
    );
    paintedLayerCount += 1;
  });
  context.globalCompositeOperation = 'source-over';

  return paintedLayerCount > 0;
}

/**
 * Composites a selected legacy band directly from the source-resolution atlas,
 * applies an aspect-preserving crop, and clips it through DOM-measured lines.
 */
export function paintLegacyGradientHeadline({
  atlasCanvas,
  debugCanvas = null,
  debugSizeCssPixels = 320,
  frame,
  frozenLayerSources = null,
  headlineElement,
  panXPercent = 50,
  panYPercent = 50,
  pixelRatio = 1,
  scale = 1,
  sourceCanvas = null,
  sourceMode = 'full',
  sourceRow,
  targetCanvas,
}: PaintLegacyGradientHeadlineParams) {
  if (!headlineElement || !targetCanvas || !frame) {
    clearDebugCanvas(debugCanvas);
    return false;
  }

  const headlineBounds = headlineElement.getBoundingClientRect();
  const cssWidth = Math.max(1, headlineBounds.width);
  const cssHeight = Math.max(1, headlineBounds.height);
  const resolvedPixelRatio = resolveHeadlinePixelRatio({
    cssHeight,
    cssWidth,
    requestedPixelRatio: pixelRatio,
  });
  const targetWidth = Math.max(1, Math.round(cssWidth * resolvedPixelRatio));
  const targetHeight = Math.max(1, Math.round(cssHeight * resolvedPixelRatio));
  const context = targetCanvas.getContext('2d');
  const lineFragments = measureLegacyHeadlineLines(headlineElement);

  if (!context || lineFragments.length === 0) return false;
  if (targetCanvas.width !== targetWidth) targetCanvas.width = targetWidth;
  if (targetCanvas.height !== targetHeight) targetCanvas.height = targetHeight;

  const workCanvases = getHeadlineWorkCanvases(targetCanvas);
  const directSourceAvailable = Boolean(
    sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0,
  );
  const bandPainted = directSourceAvailable || paintLegacyBandMaster({
    atlasCanvas,
    bandCanvas: workCanvases.band,
    frame,
    frozenLayerSources,
    sourceRow,
  });

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, targetWidth, targetHeight);
  if (!bandPainted) {
    setGradientReady(headlineElement, false);
    clearDebugCanvas(debugCanvas);
    return false;
  }

  const sourceRegion = directSourceAvailable && sourceCanvas
    ? resolveLegacyHeadlineSourceRegion({
      overlayFaceCount: frame.overlayFaceCount,
      sourceHeight: sourceCanvas.height,
      sourceMode,
      sourceRow,
      sourceWidth: sourceCanvas.width,
    })
    : {
      height: workCanvases.band.height,
      width: workCanvases.band.width,
      x: 0,
      y: 0,
    };
  const sourceCrop = resolveLegacyHeadlineCoverCrop({
    panXPercent,
    panYPercent,
    scale,
    sourceHeight: sourceRegion.height,
    sourceWidth: sourceRegion.width,
    targetHeight,
    targetWidth,
  });
  const textureCanvas = workCanvases.texture;
  if (textureCanvas.width !== targetWidth) textureCanvas.width = targetWidth;
  if (textureCanvas.height !== targetHeight) textureCanvas.height = targetHeight;
  const textureContext = textureCanvas.getContext('2d');
  if (!textureContext) return false;
  textureContext.clearRect(0, 0, targetWidth, targetHeight);
  textureContext.imageSmoothingEnabled = true;
  textureContext.imageSmoothingQuality = 'high';
  textureContext.drawImage(
    directSourceAvailable && sourceCanvas ? sourceCanvas : workCanvases.band,
    sourceRegion.x + sourceCrop.sourceX,
    sourceRegion.y + sourceCrop.sourceY,
    sourceCrop.sourceWidth,
    sourceCrop.sourceHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(textureCanvas, 0, 0, targetWidth, targetHeight);

  if (debugCanvas) {
    const safeDebugSize = clamp(debugSizeCssPixels, 160, 640);
    const debugWidth = Math.max(1, Math.round(safeDebugSize * resolvedPixelRatio));
    const debugHeight = debugWidth;
    if (debugCanvas.width !== debugWidth) debugCanvas.width = debugWidth;
    if (debugCanvas.height !== debugHeight) debugCanvas.height = debugHeight;
    const debugContext = debugCanvas.getContext('2d');

    if (debugContext) {
      const debugSource = directSourceAvailable && sourceCanvas
        ? sourceCanvas
        : workCanvases.band;
      const debugRegion = directSourceAvailable && sourceCanvas
        ? sourceRegion
        : {
          height: workCanvases.band.height,
          width: workCanvases.band.width,
          x: 0,
          y: 0,
        };
      const debugCrop = resolveLegacyHeadlineCoverCrop({
        sourceHeight: debugRegion.height,
        sourceWidth: debugRegion.width,
        targetHeight: debugHeight,
        targetWidth: debugWidth,
      });
      debugContext.clearRect(0, 0, debugWidth, debugHeight);
      debugContext.imageSmoothingEnabled = true;
      debugContext.imageSmoothingQuality = 'high';
      debugContext.drawImage(
        debugSource,
        debugRegion.x + debugCrop.sourceX,
        debugRegion.y + debugCrop.sourceY,
        debugCrop.sourceWidth,
        debugCrop.sourceHeight,
        0,
        0,
        debugWidth,
        debugHeight,
      );
      debugCanvas.dataset.gradientReady = 'true';
    }
  }

  const headlineStyle = window.getComputedStyle(headlineElement);
  const fontSize = Number.parseFloat(headlineStyle.fontSize) || 16;
  const maskCanvas = workCanvases.mask;
  const maskContext = maskCanvas.getContext('2d');
  if (!maskContext) return false;
  if (maskCanvas.width !== targetWidth) maskCanvas.width = targetWidth;
  if (maskCanvas.height !== targetHeight) maskCanvas.height = targetHeight;
  maskContext.setTransform(resolvedPixelRatio, 0, 0, resolvedPixelRatio, 0, 0);
  maskContext.clearRect(0, 0, cssWidth, cssHeight);
  maskContext.fillStyle = '#ffffff';
  maskContext.font = resolveCanvasFont(headlineStyle);
  maskContext.textAlign = 'left';
  maskContext.textBaseline = 'alphabetic';

  const letterSpacedContext = maskContext as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in letterSpacedContext) {
    letterSpacedContext.letterSpacing = headlineStyle.letterSpacing;
  }

  const sharedMetrics = maskContext.measureText('Hgjpqy');
  const sharedAscent = sharedMetrics.actualBoundingBoxAscent || fontSize * 0.78;
  const sharedDescent = sharedMetrics.actualBoundingBoxDescent || fontSize * 0.22;
  const sharedInkHeight = sharedAscent + sharedDescent;

  lineFragments.forEach(line => {
    const baseline = line.top - headlineBounds.top +
      (line.height - sharedInkHeight) / 2 + sharedAscent;

    maskContext.fillText(
      line.text,
      line.left - headlineBounds.left,
      baseline,
    );
  });

  context.globalCompositeOperation = 'destination-in';
  context.drawImage(maskCanvas, 0, 0, targetWidth, targetHeight);
  context.globalCompositeOperation = 'source-over';

  let hasVisiblePixels = headlineElement.dataset.gradientReady === 'true';
  if (!hasVisiblePixels) {
    try {
      const pixels = context.getImageData(0, 0, targetWidth, targetHeight).data;
      for (let alphaIndex = 3; alphaIndex < pixels.length; alphaIndex += 4) {
        if (pixels[alphaIndex] > 8) {
          hasVisiblePixels = true;
          break;
        }
      }
    } catch {
      hasVisiblePixels = false;
    }
  }

  setGradientReady(headlineElement, hasVisiblePixels);
  return hasVisiblePixels;
}
