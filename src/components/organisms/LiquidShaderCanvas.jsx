import { useEffect, useRef } from 'react'

const VERTEX = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`
const FRAGMENT = `
precision highp float;
uniform vec2 r,m,o;
uniform float t,a,k,b,c,p,z;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){float v=0.,q=.52;for(int i=0;i<5;i++){if(i<3||(i==3&&z>.25)||(i==4&&z>.72)){v+=q*n(p);}p=p*2.03+13.7;q*=.48;}return v;}
void main(){
 vec2 uv=gl_FragCoord.xy/r;vec2 q=uv-o;q.x*=r.x/r.y;
 vec2 mm=m/r-o;mm.x*=r.x/r.y;
 float cursor=exp(-8.*length(q-mm))*(.25+k*.7);
 float wash=fb(q*3.2+vec2(t*.025,-t*.018)+cursor)-.5;
 vec2 s=vec2(abs(q.x),q.y+.012);float compact=exp(-11.2*dot(s*vec2(1.08,1.48),s*vec2(1.08,1.48)));
 float flow=fb(s*(5.8+c*2.)+vec2(-t*(.012+c*.018),t*.01+a*.7))*.72+fb(s*13.4-vec2(t*.01,0.))*.28;
 float bassLobe=exp(-65.*dot(s-vec2(.105,-.075),s-vec2(.105,-.075)))*b;
 float choirWing=(exp(-82.*dot(s-vec2(.105,.07),s-vec2(.105,.07)))+exp(-125.*dot(s-vec2(.045,.145),s-vec2(.045,.145))))*c;
 float choirLobe=choirWing*(.72+.28*sin(t*.85+s.y*18.));
 float pulseRing=(.5+.5*sin(length(s)*82.-t*9.))*exp(-18.*dot(s,s))*p;
 float ink=smoothstep(.5,.69,flow+compact*.24+bassLobe*.22+choirLobe*.2+pulseRing*.16)*compact;
 ink+=smoothstep(.08,.018,length(s-vec2(.075,-.01)))*(.25+.2*b+.16*c);
 ink*=smoothstep(.34,.065,length(q))*smoothstep(.002,.15,a);
 vec3 pigment=mix(vec3(.055,.052,.05),vec3(.16,.105,.08),clamp(flow*.7,0.,1.));
 float watercolor=cursor*abs(wash)*(.05+.12*k);
 vec3 color=mix(vec3(.17,.13,.11),pigment,smoothstep(0.,.8,ink));
 gl_FragColor=vec4(color,clamp(ink*(.72+.25*a)+watercolor,0.,.9));
}`

export default function LiquidShaderCanvas({ getWaveformValues, bassActive, choirActive, pulseActive }) {
  const canvasRef = useRef(null)
  const activityRef = useRef({ bassActive, choirActive, pulseActive })
  useEffect(() => { activityRef.current = { bassActive, choirActive, pulseActive } }, [bassActive, choirActive, pulseActive])
  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false })
    if (!gl) return undefined
    const shader = (type, source) => { const value = gl.createShader(type); gl.shaderSource(value, source); gl.compileShader(value); return value }
    const program = gl.createProgram(); gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT)); gl.linkProgram(program); gl.useProgram(program)
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const uniforms = Object.fromEntries(['r','m','o','t','a','k','b','c','p','z'].map((name) => [name, gl.getUniformLocation(program, name)]))
    const pointer = { x: innerWidth / 2, y: innerHeight / 2, impact: 0 }
    const move = (event) => { pointer.x = event.clientX; pointer.y = innerHeight - event.clientY }
    const press = (event) => { pointer.x = event.clientX; pointer.y = innerHeight - event.clientY; pointer.impact = Math.min(1.5, pointer.impact + .75) }
    const impact = (event) => { pointer.x = event.detail.x; pointer.y = innerHeight - event.detail.y; pointer.impact = Math.min(1.5, pointer.impact + event.detail.strength) }
    window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('pointerdown', press, { passive: true }); window.addEventListener('ls-liquid-impact', impact)
    const levels = [
      { scale: 1, interval: 40, shader: 1 },
      { scale: .78, interval: 50, shader: .58 },
      { scale: .62, interval: 66, shader: .18 },
    ]
    let level = 0; let pressureUntil = 0; let stableSince = performance.now(); let raf; let last = 0; let smoothedAudio = 0
    const renderTimes = []; const smoothedActivity = { b: 0, c: 0, p: 0 }
    const observer = typeof PerformanceObserver === 'undefined' ? null : new PerformanceObserver((list) => {
      if (list.getEntries().some((entry) => entry.duration > 55)) pressureUntil = performance.now() + 6000
    })
    try { observer?.observe({ type: 'longtask', buffered: true }) } catch { observer?.disconnect() }
    const draw = (now) => {
      raf = requestAnimationFrame(draw)
      const profile = levels[level]
      if (document.hidden || now - last < profile.interval) return
      const frameGap = now - last
      last = now
      const audioIsActive = activityRef.current.bassActive || activityRef.current.choirActive || activityRef.current.pulseActive
      if (audioIsActive && frameGap > profile.interval * 2.7) pressureUntil = Math.max(pressureUntil, now + 3500)
      if (now < pressureUntil && level < levels.length - 1) { level += 1; stableSince = now }
      const activeProfile = levels[level]
      const dpr = Math.min(devicePixelRatio || 1, 1) * activeProfile.scale; const width = Math.round(innerWidth * dpr); const height = Math.round(innerHeight * dpr)
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height) }
      let audio = 0; const values = getWaveformValues?.(); if (values?.length) { for (let i = 0; i < values.length; i += 4) audio += values[i] * values[i]; audio = Math.min(1, Math.sqrt(audio / Math.ceil(values.length / 4)) * 4) }
      smoothedAudio += (audio - smoothedAudio) * (audio > smoothedAudio ? .24 : .018)
      pointer.impact *= .925
      const activity = activityRef.current
      const targets = { b: activity.bassActive ? 1 : 0, c: activity.choirActive ? 1 : 0, p: activity.pulseActive ? 1 : 0 }
      for (const key of ['b', 'c', 'p']) smoothedActivity[key] += (targets[key] - smoothedActivity[key]) * (targets[key] > smoothedActivity[key] ? .065 : .025)
      const renderStart = performance.now()
      const portrait = innerWidth <= 1280
      const inkCenterY = portrait ? (innerHeight / innerWidth > 1.15 ? .79 : .67) : .5
      gl.uniform2f(uniforms.r, width, height); gl.uniform2f(uniforms.m, pointer.x * dpr, pointer.y * dpr); gl.uniform2f(uniforms.o, .5, inkCenterY); gl.uniform1f(uniforms.t, now / 1000); gl.uniform1f(uniforms.a, smoothedAudio); gl.uniform1f(uniforms.k, pointer.impact); gl.uniform1f(uniforms.b, smoothedActivity.b); gl.uniform1f(uniforms.c, smoothedActivity.c); gl.uniform1f(uniforms.p, smoothedActivity.p); gl.uniform1f(uniforms.z, activeProfile.shader); gl.drawArrays(gl.TRIANGLES, 0, 6)
      renderTimes.push(performance.now() - renderStart); if (renderTimes.length > 45) renderTimes.shift()
      const averageRender = renderTimes.reduce((sum, value) => sum + value, 0) / renderTimes.length
      if (averageRender > 8 && level < levels.length - 1) { level += 1; pressureUntil = now + 6000; stableSince = now }
      else if (level > 0 && now > pressureUntil && averageRender < 4 && now - stableSince > 12000) { level -= 1; stableSince = now }
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); observer?.disconnect(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', press); window.removeEventListener('ls-liquid-impact', impact) }
  }, [getWaveformValues])
  return <canvas className="ls-liquid" ref={canvasRef} aria-hidden="true" />
}
