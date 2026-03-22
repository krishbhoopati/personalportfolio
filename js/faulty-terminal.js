// FaultyTerminal — ported from react-bits to vanilla WebGL
// Source: https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/FaultyTerminal/FaultyTerminal.jsx

(function () {
  // ─── Config ───────────────────────────────────────────────────────────────
  var CFG = {
    digitSize:           1.7,
    scale:               1.4,
    timeScale:           0.8,
    scanlineIntensity:   1.5,
    curvature:           0.3,
    tint:                '#00ff41',
    brightness:          0.8,
    gridMul:             [2, 1],
    glitchAmount:        1,
    flickerAmount:       1,
    noiseAmp:            1,
    chromaticAberration: 0,
    dither:              0,
    mouseReact:          true,
    mouseStrength:       0.5,
    pageLoadAnimation:   true,
  };

  // ─── Shaders (verbatim from source) ───────────────────────────────────────
  var VERT = [
    'attribute vec2 position;',
    'attribute vec2 uv;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = vec4(position, 0.0, 1.0);',
    '}',
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform float iTime;',
    'uniform vec3  iResolution;',
    'uniform float uScale;',
    'uniform vec2  uGridMul;',
    'uniform float uDigitSize;',
    'uniform float uScanlineIntensity;',
    'uniform float uGlitchAmount;',
    'uniform float uFlickerAmount;',
    'uniform float uNoiseAmp;',
    'uniform float uChromaticAberration;',
    'uniform float uDither;',
    'uniform float uCurvature;',
    'uniform vec3  uTint;',
    'uniform vec2  uMouse;',
    'uniform float uMouseStrength;',
    'uniform float uUseMouse;',
    'uniform float uPageLoadProgress;',
    'uniform float uUsePageLoadAnimation;',
    'uniform float uBrightness;',

    'float time;',

    'float hash21(vec2 p){',
    '  p = fract(p * 234.56);',
    '  p += dot(p, p + 34.56);',
    '  return fract(p.x * p.y);',
    '}',

    'float noise(vec2 p) {',
    '  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2;',
    '}',

    'mat2 rotate(float angle) {',
    '  float c = cos(angle);',
    '  float s = sin(angle);',
    '  return mat2(c, -s, s, c);',
    '}',

    'float fbm(vec2 p) {',
    '  p *= 1.1;',
    '  float f = 0.0;',
    '  float amp = 0.5 * uNoiseAmp;',
    '  mat2 modify0 = rotate(time * 0.02);',
    '  f += amp * noise(p);',
    '  p = modify0 * p * 2.0;',
    '  amp *= 0.454545;',
    '  mat2 modify1 = rotate(time * 0.02);',
    '  f += amp * noise(p);',
    '  p = modify1 * p * 2.0;',
    '  amp *= 0.454545;',
    '  mat2 modify2 = rotate(time * 0.08);',
    '  f += amp * noise(p);',
    '  return f;',
    '}',

    'float pattern(vec2 p, out vec2 q, out vec2 r) {',
    '  vec2 offset1 = vec2(1.0);',
    '  vec2 offset0 = vec2(0.0);',
    '  mat2 rot01 = rotate(0.1 * time);',
    '  mat2 rot1 = rotate(0.1);',
    '  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));',
    '  r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));',
    '  return fbm(p + r);',
    '}',

    'float digit(vec2 p) {',
    '  vec2 grid = uGridMul * 15.0;',
    '  vec2 s = floor(p * grid) / grid;',
    '  p = p * grid;',
    '  vec2 q, r;',
    '  float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;',
    '  if(uUseMouse > 0.5) {',
    '    vec2 mouseWorld = uMouse * uScale;',
    '    float distToMouse = distance(s, mouseWorld);',
    '    float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;',
    '    intensity += mouseInfluence;',
    '    float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;',
    '    intensity += ripple;',
    '  }',
    '  if(uUsePageLoadAnimation > 0.5) {',
    '    float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);',
    '    float cellDelay = cellRandom * 0.8;',
    '    float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);',
    '    float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);',
    '    intensity *= fadeAlpha;',
    '  }',
    '  p = fract(p);',
    '  p *= uDigitSize;',
    '  float px5 = p.x * 5.0;',
    '  float py5 = (1.0 - p.y) * 5.0;',
    '  float x = fract(px5);',
    '  float y = fract(py5);',
    '  float i = floor(py5) - 2.0;',
    '  float j = floor(px5) - 2.0;',
    '  float n = i * i + j * j;',
    '  float f = n * 0.0625;',
    '  float isOn = step(0.1, intensity - f);',
    '  float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);',
    '  return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;',
    '}',

    'float onOff(float a, float b, float c) {',
    '  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;',
    '}',

    'float displace(vec2 look) {',
    '  float y = look.y - mod(iTime * 0.25, 1.0);',
    '  float window = 1.0 / (1.0 + 50.0 * y * y);',
    '  return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;',
    '}',

    'vec3 getColor(vec2 p) {',
    '  float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;',
    '  bar *= uScanlineIntensity;',
    '  float displacement = displace(p);',
    '  p.x += displacement;',
    '  if (uGlitchAmount != 1.0) {',
    '    float extra = displacement * (uGlitchAmount - 1.0);',
    '    p.x += extra;',
    '  }',
    '  float middle = digit(p);',
    '  const float off = 0.002;',
    '  float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +',
    '              digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +',
    '              digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));',
    '  vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;',
    '  return baseColor;',
    '}',

    'vec2 barrel(vec2 uv) {',
    '  vec2 c = uv * 2.0 - 1.0;',
    '  float r2 = dot(c, c);',
    '  c *= 1.0 + uCurvature * r2;',
    '  return c * 0.5 + 0.5;',
    '}',

    'void main() {',
    '  time = iTime * 0.333333;',
    '  vec2 uv = vUv;',
    '  if(uCurvature != 0.0) { uv = barrel(uv); }',
    '  vec2 p = uv * uScale;',
    '  vec3 col = getColor(p);',
    '  if(uChromaticAberration != 0.0) {',
    '    vec2 ca = vec2(uChromaticAberration) / iResolution.xy;',
    '    col.r = getColor(p + ca).r;',
    '    col.b = getColor(p - ca).b;',
    '  }',
    '  col *= uTint;',
    '  col *= uBrightness;',
    '  if(uDither > 0.0) {',
    '    float rnd = hash21(gl_FragCoord.xy);',
    '    col += (rnd - 0.5) * (uDither * 0.003922);',
    '  }',
    '  gl_FragColor = vec4(col, 1.0);',
    '}',
  ].join('\n');

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function compileShader(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('FaultyTerminal shader error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function createProgram(gl, vertSrc, fragSrc) {
    var vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('FaultyTerminal link error:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var tintRgb = hexToRgb(CFG.tint);

    // Canvas
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block;';
    document.body.insertBefore(canvas, document.body.firstChild);

    // WebGL
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) { console.error('FaultyTerminal: WebGL not supported'); return; }
    gl.clearColor(0, 0, 0, 1);

    var program = createProgram(gl, VERT, FRAG);
    if (!program) return;
    gl.useProgram(program);

    // Fullscreen triangle — positions and UVs
    var posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    var uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), gl.STATIC_DRAW);
    var uvLoc = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    var U = {};
    var names = [
      'iTime','iResolution','uScale','uGridMul','uDigitSize','uScanlineIntensity',
      'uGlitchAmount','uFlickerAmount','uNoiseAmp','uChromaticAberration','uDither',
      'uCurvature','uTint','uMouse','uMouseStrength','uUseMouse',
      'uPageLoadProgress','uUsePageLoadAnimation','uBrightness',
    ];
    names.forEach(function (n) { U[n] = gl.getUniformLocation(program, n); });

    // Set static uniforms
    gl.uniform1f(U.uScale,               CFG.scale);
    gl.uniform2f(U.uGridMul,             CFG.gridMul[0], CFG.gridMul[1]);
    gl.uniform1f(U.uDigitSize,           CFG.digitSize);
    gl.uniform1f(U.uScanlineIntensity,   CFG.scanlineIntensity);
    gl.uniform1f(U.uGlitchAmount,        CFG.glitchAmount);
    gl.uniform1f(U.uFlickerAmount,       CFG.flickerAmount);
    gl.uniform1f(U.uNoiseAmp,            CFG.noiseAmp);
    gl.uniform1f(U.uChromaticAberration, CFG.chromaticAberration);
    gl.uniform1f(U.uDither,              CFG.dither);
    gl.uniform1f(U.uCurvature,           CFG.curvature);
    gl.uniform3f(U.uTint,                tintRgb[0], tintRgb[1], tintRgb[2]);
    gl.uniform1f(U.uMouseStrength,       CFG.mouseStrength);
    // uUseMouse is set dynamically per frame based on idle state
    gl.uniform1f(U.uUsePageLoadAnimation, CFG.pageLoadAnimation ? 1 : 0);
    gl.uniform1f(U.uPageLoadProgress,    CFG.pageLoadAnimation ? 0 : 1);
    gl.uniform1f(U.uBrightness,          CFG.brightness);

    // Resize
    function resize() {
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform3f(U.iResolution, canvas.width, canvas.height, canvas.width / canvas.height);
    }
    resize();
    var ro = new ResizeObserver(resize);
    ro.observe(document.documentElement);

    // Mouse
    var mouse        = { x: 0.5, y: 0.5 };
    var smoothMouse  = { x: 0.5, y: 0.5 };
    var lastMoveTime = 0;
    var mouseActive  = false;
    if (CFG.mouseReact) {
      document.addEventListener('mousemove', function (e) {
        mouse.x = e.clientX / window.innerWidth;
        mouse.y = 1 - e.clientY / window.innerHeight;
        lastMoveTime = Date.now();
        mouseActive = true;
      });
    }

    // Animation loop
    var timeOffset = Math.random() * 100;
    var loadStart  = 0;

    function render(t) {
      requestAnimationFrame(render);

      var elapsed = (t * 0.001 + timeOffset) * CFG.timeScale;
      gl.uniform1f(U.iTime, elapsed);

      if (CFG.pageLoadAnimation) {
        if (loadStart === 0) loadStart = t;
        var progress = Math.min((t - loadStart) / 2000, 1);
        gl.uniform1f(U.uPageLoadProgress, progress);
      }

      if (CFG.mouseReact) {
        if (mouseActive && Date.now() - lastMoveTime > 2000) {
          mouseActive = false;
        }
        gl.uniform1f(U.uUseMouse, mouseActive ? 1 : 0);
        smoothMouse.x += (mouse.x - smoothMouse.x) * 0.08;
        smoothMouse.y += (mouse.y - smoothMouse.y) * 0.08;
        gl.uniform2f(U.uMouse, smoothMouse.x, smoothMouse.y);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    requestAnimationFrame(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
