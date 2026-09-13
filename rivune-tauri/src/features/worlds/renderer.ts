import { worldIndex } from './catalog.js';
import { fragment } from './shader.js';

export function mountWorlds(): void {
  const root = document.documentElement;
  const host = document.querySelector('.cosmos');
  if (!host) return;
  const canvas = document.createElement('canvas'); canvas.className = 'world-scene'; canvas.setAttribute('aria-hidden', 'true'); host.append(canvas);
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) { root.dataset.worldRenderer = 'fallback'; return; }
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('Ambient renderer unavailable'); }
    return shader;
  };
  let program: WebGLProgram;
  try {
    const vertex = compile(gl.VERTEX_SHADER, 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}');
    const pixel = compile(gl.FRAGMENT_SHADER, fragment);
    program = gl.createProgram()!; gl.attachShader(program, vertex); gl.attachShader(program, pixel); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(pixel);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Ambient renderer unavailable');
  } catch { canvas.remove(); root.dataset.worldRenderer = 'fallback'; return; }
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const uniform = Object.fromEntries(['resolution','time','scene'].map(name => [name, gl.getUniformLocation(program,name)]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let elapsed = 0, frame = 0, last = 0, painted = 0, lost = false;
  const active = () => root.dataset.worlds === 'true';
  const moving = () => active() && !lost && !document.hidden && !reduce.matches && root.dataset.motion !== 'off' && root.dataset.environment !== 'focused';
  function draw() {
    if (!active() || lost) return;
    const scale = Math.min(1, 1100 / innerWidth, 800 / innerHeight);
    const width = Math.round(innerWidth * scale), height = Math.round(innerHeight * scale);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl!.viewport(0,0,width,height); }
    const index = Math.max(0, worldIndex(root.dataset.worldScene || 'ocean'));
    gl!.uniform2f(uniform.resolution,width,height); gl!.uniform1f(uniform.time,elapsed);
    gl!.uniform1f(uniform.scene,index); gl!.drawArrays(gl!.TRIANGLES,0,6);
  }
  function tick(now: number) {
    frame = 0; if (!moving()) return;
    const delta = last ? Math.min((now-last)/1000,.1) : 0; last = now;
    elapsed += delta;
    if (now-painted >= 1000/24) { draw(); painted = now; }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (frame) cancelAnimationFrame(frame); frame = 0; last = 0;
    draw(); if (moving()) frame = requestAnimationFrame(tick);
  }
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-backdrop','data-world-scene','data-worlds','data-motion','data-environment']});
  document.addEventListener('visibilitychange',sync); reduce.addEventListener('change',sync);
  window.addEventListener('resize',sync);
  canvas.addEventListener('webglcontextlost',event => { event.preventDefault(); lost=true; root.dataset.worldRenderer='fallback'; sync(); });
  // A lost GPU context falls back to a static environment until the app is reopened.
  root.dataset.worldRenderer='webgl'; sync();
}
