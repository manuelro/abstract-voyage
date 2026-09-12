// Adapted from s0xDk/ghostty-blackhole, blackhole.glsl (MIT).
// Copyright (c) 2026 s13k <s13k@pm.me>. Full notice: LICENSE.ghostty-blackhole.
// Browser port retains the Schwarzschild kick-drift-kick integrator, disk
// crossings, Keplerian turbulence, blackbody spectrum and Doppler beaming.

export const vertexShader = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vUv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const lensShader = `#version 300 es
/*
Adapted from https://github.com/s0xDk/ghostty-blackhole
MIT License

Copyright (c) 2026 s13k <s13k@pm.me>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uBackground;
uniform vec2 uViewport;
uniform vec2 uCenter;
uniform float uExtent;
uniform float uRadius;
uniform float uPadding;
uniform float uTime;
uniform float uEnergy;
uniform float uRoll;
uniform float uLensResolution;
#define B_CRIT 2.5980762
const float LENS_DEPTH = 13.0;
struct DiskLook {
    float temp, incl, roll, inner, outer, opac, dopp, beam,
          gain, contr, wind, speed, expo;
};
vec3 background(vec2 uv) {
    vec2 padded = (uv * uViewport + uPadding) / (uViewport + 2.0 * uPadding);
    // Canvas upload is flipped once; all subsequent coordinates are y-up.
    return texture(uBackground, 1.0 - abs(1.0 - mod(padded, 2.0))).rgb;
}
float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

// value noise whose y lattice wraps every perY cells — used for the disk's
// angular dimension so the streaks tile seamlessly across the atan branch cut
// (perY must be an integer; y must advance by exactly perY per full turn)
float vnoiseWrapY(vec2 p, float perY) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float y0 = mod(i.y, perY), y1 = mod(i.y + 1.0, perY);
    return mix(mix(hash21(vec2(i.x, y0)),       hash21(vec2(i.x + 1.0, y0)), f.x),
               mix(hash21(vec2(i.x, y1)),       hash21(vec2(i.x + 1.0, y1)), f.x),
               f.y);
}

// mirrored repeat keeps lensed samples on-screen without edge smearing
vec2 mirrorUV(vec2 u) { return 1.0 - abs(1.0 - mod(u, 2.0)); }

vec2 rot(vec2 v, float a) {
    float c = cos(a), s = sin(a);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

// blackbody color from temperature in Kelvin (Tanner Helland fit, normalized)
vec3 blackbody(float T) {
    float t = clamp(T, 1500.0, 40000.0) / 100.0;
    float r = t <= 66.0 ? 1.0
                        : clamp(1.292936 * pow(t - 60.0, -0.1332047), 0.0, 1.0);
    float g = t <= 66.0 ? clamp(0.3900816 * log(t) - 0.6318414, 0.0, 1.0)
                        : clamp(1.1298909 * pow(t - 60.0, -0.0755148), 0.0, 1.0);
    float b = t >= 66.0 ? 1.0
                        : (t <= 19.0 ? 0.0
                                     : clamp(0.5432068 * log(t - 10.0) - 1.1962540, 0.0, 1.0));
    return vec3(r, g, b);
}


vec4 tracePixel(vec2 uv) {
    vec2 center = uCenter;
    float aspect = uViewport.x / uViewport.y;
    float rh = uRadius / uViewport.y;
    vec2 p = (uv - center) * vec2(aspect, 1.0);
    float plen = length(p);
    float W = B_CRIT / rh;
    DiskLook L = DiskLook(8200.0, 1.46, uRoll, 2.2, 7.0, 0.85,
                         0.65, 2.5, 1.1 * uEnergy, 1.55, 9.0, 1.2, 1.15);
    float rin = L.inner, rout = L.outer;
    float t = uTime;
    float dil = 0.25;
    // WebGL and the flipped canvas upload share a y-up frame; Ghostty
    // instead flips both the incoming screen ray and the outgoing sky ray.
    vec2 pr = rot(p, L.roll) * W;
    float b = length(pr);
    float window = exp(-pow(plen / (7.0 * rh), 2.0))
                 * (1.0 - smoothstep(4.5 * rh, 7.0 * rh, plen));
    float bmax = rout + 3.0;
    float Z0 = max(14.0, rout + 5.0);
    if (window <= 0.00001) return vec4(background(uv), 0.0);
    // Finite-camera weak-field fit from Ghostty. Fade displacement, never
    // crossfade two copies of the text. The outer boundary is exactly identity.
    if (b >= bmax) {
        float u = Z0 * inversesqrt(Z0 * Z0 + b * b);
        float defl = (2.0 / (W * W)) / max(plen, 1e-4)
                   * (1.29 * u + 0.07) * max(LENS_DEPTH - 2.14 * u + 0.75, 0.0) * window;
        vec2 dir = p / max(plen, 1e-5);
        vec3 term;
        float ab = 0.012 * smoothstep(1.0, 2.0, b / bmax);
        for (int i = 0; i < 3; i++) {
            vec2 sp = p - dir * defl * (1.0 + (float(i) - 1.0) * ab);
            term[i] = background(center + sp / vec2(aspect, 1.0))[i];
        }
        return vec4(term, 0.0);
    }
    // ====================== near field: trace the geodesic ==================
    // Parallel rays from a distant camera at +z. The hole is at the origin,
    // r_s = 1. Integrate  x'' = -(3/2) h² x / r⁵  (exact Schwarzschild photon
    // bending; h = |x×v| is conserved, so it's computed once).
    vec3  x  = vec3(pr, Z0);
    vec3  v  = vec3(0.0, 0.0, -1.0);
    float h2 = dot(pr, pr);

    // disk plane: normal tilted DISK_INCL about the screen x-axis
    float ci = cos(L.incl), si = sin(L.incl);
    vec3  n  = vec3(0.0, si, ci);
    vec3  e2 = vec3(0.0, ci, -si);      // in-plane axis completing (x̂, e2, n)
    float sdir = L.speed < 0.0 ? -1.0 : 1.0;
    float spd  = abs(L.speed);

    vec3  emitc = vec3(0.0);            // accumulated disk light (HDR)
    float trans = 1.0;                  // transmittance toward the background
    bool  captured = false;
    float sPrev = dot(x, n);
    vec3  xPrev = x;

    for (int i = 0; i < 144; i++) {
        float r2 = dot(x, x);
        if (r2 < 1.0) { captured = true; break; }        // through the horizon
        if (x.z < -Z0 && v.z < 0.0) break;               // escaped out the back
        if (r2 > 4.0 * Z0 * Z0) break;                   // flung far sideways
        float r  = sqrt(r2);
        // step scales with radius: fine near the photon sphere, coarse far
        // out (the far cap is loose — bending falls off as 1/r^4, and longer
        // approach/exit strides leave more of the 144 budget for the
        // strongly curved region)
        float dt = clamp(0.09 * r, 0.015, 1.3);
        // leapfrog (kick-drift-kick) keeps the near-critical orbits stable
        vec3 a = -1.5 * h2 * x / (r2 * r2 * r);
        v += a * (0.5 * dt);
        x += v * dt;
        r2 = dot(x, x);
        r  = sqrt(r2);
        a  = -1.5 * h2 * x / (r2 * r2 * r);
        v += a * (0.5 * dt);

        // ---- thin-disk crossing: the ray pierced the disk plane ----
        float s = dot(x, n);
        if (s * sPrev < 0.0 && trans > 0.02) {
            float tc = sPrev / (sPrev - s);
            vec3  xc = mix(xPrev, x, tc);
            float rc = length(xc);
            if (rc > rin && rc < rout) {
                float band = smoothstep(rin, rin * 1.25, rc)
                           * (1.0 - smoothstep(rout * 0.70, rout, rc));

                // disk-plane polar coords for the streak texture
                float phi   = atan(dot(xc, e2), xc.x);
                float turns = phi / 6.2831853;
                float kep   = pow(rin / rc, 1.5);
                // √(1 − 1.5/r): time runs slower for the inner orbits — the
                // pattern visibly freezes toward the inner edge; dil winds the
                // whole disk down as the hole grows
                float gloc  = sqrt(max(1.0 - 1.5 / rc, 0.02));
                float swirl = rc * L.wind * 0.12 - t * kep * spd * gloc * dil * sdir;
                float streaks = vnoiseWrapY(vec2(rc * 2.8, turns * 19.0 + swirl * 3.0), 19.0) * 0.50 +
                                vnoiseWrapY(vec2(rc * 1.0, turns * 9.0  + swirl * 1.5 + 7.0), 9.0) * 0.28 +
                                vnoiseWrapY(vec2(rc * 16.0, turns * 47.0 + swirl * 4.0), 47.0) * 0.22;
                streaks = 0.35 + L.contr * streaks * streaks;

                // relativistic Doppler + gravitational shift for gas on a
                // circular geodesic: g = √(1 − 1.5/r) / (1 − β·k̂), with the
                // photon direction at the crossing taken from the ray itself
                vec3  gasdir = normalize(cross(n, xc)) * sdir;
                float beta   = clamp(inversesqrt(max(2.0 * (rc - 1.0), 0.2)), 0.0, 0.99);
                float g      = gloc / max(1.0 + beta * dot(gasdir, normalize(v)), 0.05);
                g = mix(1.0, g, L.dopp);

                // Shakura–Sunyaev temperature profile, peak normalized to 1
                float xpr   = max(1.0 - sqrt(rin / rc), 0.0);
                float tprof = pow(rin / rc, 0.75) * pow(xpr, 0.25) / 0.488;
                vec3  cbb   = blackbody(L.temp * tprof * g);      // doppler-shifted color
                float boost = pow(g, L.beam);                     // relativistic beaming

                float density = band * streaks;
                emitc += trans * cbb * (L.gain * 2.2 * density * tprof * tprof * boost);
                trans *= 1.0 - clamp(L.opac * density, 0.0, 1.0);
            }
        }
        sPrev = s;
        xPrev = x;
    }
    // rays still wound up near the photon sphere when the budget ran out are
    // as good as captured
    if (!captured && dot(x, x) < 4.0) captured = true;

    // ---- background: where did the escaped ray come from? ----
    vec3 bg = vec3(0.0);
    if (!captured) {
        vec3 d = normalize(v);

        if (d.z < -0.05) {
            // project the straight exit ray onto the terminal sky plane at
            // z = -LENS_DEPTH and map back to screen space
            float tpl = (-LENS_DEPTH - x.z) / d.z;
            vec3  hp  = x + d * tpl;
            vec2  q   = rot(hp.xy, -L.roll) / W;
            vec2  sp  = q;
            // the *displacement* is faded by window/shield, never the color —
            // a continuous warp leaves no seam at the work area or far field
            vec2 suv = center + (p + (sp - p) * window) / vec2(aspect, 1.0);
            // rays bent past ~90° never reach the sky plane behind the hole;
            // they fade to the starfield instead of sampling garbage
            float toward = smoothstep(0.05, 0.35, -d.z);
            bg += background(suv) * toward;
        }
    }

    vec3 disk = vec3(1.0) - exp(-emitc * L.expo);
    vec3 col = bg * trans + disk;
    // Alpha carries disk-only emission to the bloom pass: code never blooms.
    return vec4(col, max(disk.r, max(disk.g, disk.b)));
}
void main() {
    vec2 uv = uCenter + (vUv - 0.5) * uExtent / uViewport;
    float impact = length((uv - uCenter) * uViewport) * B_CRIT / uRadius;
    // The emergent higher-order image is subpixel wide. Integrate four rays
    // only in this narrow band to preserve the photon ring on small displays.
    // This filters real disk crossings; no artificial ring is drawn.
    if (abs(impact - B_CRIT) < 0.09) {
        vec2 px = 0.25 * uExtent / (uLensResolution * uViewport);
        fragColor = 0.25 * (tracePixel(uv + px) + tracePixel(uv - px)
                  + tracePixel(uv + vec2(px.x, -px.y))
                  + tracePixel(uv + vec2(-px.x, px.y)));
    } else {
        fragColor = tracePixel(uv);
    }
}
`;

export const blurShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform vec2 uDirection;
uniform bool uExtract;
vec3 light(vec2 uv) {
    vec4 s = texture(uSource, uv);
    return uExtract ? max(s.rgb - 0.55, 0.0) * s.a : s.rgb;
}
void main() {
    vec3 sum = light(vUv) * 0.227027;
    sum += (light(vUv + uDirection * 1.384615) + light(vUv - uDirection * 1.384615)) * 0.316216;
    sum += (light(vUv + uDirection * 3.230769) + light(vUv - uDirection * 3.230769)) * 0.070270;
    fragColor = vec4(sum, 1.0);
}
`;

export const compositeShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uBackground;
uniform sampler2D uLens;
uniform sampler2D uBloom;
uniform vec2 uViewport;
uniform vec2 uCenter;
uniform float uExtent;
uniform float uRadius;
uniform float uPadding;
void main() {
    vec2 padded = (vUv * uViewport + uPadding) / (uViewport + 2.0 * uPadding);
    vec3 bg = texture(uBackground, padded).rgb;
    vec2 local = (vUv - uCenter) * uViewport / uExtent + 0.5;
    float r = length((vUv - uCenter) * uViewport) / uRadius;
    // Fade ends before the render-target edge; source coordinates and canvas
    // metrics are shared, including at fractional DPR and adaptive resolution.
    float influence = 1.0 - smoothstep(6.0, 7.0, r);
    if (influence > 0.0) {
        vec3 lens = texture(uLens, local).rgb;
        vec3 bloom = texture(uBloom, local).rgb;
        bg = mix(bg, lens + bloom * 0.48, influence);
    }
    fragColor = vec4(bg, 1.0);
}
`;
