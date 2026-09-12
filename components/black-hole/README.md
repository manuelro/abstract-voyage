# Black hole

View `/black-hole` with `npm run dev`. Append `?debug` for frame rate, lens target size and display DPR. No new dependencies are required.

The 2D terminal canvas includes 160 CSS pixels of overscan and is also the WebGL sky texture. Its upload is flipped once; the lens, bloom and final composite then share y-up coordinates. The final pass samples that same texture directly outside the lens. Display resolution is capped at DPR 2; the bounded lens target adapts independently from 0.65–1.5 pixels per CSS pixel (1.15 maximum on coarse-pointer devices), with a 1800-pixel allocation ceiling. Bloom runs at one quarter of the lens resolution in each dimension.

The Schwarzschild integrator uses up to 144 adaptive leapfrog steps and evaluates disk intersections along each ray, including repeated crossings. A narrow band at the critical impact parameter uses four subpixel rays to resolve the emergent photon ring. The disk retains the source's blackbody temperature profile, relativistic frequency shift, Doppler beaming and angularly periodic turbulence. A finite-camera weak-field approximation takes over outside the disk tracing radius. Displacement smoothly goes to zero before the render-target boundary. Only disk emission contributes to the separable bloom pass.

Reduced motion renders a still frame and disables pointer drift. Hidden tabs stop rendering. Resize, DPR changes and restored WebGL contexts rebuild the necessary resources; unmount cancels the loop and releases all GL objects and listeners. Failed initialization retains the terminal with a static CSS fallback.

## Attribution

`shaders.ts` adapts `blackhole.glsl` from [s0xDk/ghostty-blackhole](https://github.com/s0xDk/ghostty-blackhole), commit `b49fa0ab2eaf0644a690f4cb386d70c21eb9f969`. Copyright (c) 2026 s13k <s13k@pm.me>, MIT. The full required notice is in `LICENSE.ghostty-blackhole`.

The source credits Eric Bruneton's black-hole rendering research as inspiration; this port contains no Bruneton implementation code. This is a non-rotating Schwarzschild model with an artistic finite terminal sky and lens falloff, not a Kerr spacetime simulation.

## Validation

Production build and scoped Next core-web-vitals ESLint checks pass. Chrome/ANGLE Metal on an Apple M2 Pro measured 60 FPS at 1440×900 and 2560×1440, both at DPR 2. A 390×844 touch-device emulation at DPR 3 (capped internally to 2) also measured 60 FPS; physical phone GPU performance has not been measured.

Browser checks covered 1280×800, 1440×900, 1920×1080, 2560×1440, 390×844 and 844×390; a live DPR switch to 1.25; still rendering under reduced motion; spring response; context loss/restoration; and complete resource/RAF disposal on client-side navigation. Screenshot pixel comparisons outside the lens matched the owned terminal canvas exactly at DPR 2 and 1.25. Injected WebGL unavailability, shader compilation failure, link failure, incomplete framebuffer and texture allocation failure all retained the static fallback without a production error UI.
