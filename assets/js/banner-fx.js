/* Home banner: a pixel ripple across the whole image, drawn in WebGL over the
   banner photo. It starts where the mouse enters the title and runs once;
   the mouse has to leave the panel and come back to start another.
   Mouse only (no touch), skipped for reduced motion or without WebGL. */
(function () {
  "use strict";

  var root = document.querySelector("[data-banner-fx]");
  var card = document.querySelector(".banner-card");
  var title = card && card.querySelector("h1");
  if (!root || !title || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var img = root.querySelector("img");
  var canvas = root.querySelector("canvas");
  var gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false });
  if (!gl) return;

  var VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}";
  var FRAG = [
    "precision highp float;",
    "uniform sampler2D u_tex;",
    "uniform vec2 u_res;     // canvas size, device px",
    "uniform vec2 u_img;     // image size, px",
    "uniform vec2 u_origin;  // ripple centre, device px from top-left",
    "uniform float u_radius; // current wavefront radius, device px",
    "uniform float u_life;   // 0..1 over the ripple's run",
    "uniform float u_dpr;",
    // Same mapping as CSS object-fit: cover; object-position: 50% 45%
    "vec2 coverUV(vec2 p){",
    " float s=max(u_res.x/u_img.x,u_res.y/u_img.y);",
    " vec2 size=u_img*s; vec2 off=(u_res-size)*vec2(0.5,0.45);",
    " return clamp((p-off)/size,0.001,0.999);",
    "}",
    "vec3 tap(vec2 p){return texture2D(u_tex,coverUV(p)).rgb;}",
    "void main(){",
    " vec2 p=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);",
    " vec2 dv=p-u_origin;",
    " float d=length(dv);",
    " float x=d-u_radius;                 // > 0 ahead of the wavefront, < 0 behind it",
    " float wl=124.0*u_dpr;               // spacing between rings",
    " float front=14.0*u_dpr, trail=330.0*u_dpr;",
    " float env=x>0.0 ? exp(-x*x/(2.0*front*front)) : exp(x/trail);",
    // fade in quickly; fade out over the last 30% while the rings keep moving
    " float life=smoothstep(0.0,0.04,u_life)*(1.0-smoothstep(0.70,1.0,u_life))*(1.0-0.3*u_life);",
    " env*=life;",
    " vec2 dir=dv/max(d,1.0);",
    // refraction between the rings: push the image in and out along the radius
    " vec2 off=dir*sin(x/wl*6.2831853)*env*12.0*u_dpr;",
    // Each 32 px "parent" block takes its strength from its centre, so the
    // whole block is in or out of a ring and splits as one
    " float base=32.0*u_dpr;",
    " vec2 q0=(floor(p/base)+0.5)*base;",
    " float xq=length(q0-u_origin)-u_radius;",
    " float envq=xq>0.0 ? exp(-xq*xq/(2.0*front*front)) : exp(xq/trail);",
    " float crest=cos(xq/wl*6.2831853);",
    " float h=fract(sin(dot(floor(p/base),vec2(12.9898,78.233)))*43758.5453);",
    " float strength=envq*life;",
    " if(env<0.01&&strength<0.005){gl_FragColor=vec4(tap(p),1.0);return;}",
    // As the wave weakens, blocks subdivide 32 > 16 > 8 > 4 > 2 px; each
    // parent splits at a slightly different moment
    " float level=clamp(floor((1.0-strength)*5.0+(h-0.5)*0.9),0.0,4.0);",
    " float cell=base/exp2(level);",
    " vec2 q=(floor(p/cell)+0.5)*cell;",
    // ...and the finest pixels dissolve last, in random order
    " float qm=step(0.30,crest)*smoothstep(h*0.12,h*0.12+0.08,strength);",
    " vec3 pix=tap(q+off);",
    " vec2 inCell=abs(fract(p/cell)-0.5);",
    " pix*=1.0-0.12*step(0.45,max(inCell.x,inCell.y))*step(7.5*u_dpr,cell);   // crisp edges on larger pixels",
    " pix*=1.0+0.14*strength;                               // rings catch the light",
    " vec3 col=mix(tap(p+off),pix,qm);",
    " gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ["u_tex", "u_res", "u_img", "u_origin", "u_radius", "u_life", "u_dpr"].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });

  var ready = false;
  function upload() {
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      ready = true;
    } catch (e) { ready = false; }
  }
  if (img.complete && img.naturalWidth) upload();
  else img.addEventListener("load", upload, { once: true });

  var dpr = 1, W = 1, H = 1;
  function size() {
    var r = root.getBoundingClientRect();
    // Full device resolution so handing back to the <img> doesn't change sharpness
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
  }
  size();
  if (window.ResizeObserver) new ResizeObserver(size).observe(root);
  else window.addEventListener("resize", size);

  // One ripple per visit to the panel
  var armed = true, ripple = null, raf = 0;
  title.addEventListener("pointerenter", function (ev) {
    if (ev.pointerType !== "mouse" || !armed || !ready) return;
    armed = false;
    var r = root.getBoundingClientRect();
    var ox = (ev.clientX - r.left) * dpr, oy = (ev.clientY - r.top) * dpr;
    // Far enough to clear the farthest corner, plus the trailing rings
    var far = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy));
    var reach = far + 320 * dpr;
    ripple = { x: ox, y: oy, reach: reach, dur: Math.min(5.0, Math.max(3.6, reach / dpr / 380)), t0: performance.now() };
    canvas.classList.add("is-on");
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  });
  card.addEventListener("pointerleave", function (ev) {
    if (ev.pointerType === "mouse") armed = true;
  });

  function frame(now) {
    if (!ripple) return;
    var life = (now - ripple.t0) / 1000 / ripple.dur;
    if (life >= 1) { ripple = null; canvas.classList.remove("is-on"); return; }
    // Mostly steady speed, easing a little, but never stopping before it fades out
    var ease = 0.6 * life + 0.4 * (1 - Math.pow(1 - life, 2));
    gl.uniform1i(U.u_tex, 0);
    gl.uniform2f(U.u_res, W, H);
    gl.uniform2f(U.u_img, img.naturalWidth, img.naturalHeight);
    gl.uniform2f(U.u_origin, ripple.x, ripple.y);
    gl.uniform1f(U.u_radius, ripple.reach * ease);
    gl.uniform1f(U.u_life, life);
    gl.uniform1f(U.u_dpr, dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && ripple) { ripple = null; canvas.classList.remove("is-on"); }
  });
  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); ready = false; ripple = null; canvas.classList.remove("is-on"); });
})();
