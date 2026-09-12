const MONO = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace'
export const TEXTURE_PADDING = 160

const source = `// Schwarzschild spacetime · null geodesic integration
precision highp float;

const float SCHWARZSCHILD_RADIUS = 1.0;
const float PHOTON_SPHERE = 1.5;
const float CRITICAL_IMPACT = 2.598076211;
const float SKY_DISTANCE = 13.0;

struct Ray {
    vec3 position;
    vec3 direction;
    float angularMomentum;
    float opticalDepth;
};

// Light follows the curvature of spacetime.
vec3 acceleration(vec3 x, float h2) {
    float r2 = dot(x, x);
    float invR = inversesqrt(r2);
    return -1.5 * h2 * x * pow(invR, 5.0);
}

void integrate(inout Ray ray, float dt) {
    vec3 a = acceleration(ray.position, ray.angularMomentum);
    ray.direction += 0.5 * dt * a;
    ray.position += dt * ray.direction;
    ray.direction += 0.5 * dt * acceleration(
        ray.position, ray.angularMomentum
    );
}

// The innermost stable circular orbit is at 3 r_s.
float temperature(float radius, float innerRadius) {
    float profile = 1.0 - sqrt(innerRadius / radius);
    return pow(innerRadius / radius, 0.75)
         * pow(max(profile, 0.0), 0.25) / 0.488;
}

vec3 traceGeodesic(Ray ray) {
    vec3 radiance = vec3(0.0);
    float transmission = 1.0;
    for (int step = 0; step < MAX_STEPS; ++step) {
        float radius = length(ray.position);
        if (radius < SCHWARZSCHILD_RADIUS) break;
        float dt = clamp(0.09 * radius, 0.015, 1.3);
        vec3 previous = ray.position;
        integrate(ray, dt);
        if (crossesDisk(previous, ray.position)) {
            radiance += transmission * diskEmission(ray);
            transmission *= exp(-ray.opticalDepth);
        }
    }
    return radiance + transmission * sampleSky(ray);
}

// Gravitational redshift and relativistic Doppler beaming.
float frequencyShift(vec3 velocity, vec3 photon, float r) {
    float dilation = sqrt(max(1.0 - 1.5 / r, 0.02));
    float doppler = 1.0 + dot(velocity, photon);
    return dilation / max(doppler, 0.05);
}

vec3 sampleSky(Ray ray) {
    vec3 direction = normalize(ray.direction);
    float distance = (-SKY_DISTANCE - ray.position.z)
                   / direction.z;
    vec2 uv = project(ray.position + direction * distance);
    return texture(terminalFramebuffer, uv).rgb;
}

// A photon can cross the disk more than once.
// Higher-order images accumulate at the critical curve.
export async function createObservatory(device: GPUDevice) {
    const target = allocateFramebuffer(device, viewport);
    const spectrum = await loadBlackbodySpectrum();
    return new RenderPipeline({
        target,
        spectrum,
        integration: 'leapfrog',
        metric: 'schwarzschild',
        captureRadius: 1.0,
        boundary: 'asymptotically-flat',
    });
}

const frame = renderer.beginFrame();
frame.bindTexture('terminal', terminalTexture);
frame.setUniform('observer', camera.position);
frame.integrateNullGeodesics();
frame.resolveEmission({ exposure: 1.15 });
frame.compositeBloom({ threshold: 0.55 });
frame.present();

// Observer time differs from the local proper time.
const properTime = coordinateTime * gravitationalDilation;
const orbitalVelocity = Math.sqrt(mass / orbitalRadius);
const conservedEnergy = dot(momentum, killingVector);
assert(Number.isFinite(conservedEnergy));

$ observatory trace --metric schwarzschild --precision high
[init]  compiling geodesic integrator ................ ready
[init]  allocating terminal sky texture ............. ready
[init]  resolving disk-plane intersections ......... ready
[trace] capture surface           r = 1.000000 r_s
[trace] unstable photon orbit     r = 1.500000 r_s
[trace] critical impact           b = 2.598076 r_s
[trace] background projection     z = -13.0000 r_s
[trace] conserved angular momentum verified
[done]  all render targets complete; observer online

// Nothing escapes the horizon. The light goes around it.

// renderer.ts — observer and framebuffer orchestration
import { mat4, vec3 } from './linear-algebra';
import { Spectrum } from './radiometry';

interface Observer {
    position: Float64Array;
    orientation: Quaternion;
    exposure: number;
    properTime: number;
}

const options = {
    antialias: false,
    alpha: false,
    depth: false,
    powerPreference: 'high-performance',
};
const context = canvas.getContext('webgl2', options);
const limits = queryDeviceLimits(context);
const sky = createTexture({ format: 'rgba8', filter: 'linear' });
const emission = createTarget(viewport.extent);
const bloom = createTarget(viewport.extent / 4);

function resizeObserver(width: number, height: number) {
    const aspect = width / height;
    const ratio = Math.min(devicePixelRatio, 2.0);
    observer.projection = mat4.orthographic(aspect);
    observer.viewport.set([width, height]);
    sky.upload(terminal.draw(width, height, ratio));
    emission.resize(computeLensExtent(observer));
    bloom.resize(emission.width / 4);
}

// Keep the terminal sky in the observer's reference frame.
function screenToWorld(uv: Vector2): Vector3 {
    const displacement = uv.subtract(observer.center);
    const impact = displacement.multiply(observer.scale);
    return new Vector3(impact.x, impact.y, CAMERA_DISTANCE);
}

function renderFrame(timestamp: number) {
    const delta = Math.min(timestamp - clock.previous, 50);
    clock.advance(delta);
    observer.spring.integrate(delta);
    pipeline.bindFramebuffer(emission);
    pipeline.setViewport(emission.width, emission.height);
    pipeline.bindProgram(geodesicProgram);
    pipeline.setUniform('coordinateTime', clock.seconds);
    pipeline.setUniform('cameraPosition', observer.position);
    pipeline.setUniform('lensDepth', 13.0);
    pipeline.bindTexture('background', sky);
    pipeline.drawFullscreenTriangle();

    // Isolate accretion light so terminal text stays crisp.
    pipeline.extractEmission(emission, bloom);
    pipeline.blurSeparable(bloom, { radius: 3.23 });
    pipeline.composite({ background: sky, emission, bloom });
    pipeline.present();
    clock.previous = timestamp;
}

// Tangential velocity of gas in the disk's orbital plane.
vec3 orbitalDirection(vec3 normal, vec3 intersection) {
    return normalize(cross(normal, intersection));
}

float orbitalBeta(float radius) {
    return inversesqrt(2.0 * (radius - 1.0));
}

vec3 emittedSpectrum(float radius, vec3 direction) {
    vec3 velocity = orbitalDirection(diskNormal, position);
    float beta = orbitalBeta(radius);
    float shift = frequencyShift(beta * velocity, direction, radius);
    float kelvin = temperature(radius, innerEdge) * peakTemperature;
    vec3 spectrum = blackbody(kelvin * shift);
    return spectrum * pow(shift, beamingExponent);
}

// Conservation diagnostics, measured along the affine parameter.
function auditTrajectory(samples: ReadonlyArray<RaySample>) {
    const reference = samples[0].angularMomentum;
    return samples.map((sample, index) => ({
        step: index,
        radius: sample.position.length(),
        deviation: Math.abs(sample.angularMomentum - reference),
        captured: sample.radius < eventHorizon,
    }));
}

$ observatory inspect --framebuffer --spectral-response
[system] observer camera initialized at spatial infinity
[system] background plane is finite; boundary samples mirrored
[system] disk emission integrated in observer order
[system] high-order intersections preserved
[system] output transfer function applied to emission only
[system] terminal sky remains in display-referred space
[system] collecting trajectory diagnostics ...
`.split('\n')

function diagnosticLine(index: number) {
  const ray = Math.floor(index / 5)
  const impact = 2.42 + ray * 0.00871
  const values = [
    `[ray ${String(ray).padStart(4, '0')}] b = ${impact.toFixed(6)} r_s  /  affine integration`,
    `    angular momentum  ${(impact * impact).toFixed(8)}  [conserved]`,
    `    closest approach  ${(1.31 + ray * 0.01037).toFixed(8)} r_s`,
    `    frequency ratio   ${(0.73 + 0.21 * Math.sin(ray * 0.31)).toFixed(8)}`,
    `    exit condition    ${impact < 2.598076 ? 'horizon captured' : 'sky plane resolved'}`,
  ]
  return values[index % values.length]
}

const keywords = /^(?:const|float|vec[234]|void|struct|return|if|for|int|export|async|function|await|new|break|inout|precision|highp)$/

/** One owned source for both the initial canvas and every lensed sample.
 * Draw beyond all viewport edges so escaping rays discover actual extra code. */
export function drawTerminal(canvas: HTMLCanvasElement, width: number, height: number, ratio: number) {
  const pad = TEXTURE_PADDING
  canvas.width = Math.round((width + pad * 2) * ratio)
  canvas.height = Math.round((height + pad * 2) * ratio)
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Terminal canvas unavailable')
  ctx.setTransform(canvas.width / (width + pad * 2), 0, 0, canvas.height / (height + pad * 2), 0, 0)
  ctx.fillStyle = '#080a0c'
  ctx.fillRect(0, 0, width + pad * 2, height + pad * 2)
  const fontSize = width < 600 ? 10.5 : Math.min(13, Math.max(11.5, width / 125))
  const lineHeight = fontSize * 1.75
  const colWidth = Math.max(610, width > 1800 ? 730 : 630)
  ctx.font = `400 ${fontSize}px ${MONO}`
  ctx.textBaseline = 'middle'
  const charWidth = ctx.measureText('M').width
  const rows = Math.ceil((height + pad * 2) / lineHeight)
  const columns = Math.ceil((width + pad * 2) / colWidth)
  for (let col = 0; col < columns; col++) {
    const x = pad + (width < 600 ? 25 : 40) + col * colWidth
    for (let row = 0; row < rows; row++) {
      const index = row + col * (rows + 5)
      const line = source[index] ?? diagnosticLine(index - source.length)
      const y = row * lineHeight + 8
      // Deterministic per-line luminance, with gentle falloff at the UI edges.
      const screenY = y - pad
      const edge = Math.min(1, Math.max(0.22, Math.min(screenY + 30, height - screenY + 20) / 140))
      ctx.globalAlpha = (0.47 + 0.13 * Math.sin(index * 1.73)) * edge
      ctx.fillStyle = '#525b62'
      ctx.fillText(String(index + 1).padStart(3, '0'), x - charWidth * 5, y)
      let offset = x
      const commentAt = line.indexOf('//')
      const tokens = line.match(/\s+|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\w\s]/g) || []
      let consumed = 0
      for (const token of tokens) {
        ctx.fillStyle = commentAt >= 0 && consumed >= commentAt ? '#6d7b83'
          : keywords.test(token) ? '#b5a3b9'
          : /^\d/.test(token) ? '#9fb3a3'
          : /^[A-Z_]{3,}$/.test(token) ? '#c0ad95'
          : token.startsWith('$') ? '#9cb7bd' : '#b8bec4'
        ctx.fillText(token, offset, y)
        offset += token.length * charWidth
        consumed += token.length
      }
    }
  }
  ctx.globalAlpha = 1
}
