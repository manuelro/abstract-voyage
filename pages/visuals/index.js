// @ts-nocheck
import { useEffect } from "react";
import Head from "next/head";

// Shaders (kept outside and injected safely)
const STARFIELD_VERT = String.raw`
  // NOTE: ShaderMaterial already provides 'attribute vec3 position;'

  attribute vec2  aXY;
  attribute float aPhase, aSpeed, aHue, aSeed, aTrailIndex;

  uniform float u_time, u_dpr;
  uniform float u_spread, u_zBack, u_zFront;
  uniform float u_sizeFront, u_sizeBack;
  uniform float u_trailDt, u_trailStretch, u_phi, u_alphaFalloff, u_minCssPx;

  // flicker controls
  uniform float u_flickerFreqMin, u_flickerFreqMax;
  uniform float u_flickerAmpMin,  u_flickerAmpMax;
  uniform float u_flickerSharp; // higher = spikier flashes

  varying float v_alphaMul;
  varying float v_life;
  varying float v_hueMix;
  varying float v_flick;   // brightness/alpha multiplier
  varying float v_seed;    // for rotating the star glint per star

  void main(){
    // same path as head, evaluated at earlier time for each bead
    float t = u_time - aTrailIndex * (u_trailDt * u_trailStretch);

    // progress 0..1 along Z (wraps)
    float prog = fract(aPhase + t * aSpeed);

    // world position: XY in unit disk * spread, Z from back -> front (negative)
    vec3 p = vec3(aXY * u_spread, mix(u_zBack, u_zFront, prog));

    // MVP
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // size grows toward front; beads shrink by phi^i
    float cssSize = mix(u_sizeBack, u_sizeFront, prog);
    cssSize = max(cssSize, u_minCssPx);
    gl_PointSize = cssSize * pow(1.0 / u_phi, aTrailIndex) * u_dpr;

    // fade in from the back so recycled stars start invisible
    v_life     = smoothstep(0.0, 0.18, prog);
    v_alphaMul = pow(u_alphaFalloff, aTrailIndex);

    // --- natural flicker (per-star freq/phase/amp) ---
    float freq = mix(u_flickerFreqMin, u_flickerFreqMax, aSeed);   // Hz-ish
    float phase= aSeed * 10.0;
    float sharp= u_flickerSharp;

    float spike   = pow(0.5 + 0.5 * cos(6.2831853 * (u_time * freq + phase)), sharp);
    float shimmer = 0.35 * sin(6.2831853 * (u_time * (freq*2.17) + phase*1.3));
    float amp     = mix(u_flickerAmpMin, u_flickerAmpMax, fract(aSeed*1.7));

    v_flick = max(0.6, 1.0 + amp * spike + 0.15 * shimmer);

    v_hueMix = aHue;
    v_seed   = aSeed;
  }
`;

const STARFIELD_FRAG = String.raw`
  precision highp float;

  uniform vec3 u_coolTint, u_warmTint;

  varying float v_alphaMul, v_life, v_hueMix, v_flick;
  varying float v_seed;

  // rotate 2D vec by angle
  vec2 rot(vec2 p, float a){
    float c = cos(a), s = sin(a);
    return vec2(c*p.x - s*p.y, s*p.x + c*p.y);
  }

  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv);
    if (r > 0.5) discard;                      // circular sprite

    // silver marble look: bright core + soft body + tiny star glint
    float core = smoothstep(0.5, 0.0, r);
    core = pow(core, 1.35);

    // rotate glint per star (so crosses vary)
    float ang = fract(v_seed * 4237.31) * 6.2831853;
    vec2 v = rot(uv, ang);

    // subtle star cross (shiny twinkle)
    float cross = pow(max(0.0, 1.0 - abs(v.x)*2.0), 18.0)
                + pow(max(0.0, 1.0 - abs(v.y)*2.0), 18.0);

    // faint inner ring hint (glassy feel)
    float ring = smoothstep(0.30, 0.22, r) * (1.0 - smoothstep(0.22, 0.18, r));

    // near-white "silver" tint
    vec3 tint = mix(u_coolTint, u_warmTint, v_hueMix);

    vec3 col = tint * (0.78 + 0.65 * core);
    col += (0.35 * cross + 0.12 * ring) * tint;

    // opacity: life-in from back, fall along trail, soft edge, and flicker
    float alpha = v_life * v_alphaMul * core * v_flick;

    gl_FragColor = vec4(col * v_flick, alpha);
  }
`;

const Starfield = () => {
  useEffect(() => {
    const el = document.createElement("script");
    el.type = "module";

    const MODULE = `
      import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

      const CONFIG = {
        renderer: { dprCap: 2, alpha: true },
        camera:   { fov: 70, near: 0.01, far: 2000, z: 0 },

        // === YOUR FIELD SETTINGS ===
        field: {
          count: 900,
          spread: 72,
          zBack:  -150.0,
          zFront: -0.6,
          speedMin: 0.010,
          speedMax: 0.030
        },

        star: {
          sizeFrontPx: 7.0,
          sizeBackPx:   0.0,
          // near-white "silver" tints
          colorCool: [0.92, 0.94, 0.98],
          colorWarm: [0.98, 0.98, 0.98]
        },

        // bead trails that follow the exact path at earlier times
        trail: {
          count: 0,        // more beads = longer trails
          dt: 0.05,
          stretch: 8.0,     // slower speeds -> longer stretch for visible trails
          phi: 1.618,
          alphaFalloff: 0.97,
          minCssPx: 1.15
        },

        // no rotation (per your request)
        rotation: { yawSpeed: 0.0, pitchSpeed: 0.0 },

        // natural twinkle
        flicker: {
          freqMin: 0.5,   // Hz
          freqMax: 0.9,
          ampMin:  1,
          ampMax: 3,
          sharp:   70
        }
      };

      const STARFIELD_VERT = ${JSON.stringify(STARFIELD_VERT)};
      const STARFIELD_FRAG = ${JSON.stringify(STARFIELD_FRAG)};

      // Scene / camera / renderer
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        CONFIG.camera.fov,
        window.innerWidth / window.innerHeight,
        CONFIG.camera.near,
        CONFIG.camera.far
      );
      camera.position.z = CONFIG.camera.z;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      const DPR = Math.min(window.devicePixelRatio || 1, CONFIG.renderer.dprCap);
      renderer.setPixelRatio(DPR);
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.domElement);

      // Build attributes (heads + beads)
      const N = CONFIG.field.count;
      const T = CONFIG.trail.count;
      const REPS = T + 1;
      const M = N * REPS;

      const aXY     = new Float32Array(N * 2);
      const aPhase  = new Float32Array(N);
      const aSpeed  = new Float32Array(N);
      const aHue    = new Float32Array(N);
      const aSeed   = new Float32Array(N);

      for (let i = 0; i < N; i++) {
        const r = Math.sqrt(Math.random());
        const th = Math.random() * Math.PI * 2;
        aXY[2*i+0] = r * Math.cos(th);
        aXY[2*i+1] = r * Math.sin(th);
        aPhase[i]  = Math.random();
        aSpeed[i]  = CONFIG.field.speedMin + Math.random()*(CONFIG.field.speedMax - CONFIG.field.speedMin);
        aHue[i]    = Math.random();
        aSeed[i]   = Math.random();
      }

      const repXY     = new Float32Array(M * 2);
      const repPhase  = new Float32Array(M);
      const repSpeed  = new Float32Array(M);
      const repHue    = new Float32Array(M);
      const repSeed   = new Float32Array(M);
      const aTrailIdx = new Float32Array(M);

      for (let i = 0; i < N; i++) {
        for (let s = 0; s <= T; s++) {
          const idx = i*REPS + s;
          repXY[2*idx+0] = aXY[2*i+0];
          repXY[2*idx+1] = aXY[2*i+1];
          repPhase[idx]  = aPhase[i];
          repSpeed[idx]  = aSpeed[i];
          repHue[idx]    = aHue[i];
          repSeed[idx]   = aSeed[i];
          aTrailIdx[idx] = s;
        }
      }

      const geometry = new THREE.BufferGeometry();

      // Dummy 'position' keeps picky drivers happy; plus big bounds + no culling
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(M * 3), 3));

      geometry.setAttribute('aXY',         new THREE.BufferAttribute(repXY, 2));
      geometry.setAttribute('aPhase',      new THREE.BufferAttribute(repPhase, 1));
      geometry.setAttribute('aSpeed',      new THREE.BufferAttribute(repSpeed, 1));
      geometry.setAttribute('aHue',        new THREE.BufferAttribute(repHue, 1));
      geometry.setAttribute('aSeed',       new THREE.BufferAttribute(repSeed, 1));
      geometry.setAttribute('aTrailIndex', new THREE.BufferAttribute(aTrailIdx, 1));

      const { zBack, zFront, spread } = CONFIG.field;
      const zMid = (zBack + zFront) * 0.5;
      const depth = Math.abs(zBack - zFront);
      const radius = Math.sqrt(spread*spread + 0.25*depth*depth) * 2.2;
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0,0,zMid), radius);

      const material = new THREE.ShaderMaterial({
        vertexShader: STARFIELD_VERT,
        fragmentShader: STARFIELD_FRAG,
        uniforms: {
          u_time:      { value: 0.0 },
          u_dpr:       { value: DPR },

          u_spread:    { value: spread },
          u_zBack:     { value: zBack },
          u_zFront:    { value: zFront },

          u_sizeFront: { value: CONFIG.star.sizeFrontPx },
          u_sizeBack:  { value: CONFIG.star.sizeBackPx },

          u_coolTint:  { value: new THREE.Vector3(...CONFIG.star.colorCool) },
          u_warmTint:  { value: new THREE.Vector3(...CONFIG.star.colorWarm) },

          u_trailDt:       { value: CONFIG.trail.dt },
          u_trailStretch:  { value: CONFIG.trail.stretch },
          u_phi:           { value: CONFIG.trail.phi },
          u_alphaFalloff:  { value: CONFIG.trail.alphaFalloff },
          u_minCssPx:      { value: CONFIG.trail.minCssPx },

          // flicker
          u_flickerFreqMin: { value: CONFIG.flicker.freqMin },
          u_flickerFreqMax: { value: CONFIG.flicker.freqMax },
          u_flickerAmpMin:  { value: CONFIG.flicker.ampMin },
          u_flickerAmpMax:  { value: CONFIG.flicker.ampMax },
          u_flickerSharp:   { value: CONFIG.flicker.sharp },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false
      });

      const stars = new THREE.Points(geometry, material);
      stars.frustumCulled = false;
      scene.add(stars);

      // Animate
      const clock = new THREE.Clock();
      function tick(){
        requestAnimationFrame(tick);
        material.uniforms.u_time.value = clock.getElapsedTime();
        renderer.render(scene, camera);
      }
      tick();

      // Resize
      window.addEventListener('resize', () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(dpr);
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      });

      // Live tweak: lengthen trails without reload
      window.STARFIELD = {
        setTrailStretch(v){ material.uniforms.u_trailStretch.value = Math.max(0.1, v); }
      };
    `;

    el.textContent = MODULE;
    document.body.appendChild(el);
    return () => document.body.removeChild(el);
  }, []);

  return (
    <>
      <Head>
        <title>Space Field — Silver Star Marbles</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          html, body { margin: 0; height: 100%; width: 100%; background: #000 !important; overflow: hidden; } /* very dark */
          canvas { display: block; }
        `}</style>
      </Head>
    </>
  );
};

export default Starfield;
