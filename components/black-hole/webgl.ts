import { vertexShader } from './shaders'

export type Program = { handle: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> }
export type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer; size: number }

export function createProgram(gl: WebGL2RenderingContext, fragment: string, names: string[]): Program {
  const shaders: WebGLShader[] = []
  const handle = gl.createProgram()
  if (!handle) throw new Error('Unable to allocate WebGL program')
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexShader], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Unable to allocate shader')
      shaders.push(shader)
      gl.attachShader(handle, shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(`Shader compilation failed:\n${gl.getShaderInfoLog(shader)}`)
      }
    }
    gl.linkProgram(handle)
    if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) {
      throw new Error(`Program linking failed:\n${gl.getProgramInfoLog(handle)}`)
    }
    const uniforms: Program['uniforms'] = {}
    for (const name of names) uniforms[name] = gl.getUniformLocation(handle, name)
    return { handle, uniforms }
  } catch (error) {
    for (const shader of shaders) gl.detachShader(handle, shader)
    gl.deleteProgram(handle)
    throw error
  } finally {
    for (const shader of shaders) {
      if (gl.isProgram(handle)) gl.detachShader(handle, shader)
      gl.deleteShader(shader)
    }
  }
}

export function createTexture(gl: WebGL2RenderingContext) {
  const texture = gl.createTexture()
  if (!texture) throw new Error('Unable to allocate texture')
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return texture
}

export function createTarget(gl: WebGL2RenderingContext, size: number): Target {
  const texture = createTexture(gl)
  const framebuffer = gl.createFramebuffer()
  if (!framebuffer) { gl.deleteTexture(texture); throw new Error('Unable to allocate framebuffer') }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE || gl.getError() !== gl.NO_ERROR) {
    gl.deleteFramebuffer(framebuffer)
    gl.deleteTexture(texture)
    throw new Error('Incomplete black-hole render target')
  }
  return { texture, framebuffer, size }
}

export function deleteTarget(gl: WebGL2RenderingContext, target: Target) {
  gl.deleteFramebuffer(target.framebuffer)
  gl.deleteTexture(target.texture)
}

export function bindTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, unit: number) {
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, texture)
}

export function draw(gl: WebGL2RenderingContext, program: Program, target: Target | null, width: number, height: number) {
  gl.useProgram(program.handle)
  gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null)
  gl.viewport(0, 0, target?.size ?? width, target?.size ?? height)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}
