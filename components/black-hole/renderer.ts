import { blurShader, compositeShader, lensShader } from './shaders'
import { drawTerminal, TEXTURE_PADDING } from './terminalTexture'
import { bindTexture, createProgram, createTarget, createTexture, deleteTarget, draw, Program, Target } from './webgl'

type Options = {
  canvas: HTMLCanvasElement
  background: HTMLCanvasElement
  host: HTMLElement
  debug: HTMLOutputElement | null
}

/** All animation state stays here, outside React. Returns a complete disposer. */
export function createRenderer({ canvas, background, host, debug }: Options) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' })
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const pointer = matchMedia('(hover: hover) and (pointer: fine)')
  let reduced = motion.matches
  let disposed = false, failed = false, raf = 0, ready = false
  let width = 0, height = 0, dpr = 0, displayRatio = 1, quality = 1.35
  let radius = 0, extent = 0, dirty = true
  let previous = 0, elapsed = 19, frames = 0, sampleTime = 0, cooldown = 0
  let targetX = 0, targetY = 0, positionX = 0, positionY = 0, velocityX = 0, velocityY = 0
  let lens: Program, blur: Program, composite: Program
  let sky: WebGLTexture | null = null, vao: WebGLVertexArrayObject | null = null
  const programs: Program[] = []
  const scenePrograms: Program[] = []
  let targets: Target[] = []
  const debugEnabled = new URLSearchParams(location.search).has('debug')
  if (debug) debug.hidden = !debugEnabled

  function release() {
    if (!gl) return
    for (const target of targets) deleteTarget(gl, target)
    targets = []
    for (const program of programs) gl.deleteProgram(program.handle)
    programs.length = 0
    scenePrograms.length = 0
    if (sky) gl.deleteTexture(sky)
    if (vao) gl.deleteVertexArray(vao)
    sky = null; vao = null
  }

  function fail(error: unknown) {
    failed = true
    cancelAnimationFrame(raf)
    host.dataset.renderer = 'fallback'
    if (process.env.NODE_ENV !== 'production') console.error('[black-hole]', error)
    release()
  }

  function resizeTargets() {
    if (!gl || !sky) return
    // Allocate a complete replacement first, retaining the old targets on error.
    const replacement: Target[] = []
    try {
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
      const size = Math.min(max, 1800, Math.max(256, Math.round(extent * quality)))
      replacement.push(createTarget(gl, size))
      replacement.push(createTarget(gl, Math.max(64, Math.round(size / 4))))
      replacement.push(createTarget(gl, Math.max(64, Math.round(size / 4))))
    } catch (error) {
      replacement.forEach(target => deleteTarget(gl, target))
      throw error
    }
    targets.forEach(target => deleteTarget(gl, target))
    targets = replacement
  }

  function resize() {
    const rect = host.getBoundingClientRect()
    width = Math.max(1, rect.width); height = Math.max(1, rect.height)
    dpr = window.devicePixelRatio || 1
    const max = gl && !gl.isContextLost() ? gl.getParameter(gl.MAX_TEXTURE_SIZE) as number : 8192
    displayRatio = Math.min(dpr, 2, max / (Math.max(width, height) + TEXTURE_PADDING * 2))
    drawTerminal(background, width, height, displayRatio)
    background.style.width = `${width + TEXTURE_PADDING * 2}px`
    background.style.height = `${height + TEXTURE_PADDING * 2}px`
    canvas.width = Math.round(width * displayRatio)
    canvas.height = Math.round(height * displayRatio)
    radius = Math.min(width, height) * (width < 600 ? 0.086 : 0.07)
    extent = radius * 14.5
    if (gl && sky && !failed && !gl.isContextLost()) {
      bindTexture(gl, sky, 0)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, background)
      if (gl.getError() !== gl.NO_ERROR) throw new Error('Terminal texture upload failed')
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      resizeTargets()
    }
    dirty = false
  }

  function setup() {
    if (!gl) { host.dataset.renderer = 'fallback'; return }
    failed = false
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)
    vao = gl.createVertexArray()
    if (!vao) throw new Error('Unable to allocate fullscreen geometry')
    gl.bindVertexArray(vao)
    const sceneUniforms = ['uBackground', 'uViewport', 'uCenter', 'uExtent', 'uRadius', 'uPadding']
    lens = createProgram(gl, lensShader, [...sceneUniforms, 'uTime', 'uEnergy', 'uRoll', 'uLensResolution']); programs.push(lens)
    blur = createProgram(gl, blurShader, ['uSource', 'uDirection', 'uExtract']); programs.push(blur)
    composite = createProgram(gl, compositeShader, [...sceneUniforms, 'uLens', 'uBloom']); programs.push(composite)
    scenePrograms.push(lens, composite)
    sky = createTexture(gl)
    quality = Math.min(dpr || window.devicePixelRatio || 1, pointer.matches ? 1.5 : 1.15)
    dirty = true
  }

  function frame(now: number) {
    raf = 0
    if (disposed || document.hidden || failed || !gl || !sky || gl.isContextLost()) return
    try {
      if (dirty || dpr !== window.devicePixelRatio) resize()
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 1 / 60
      const frameMs = previous ? now - previous : 16.7
      previous = now
      if (!reduced) elapsed += dt
      const tx = reduced || !pointer.matches ? 0 : targetX
      const ty = reduced || !pointer.matches ? 0 : targetY
      // Critically damped spring in CSS pixels; slow response, bounded force.
      velocityX += ((tx - positionX) * 5 - velocityX * 4.5) * dt
      velocityY += ((ty - positionY) * 5 - velocityY * 4.5) * dt
      positionX += velocityX * dt; positionY += velocityY * dt
      const driftX = reduced ? 0 : Math.sin(elapsed * 0.071) * radius * 0.022
      const driftY = reduced ? 0 : Math.sin(elapsed * 0.093 + 1) * radius * 0.016
      const cx = (width < 600 ? 0.5 : 0.415) + (positionX + driftX) / width
      const cy = 0.52 + (positionY + driftY) / height
      gl.bindVertexArray(vao)
      bindTexture(gl, sky, 0)
      for (const p of scenePrograms) {
        gl.useProgram(p.handle)
        gl.uniform1i(p.uniforms.uBackground, 0)
        gl.uniform2f(p.uniforms.uViewport, width, height)
        gl.uniform2f(p.uniforms.uCenter, cx, cy)
        gl.uniform1f(p.uniforms.uExtent, extent)
        gl.uniform1f(p.uniforms.uRadius, radius)
        gl.uniform1f(p.uniforms.uPadding, TEXTURE_PADDING)
      }
      gl.useProgram(lens.handle)
      gl.uniform1f(lens.uniforms.uLensResolution, targets[0].size)
      gl.uniform1f(lens.uniforms.uTime, elapsed)
      gl.uniform1f(lens.uniforms.uEnergy, reduced ? 1 : 1 + 0.015 * Math.sin(elapsed * 0.31))
      gl.uniform1f(lens.uniforms.uRoll, 0.13 + positionX * 0.0008)
      draw(gl, lens, targets[0], canvas.width, canvas.height)
      gl.useProgram(blur.handle)
      gl.uniform1i(blur.uniforms.uSource, 1)
      bindTexture(gl, targets[0].texture, 1)
      gl.uniform1i(blur.uniforms.uExtract, 1)
      gl.uniform2f(blur.uniforms.uDirection, 1 / targets[1].size, 0)
      draw(gl, blur, targets[1], 0, 0)
      bindTexture(gl, targets[1].texture, 1)
      gl.uniform1i(blur.uniforms.uExtract, 0)
      gl.uniform2f(blur.uniforms.uDirection, 0, 1 / targets[2].size)
      draw(gl, blur, targets[2], 0, 0)
      bindTexture(gl, targets[0].texture, 1)
      bindTexture(gl, targets[2].texture, 2)
      gl.useProgram(composite.handle)
      gl.uniform1i(composite.uniforms.uLens, 1)
      gl.uniform1i(composite.uniforms.uBloom, 2)
      draw(gl, composite, null, canvas.width, canvas.height)
      if (!ready) { host.dataset.renderer = 'webgl'; ready = true }
      // RAF timing includes GPU backpressure without synchronously reading pixels.
      // Hysteresis prevents resolution oscillation, and leaves geodesics intact.
      frames++; sampleTime += Math.min(frameMs, 100); cooldown += dt
      if (sampleTime > 1600) {
        const fps = frames * 1000 / sampleTime
        if (debugEnabled && debug) debug.value = `${fps.toFixed(0)} FPS  /  ${targets[0].size}²  /  DPR ${displayRatio.toFixed(2)}`
        if (!reduced && cooldown > 4) {
          const ceiling = Math.min(dpr, pointer.matches ? 1.5 : 1.15)
          const next = fps < 48 ? Math.max(0.65, quality * 0.85) : fps > 58 ? Math.min(ceiling, quality + 0.08) : quality
          if (Math.abs(next - quality) > 0.025) { quality = next; resizeTargets(); cooldown = 0 }
        }
        frames = 0; sampleTime = 0
      }
      // Reduced motion is a still image, refreshed only for viewport changes.
      if (!reduced) raf = requestAnimationFrame(frame)
    } catch (error) { fail(error) }
  }

  function wake() {
    if (!raf && !disposed && !document.hidden && !failed && gl) raf = requestAnimationFrame(frame)
  }
  function onResize() {
    dirty = true
    if (!gl || failed) { try { resize() } catch (error) { fail(error) } }
    else wake()
  }
  function onPointer(event: PointerEvent) {
    if (reduced || !pointer.matches || event.pointerType === 'touch') return
    const reach = Math.min(width, height) * 0.009
    targetX = (event.clientX / width - 0.5) * reach * 2
    targetY = (0.5 - event.clientY / height) * reach * 2
  }
  function resetPointer() { targetX = 0; targetY = 0 }
  function onMotion() {
    reduced = motion.matches
    if (reduced) { positionX = 0; positionY = 0; velocityX = 0; velocityY = 0; resetPointer() }
    previous = 0; wake()
  }
  function onVisibility() {
    cancelAnimationFrame(raf); raf = 0; previous = 0
    frames = 0; sampleTime = 0
    if (!document.hidden) wake()
  }
  function onLost(event: Event) {
    event.preventDefault()
    cancelAnimationFrame(raf); raf = 0; ready = false; failed = true
    host.dataset.renderer = 'fallback'
    // Loss invalidates every GL object. Discard them now, before a restored
    // context can mistake the old handles for objects from a different epoch.
    release()
  }
  function onRestored() {
    release()
    try { setup(); previous = 0; wake() } catch (error) { fail(error) }
  }
  // DPR changes also invalidate the owned texture while reduced-motion is idle.
  let pixelQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
  function onDpr() {
    pixelQuery.removeEventListener('change', onDpr)
    pixelQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    pixelQuery.addEventListener('change', onDpr)
    onResize()
  }
  // Some display/emulation switches change DPR without a resize or media
  // event. The animated loop catches these; a still scene needs a cheap poll.
  const dprPoll = window.setInterval(() => {
    if (reduced && !document.hidden && dpr !== window.devicePixelRatio) onDpr()
  }, 1000)
  const observer = new ResizeObserver(onResize)
  observer.observe(host)
  window.addEventListener('resize', onResize)
  window.addEventListener('pointermove', onPointer, { passive: true })
  document.addEventListener('pointerleave', resetPointer)
  window.addEventListener('blur', resetPointer)
  document.addEventListener('visibilitychange', onVisibility)
  motion.addEventListener('change', onMotion)
  pixelQuery.addEventListener('change', onDpr)
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)
  try { resize(); setup(); wake() } catch (error) { fail(error) }

  return () => {
    disposed = true
    cancelAnimationFrame(raf)
    observer.disconnect()
    window.clearInterval(dprPoll)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointermove', onPointer)
    document.removeEventListener('pointerleave', resetPointer)
    window.removeEventListener('blur', resetPointer)
    document.removeEventListener('visibilitychange', onVisibility)
    motion.removeEventListener('change', onMotion)
    pixelQuery.removeEventListener('change', onDpr)
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
    release()
    delete host.dataset.renderer
  }
}
