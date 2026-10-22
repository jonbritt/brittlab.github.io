/* Home banner: cursor-driven refractive displacement with localized pixel
   quantization, drawn in WebGL over the banner image.

   Around the cursor a soft lens magnifies the image and bends it along an
   animated noise field (with a hint of chromatic dispersion); inside the lens,
   noise-shaped patches snap to a coarse pixel grid. The effect eases in while
   the pointer moves and fades out when it rests, leaving the plain <img>.
   Skipped entirely for reduced motion or without WebGL. */
(function () {
  "use strict";

  var root = document.querySelector("[data-banner-fx]");
  if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var img = root.querySelector("img");
  var canvas = root.querySelector("canvas");
  var banner = root.closest(".banner") || root;
  var gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) return;

  var VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}";

  // Simplex noise: Ashima Arts / Stefan Gustavson, webgl-noise (MIT licence)
  var NOISE = [
    "vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}",
    "vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}",
    "float snoise(vec3 v){",
    " const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);",
    " vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);",
    " vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);",
    " vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);",
    " vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));",
    " float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;",
    " vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);",
    " vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);",
    " vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);",
    " vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));",
    " vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;",
    " vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);",
    " vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));",
    " p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;",
    " vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;",
    " return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));",
    "}"
  ].join("\n");

  var FRAG = [
    "precision highp float;",
    "uniform sampler2D u_tex;",
    "uniform vec2 u_res;    // canvas size, device px",
    "uniform vec2 u_img;    // image size, px",
    "uniform vec2 u_mouse;  // cursor, device px from top-left",
    "uniform vec2 u_vel;    // smoothed cursor velocity, device px per frame",
    "uniform float u_time;",
    "uniform float u_amt;   // overall strength 0..1",
    "uniform float u_dpr;",
    "uniform float u_rad;   // lens radius, device px",
    NOISE,
    // Same mapping as CSS object-fit: cover; object-position: 50% 45%
    "vec2 coverUV(vec2 p){",
    " float s=max(u_res.x/u_img.x,u_res.y/u_img.y);",
    " vec2 size=u_img*s; vec2 off=(u_res-size)*vec2(0.5,0.45);",
    " return clamp((p-off)/size,0.001,0.999);",
    "}",
    "vec3 tap(vec2 p){return texture2D(u_tex,coverUV(p)).rgb;}",
    "vec3 refracted(vec2 p,vec2 off,vec2 disp){",
    " return vec3(tap(p+off*1.07+disp).r, tap(p+off).g, tap(p+off*0.93-disp).b);",
    "}",
    "void main(){",
    " vec2 p=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);",
    " vec2 dv=p-u_mouse;",
    " float d=length(dv)/u_rad;",
    " float fall=exp(-d*d*2.4)*u_amt;",
    " if(fall<0.002){gl_FragColor=vec4(tap(p),1.0);return;}",
    " float t=u_time;",
    " vec2 np=p/(230.0*u_dpr);",
    " float n=snoise(vec3(np,t*0.22));",
    " float nx=snoise(vec3(np+vec2(0.06,0.0),t*0.22));",
    " float ny=snoise(vec3(np+vec2(0.0,0.06),t*0.22));",
    " vec2 grad=vec2(nx-n,ny-n)/0.06;",
    // lens: pull samples toward the centre (magnify), bend along the noise field, smear with motion
    " vec2 v=u_vel; float vl=length(v); if(vl>40.0*u_dpr) v*=40.0*u_dpr/vl;",
    " vec2 off=-dv*fall*0.12 + grad*fall*3.6*u_dpr - v*fall*1.8;",
    " vec2 dir=dv/max(length(dv),1.0);",
    " vec2 disp=dir*fall*1.6*u_dpr;",
    " vec3 col=refracted(p,off,disp);",
    // localized pixel quantization: noise-shaped patches snap to a coarse grid
    " float n2=snoise(vec3(np*1.7+4.1,t*0.3));",
    " float cell=floor(mix(5.0,12.0,0.5+0.5*n2))*u_dpr;",
    " vec2 q=(floor(p/cell)+0.5)*cell;",
    " float patchN=snoise(vec3(q/(90.0*u_dpr),t*0.35+11.0));",
    " float qm=smoothstep(0.30,0.80,fall/max(u_amt,0.001))*smoothstep(-0.05,0.40,patchN)*u_amt;",
    " vec3 qc=refracted(q,off,disp);",
    " qc=mix(qc,floor(qc*10.0+0.5)/10.0,0.45);",
    " vec2 inCell=abs(fract(p/cell)-0.5);",
    " qc*=1.0-0.05*step(0.42,max(inCell.x,inCell.y));",
    " col=mix(col,qc,qm*0.75);",
    // faint caustic ring at the lens edge
    " float ring=exp(-pow((d-0.95)*5.0,2.0))*u_amt;",
    " col+=ring*0.035*(0.6+0.4*n);",
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

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ["u_tex", "u_res", "u_img", "u_mouse", "u_vel", "u_time", "u_amt", "u_dpr", "u_rad"].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });

  var tex = gl.createTexture();
  var ready = false;
  function upload() {
    gl.bindTexture(gl.TEXTURE_2D, tex);
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

  // Pointer state (device px relative to the banner image)
  var dpr = 1, W = 1, H = 1;
  var target = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  var amt = 0, hovering = false, lastMove = -1e9, seen = false, touch = false;
  var running = false, visible = true, last = 0, t0 = performance.now();

  function size() {
    var r = root.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
  }
  size();
  if (window.ResizeObserver) new ResizeObserver(size).observe(root);
  else window.addEventListener("resize", size);

  function onMove(ev) {
    var r = root.getBoundingClientRect();
    var x = (ev.clientX - r.left) * dpr, y = (ev.clientY - r.top) * dpr;
    if (y < 0 || y > H) { hovering = false; return; }
    target.x = x; target.y = y;
    if (!seen || amt < 0.01) { pos.x = x; pos.y = y; vel.x = vel.y = 0; seen = true; }
    hovering = true;
    touch = ev.pointerType !== "mouse";
    lastMove = performance.now();
    start();
  }
  banner.addEventListener("pointermove", onMove, { passive: true });
  banner.addEventListener("pointerdown", onMove, { passive: true });
  // Touch pointers "leave" right after lifting; let a tap play out as a short ripple instead
  banner.addEventListener("pointerleave", function () { if (!touch) hovering = false; });

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    var px = pos.x, py = pos.y;
    var follow = 1 - Math.exp(-dt * 9);
    pos.x += (target.x - pos.x) * follow;
    pos.y += (target.y - pos.y) * follow;
    var vs = 1 - Math.exp(-dt * 6);
    vel.x += ((pos.x - px) - vel.x) * vs;
    vel.y += ((pos.y - py) - vel.y) * vs;

    var active = hovering && now - lastMove < (touch ? 1100 : 2200);
    var goal = active ? 1 : 0;
    amt += (goal - amt) * (1 - Math.exp(-dt * (goal > amt ? 3.5 : 2.4)));

    if (!ready || (!active && amt < 0.01)) {
      amt = active ? amt : 0;
      canvas.classList.remove("is-on");
      running = false;
      return;
    }
    canvas.classList.add("is-on");
    gl.uniform1i(U.u_tex, 0);
    gl.uniform2f(U.u_res, W, H);
    gl.uniform2f(U.u_img, img.naturalWidth, img.naturalHeight);
    gl.uniform2f(U.u_mouse, pos.x, pos.y);
    gl.uniform2f(U.u_vel, vel.x, vel.y);
    gl.uniform1f(U.u_time, (now - t0) / 1000);
    gl.uniform1f(U.u_amt, amt);
    gl.uniform1f(U.u_dpr, dpr);
    gl.uniform1f(U.u_rad, Math.max(140, 150 + W / dpr * 0.08) * dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || !visible || document.hidden) return;
    running = true; last = 0;
    requestAnimationFrame(frame);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (!visible) { running = false; canvas.classList.remove("is-on"); amt = 0; }
    }).observe(root);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { running = false; canvas.classList.remove("is-on"); amt = 0; }
  });
  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); running = false; ready = false; canvas.classList.remove("is-on"); });
})();
