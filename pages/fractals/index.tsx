// app/fractal/page.tsx
"use client";

import { useEffect, useRef } from "react";

export default function FractalPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;

    // ---- sizing (draw in CSS px, map via DPR) ----
    let W = 0, H = 0, DPR = 1;
    function resize() {
      W = Math.floor(window.innerWidth);
      H = Math.floor(window.innerHeight);
      DPR = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    window.addEventListener("resize", resize, { passive: true });
    resize();

    // ---- parameters ----
    const p = {
      depth: 7,
      baseScale: 0.5,       // Sierpiński triangle
      baseSpread: 1.0,
      background: "#0b0b12",

      // fractal motion (same at every node)
      orbitSpeed: 0,
      breathAmp: 0.06,
      breathSpeed: 0.8,
      radiusAmp: 0.10,
      radiusSpeed: 0.7,
      rotatePerLevel: 0.0,
      globalSpin: 0.08,

      drawAllLevels: true,
      fit: "cover" as "cover" | "contain",

      // triangle tile look
      colorA: "#7aa7ff",
      colorB: "#6f3bff",
      tileSpin: 1.2,
      pulse: 0.5,
      edgeStroke: "rgba(255,255,255,0.25)",
    };

    // ---- offscreen triangular tile ----
    const tile = document.createElement("canvas");
    tile.width = 512; tile.height = 512;
    const tctx = tile.getContext("2d")!;

    function trianglePath(c: CanvasRenderingContext2D, side: number) {
      // Equilateral triangle centered at (0,0), pointing up
      const h = side * Math.sqrt(3) / 2;
      c.beginPath();
      c.moveTo(0, -h / 2);
      c.lineTo(-side / 2, h / 2);
      c.lineTo(side / 2,  h / 2);
      c.closePath();
    }

    function renderTile(t: number) {
      const s = tile.width;
      const half = s / 2;
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.clearRect(0, 0, s, s);
      tctx.save();
      tctx.translate(half, half);

      // Build a triangle clip that uses almost the whole tile (small margin)
      const side = s * 0.94;
      trianglePath(tctx, side);
      tctx.save();
      tctx.clip(); // everything we draw now is confined to the triangle

      // Fill with animated gradient, then a rotating star, all clipped to the triangle
      const maxR = s * 0.47;
      const r = maxR * (0.85 + 0.15 * Math.sin(t * 2.0) * p.pulse);

      const cg = (tctx as any).createConicGradient?.(t * 0.8, 0, 0);
      if (cg) {
        cg.addColorStop(0, p.colorA);
        cg.addColorStop(0.5, p.colorB);
        cg.addColorStop(1, p.colorA);
        tctx.fillStyle = cg;
      } else {
        const rg = tctx.createRadialGradient(0, 0, 0, 0, 0, r);
        rg.addColorStop(0, p.colorA);
        rg.addColorStop(1, p.colorB);
        tctx.fillStyle = rg;
      }
      tctx.fillRect(-half, -half, s, s); // clipped, so it's a triangle fill

      // Decorative star lines inside the triangle
      tctx.save();
      tctx.rotate(t * p.tileSpin);
      drawStar(tctx, 0, 0, r * 0.9, r * 0.45, 7);
      tctx.restore();

      // Soft edge vignette (still clipped)
      const vg = tctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.18)");
      tctx.fillStyle = vg;
      tctx.fillRect(-half, -half, s, s);

      tctx.restore(); // pop clip

      // Draw a subtle stroke on the triangle edge (outside the clip)
      tctx.strokeStyle = p.edgeStroke;
      tctx.lineWidth = Math.max(1, s * 0.004);
      trianglePath(tctx, side);
      tctx.stroke();

      tctx.restore();
    }

    function drawStar(c: CanvasRenderingContext2D, x: number, y: number, R: number, r: number, n: number) {
      c.beginPath();
      const step = Math.PI / n;
      c.moveTo(x, y - R);
      for (let i = 0; i < n * 2; i++) {
        const rr = i % 2 === 0 ? R : r;
        const a = -Math.PI / 2 + i * step;
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
      c.strokeStyle = "rgba(255,255,255,0.6)";
      c.lineWidth = Math.max(1, R * 0.04);
      c.stroke();
      c.fillStyle = "rgba(255,255,255,0.05)";
      c.fill();
    }

    function estimateRadius(depth: number, s: number, L: number) {
      const sum = s < 0.999 ? (1 - Math.pow(s, depth)) / (1 - s) : depth;
      return 1 + L * sum;
    }

    const start = performance.now();
    const loop = () => {
      const t = (performance.now() - start) / 1000;

      renderTile(t);

      // Same time-varying transform at every node → self-similar each frame
      const sDyn = p.baseScale * (1 + p.breathAmp * Math.sin(t * p.breathSpeed));
      const lDyn = p.baseSpread * (1 + p.radiusAmp * Math.sin(t * p.radiusSpeed));
      const orbit = t * p.orbitSpeed;

      // clear in CSS px
      ctx.fillStyle = p.background;
      ctx.fillRect(0, 0, W, H);

      // fit (cover/contain)
      const R = estimateRadius(p.depth, sDyn, lDyn) * 1.05;
      const pxPerWorld =
        (p.fit === "cover" ? Math.max(W, H) : Math.min(W, H)) / (2 * R);

      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(pxPerWorld, pxPerWorld);
      ctx.rotate(p.globalSpin * t);

      traverse(p.depth);
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);

      function traverse(level: number) {
        if (p.drawAllLevels || level === 0) {
          ctx.drawImage(tile, -0.5, -0.5, 1, 1); // tile fully occupies the triangle cell
          if (level === 0) return;
        }
        ctx.save();
        if (p.rotatePerLevel) ctx.rotate(p.rotatePerLevel);

        // Fixed equilateral triangle vertices (unit triangle in world space)
        const verts: readonly [number, number][] = [
          [0, -1],
          [-0.8660254, 0.5],
          [0.8660254, 0.5],
        ];

        // Orbit children around parent identically at every node
        const ca = Math.cos(orbit), sa = Math.sin(orbit);
        for (const [vx, vy] of verts) {
          const rx = vx * ca - vy * sa;
          const ry = vx * sa + vy * ca;
          ctx.save();
          ctx.translate(rx * lDyn, ry * lDyn);
          ctx.scale(sDyn, sDyn);
          traverse(level - 1);
          ctx.restore();
        }
        ctx.restore();
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} />
      <style jsx global>{`
        html, body { height: 100%; }
        body { margin: 0; background: #0b0b12; }
        canvas { width: 100vw; height: 100vh; display: block; }
      `}</style>
    </>
  );
}
