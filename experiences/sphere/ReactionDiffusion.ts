import * as THREE from 'three'

export type RDOptions = {
  /** Simulation texture width (height defaults to width/2 for equirect) */
  width?: number
  height?: number
  /** Gray–Scott params */
  diffA?: number
  diffB?: number
  feed?: number
  kill?: number
  /** Sim speed multiplier */
  speed?: number
  /** Apply latitude-aware longitudinal scaling to approximate equal-speed on a sphere */
  metricCorrection?: boolean
}

/**
 * Minimal, WebGL1-friendly Gray–Scott RD ping-pong simulation in UV (equirect 2:1).
 * Produces a filament map suitable for use as a MeshStandardMaterial.emissiveMap.
 */
export class ReactionDiffusion {
  private renderer: THREE.WebGLRenderer
  private rtA: THREE.WebGLRenderTarget
  private rtB: THREE.WebGLRenderTarget
  private outRT: THREE.WebGLRenderTarget
  private simScene: THREE.Scene
  private brushScene: THREE.Scene
  private dispScene: THREE.Scene
  private cam: THREE.OrthographicCamera
  private simQuad: THREE.Mesh
  private brushQuad: THREE.Mesh
  private dispQuad: THREE.Mesh

  private uniforms = {
    prevTex: { value: null as THREE.Texture | null },
    texelSize: { value: new THREE.Vector2(1, 1) },
    diffA: { value: 1.0 },
    diffB: { value: 0.5 },
    feed:  { value: 0.055 },
    kill:  { value: 0.062 },
    dt:    { value: 1/60 },
    metricCorrection: { value: 1.0 },
  }

  private brushUniforms = {
    prevTex: { value: null as THREE.Texture | null },
    texelSize: { value: new THREE.Vector2(1, 1) },
    center: { value: new THREE.Vector2(0.5, 0.5) },
    radiusPx: { value: 12.0 },
    strength: { value: 0.9 },
  }

  private displayUniforms = {
    stateTex: { value: null as THREE.Texture | null },
    texelSize: { value: new THREE.Vector2(1, 1) },
    pow:   { value: 1.25 },
    gamma: { value: 1.0 },
  }

  constructor(renderer: THREE.WebGLRenderer, opts: RDOptions = {}) {
    this.renderer = renderer

    const w = Math.max(64, Math.floor(opts.width ?? 512))
    const h = Math.max(32, Math.floor(opts.height ?? Math.floor(w / 2)))
    const isGL2 = renderer.capabilities.isWebGL2
    const type = isGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType

    const common: THREE.WebGLRenderTargetOptions = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.RepeatWrapping,       // wrap around longitude
      wrapT: THREE.ClampToEdgeWrapping,  // clamp at poles
      depthBuffer: false,
      stencilBuffer: false,
      type,
      format: THREE.RGBAFormat,
      colorSpace: THREE.LinearSRGBColorSpace as any,
    }

    this.rtA = new THREE.WebGLRenderTarget(w, h, common)
    this.rtB = new THREE.WebGLRenderTarget(w, h, common)
    this.outRT = new THREE.WebGLRenderTarget(w, h, { ...common, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter })

    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const plane = new THREE.PlaneGeometry(2, 2)

    // SIM pass
    this.uniforms.prevTex.value = this.rtA.texture
    this.uniforms.texelSize.value.set(1 / w, 1 / h)
    this.uniforms.diffA.value = opts.diffA ?? 1.0
    this.uniforms.diffB.value = opts.diffB ?? 0.5
    this.uniforms.feed.value  = opts.feed  ?? 0.055
    this.uniforms.kill.value  = opts.kill  ?? 0.062
    this.uniforms.metricCorrection.value = (opts.metricCorrection ?? true) ? 1.0 : 0.0

    const simMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */`
        varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D prevTex;
        uniform vec2 texelSize;
        uniform float diffA, diffB, feed, kill, dt, metricCorrection;

        vec2 sample(vec2 uv){ return texture2D(prevTex, uv).xy; }

        void main(){
          vec2 uv = vUv;

          // Metric correction: slow down longitudinal diffusion near poles.
          float c = mix(1.0, max(0.05, cos((uv.y - 0.5) * 3.14159265)), metricCorrection);
          vec2 dx = vec2(texelSize.x * c, 0.0);
          vec2 dy = vec2(0.0, texelSize.y);

          vec2 center = sample(uv);
          vec2 lap = sample(uv+dx) + sample(uv-dx) + sample(uv+dy) + sample(uv-dy) - 4.0*center;

          float A = center.x;
          float B = center.y;

          float reaction = A * B * B;
          float dA = diffA * lap.x - reaction + feed * (1.0 - A);
          float dB = diffB * lap.y + reaction - (kill + feed) * B;

          A = clamp(A + dA * dt, 0.0, 1.0);
          B = clamp(B + dB * dt, 0.0, 1.0);

          gl_FragColor = vec4(A, B, 0.0, 1.0);
        }
      `,
      depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    })

    this.simScene = new THREE.Scene()
    this.simQuad = new THREE.Mesh(plane.clone(), simMat)
    this.simScene.add(this.simQuad)

    // BRUSH pass (seed B)
    this.brushUniforms.prevTex.value = this.rtA.texture
    this.brushUniforms.texelSize.value.set(1 / w, 1 / h)
    const brushMat = new THREE.ShaderMaterial({
      uniforms: this.brushUniforms,
      vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D prevTex;
        uniform vec2 center, texelSize;
        uniform float radiusPx, strength;

        void main(){
          vec2 uv = vUv;
          vec4 cur = texture2D(prevTex, uv);

          float r = radiusPx * texelSize.x;
          float d = distance(uv, center);
          float s = smoothstep(r, 0.0, d);   // 1 at center → 0 at edge

          float A = cur.x;
          float B = cur.y;

          B = max(B, s * strength);
          A = max(A, 1.0 - 0.5 * s);

          gl_FragColor = vec4(A, B, 0.0, 1.0);
        }
      `,
      depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    })
    this.brushScene = new THREE.Scene()
    this.brushQuad = new THREE.Mesh(plane.clone(), brushMat)
    this.brushScene.add(this.brushQuad)

    // DISPLAY pass → filament grayscale
    this.displayUniforms.stateTex.value = this.rtA.texture
    this.displayUniforms.texelSize.value.set(1 / w, 1 / h)
    const dispMat = new THREE.ShaderMaterial({
      uniforms: this.displayUniforms,
      vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D stateTex;
        uniform vec2 texelSize;
        uniform float pow, gamma;

        float BAt(vec2 uv){ return texture2D(stateTex, uv).y; }

        void main(){
          float B = BAt(vUv);

          // Simple band-pass edge to emphasize thin filaments
          float b1 = BAt(vUv + vec2( texelSize.x, 0.0));
          float b2 = BAt(vUv + vec2(-texelSize.x, 0.0));
          float b3 = BAt(vUv + vec2(0.0,  texelSize.y));
          float b4 = BAt(vUv + vec2(0.0, -texelSize.y));
          float edge = abs(4.0*B - (b1+b2+b3+b4));

          float v = clamp(pow(edge + B * 0.4, pow), 0.0, 1.0);
          v = pow(v, gamma);

          gl_FragColor = vec4(vec3(v), 1.0);
        }
      `,
      depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    })
    this.dispScene = new THREE.Scene()
    this.dispQuad = new THREE.Mesh(plane.clone(), dispMat)
    this.dispScene.add(this.dispQuad)

    // Initialize state (A≈1, B≈0 with tiny noise)
    this.initState(w, h)
  }

  private renderTo(target: THREE.WebGLRenderTarget, scene: THREE.Scene) {
    const prev = this.renderer.getRenderTarget()
    this.renderer.setRenderTarget(target)
    this.renderer.clear()
    this.renderer.render(scene, this.cam)
    this.renderer.setRenderTarget(prev)
  }

  private initState(_w: number, _h: number) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
      fragmentShader: `
        precision highp float; varying vec2 vUv;
        float n(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){
          float noise = n(vUv*1024.0)*0.02;
          float A = 1.0 - noise;
          float B = noise*0.3;
          gl_FragColor = vec4(A,B,0.0,1.0);
        }
      `,
      depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    })
    const s = new THREE.Scene()
    s.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat))
    this.renderTo(this.rtA, s)
    mat.dispose()
  }

  /** Advance sim and refresh display texture */
  step(dt: number, speed = 1.0) {
    (this.simQuad.material as THREE.ShaderMaterial).uniforms.prevTex.value = this.rtA.texture
    ;(this.simQuad.material as THREE.ShaderMaterial).uniforms.dt.value = Math.max(0.0, dt * Math.max(0.0, speed))
    this.renderTo(this.rtB, this.simScene)

    // Robust swap (no temp identifiers to collide)
    ;[this.rtA, this.rtB] = [this.rtB, this.rtA]

    ;(this.dispQuad.material as THREE.ShaderMaterial).uniforms.stateTex.value = this.rtA.texture
    this.renderTo(this.outRT, this.dispScene)
  }

  /** Seed a circular brush in UV space (0..1). */
  brush(uv: THREE.Vector2, radiusPx: number, strength = 0.9) {
    (this.brushQuad.material as THREE.ShaderMaterial).uniforms.prevTex.value = this.rtA.texture
    ;(this.brushQuad.material as THREE.ShaderMaterial).uniforms.center.value.copy(uv)
    ;(this.brushQuad.material as THREE.ShaderMaterial).uniforms.radiusPx.value = radiusPx
    ;(this.brushQuad.material as THREE.ShaderMaterial).uniforms.strength.value = strength
    this.renderTo(this.rtB, this.brushScene)

    // Robust swap
    ;[this.rtA, this.rtB] = [this.rtB, this.rtA]
  }

  /** Resulting texture for MeshStandardMaterial.emissiveMap */
  get outputTexture(): THREE.Texture { return this.outRT.texture }

  dispose() {
    this.rtA.dispose(); this.rtB.dispose(); this.outRT.dispose()
    this.simQuad.geometry.dispose(); (this.simQuad.material as THREE.ShaderMaterial).dispose()
    this.brushQuad.geometry.dispose(); (this.brushQuad.material as THREE.ShaderMaterial).dispose()
    this.dispQuad.geometry.dispose(); (this.dispQuad.material as THREE.ShaderMaterial).dispose()
  }
}
