window.CCK = (function () {
  'use strict';
  var THREE = window.THREE, $ = function (id) { return document.getElementById(id); };
  var stage = $('stage'), canvas = $('gl');
  if (!THREE || !stage) return null;

  // ---------- constants ----------
  var HW = 8, WALL = 13, N = 640, MAXV = 46, BOOSTV = 62, ACC = 26;
  var INK = 0x2a0d1a, BONE = 0xfdebc8, SUN = 0xffcf3a, CORAL = 0xf0512c, TEAL = 0x12a5a0, SAND = 0xf3a43b;
  var TRACKS = [
    { name: 'Canyon Loop', laps: 3, pads: [0.2, 0.47, 0.76], boxes: [0.1, 0.34, 0.6, 0.88],
      pts: [[0, -90], [80, -95], [150, -70], [170, -10], [120, 30], [60, 10], [20, 40], [50, 95], [0, 120], [-70, 100], [-90, 50], [-150, 30], [-170, -40], [-110, -80]] },
    { name: 'Rattlesnake Pass', laps: 3, pads: [0.13, 0.41, 0.7], boxes: [0.07, 0.3, 0.55, 0.84],
      pts: [[0, -110], [90, -120], [160, -90], [150, -30], [90, -20], [70, 30], [130, 60], [170, 110], [110, 150], [30, 130], [0, 70], [-40, 30], [-100, 60], [-150, 120], [-190, 60], [-160, -10], [-110, -40], [-120, -90], [-60, -120]] }
  ];
  var ROSTER = [
    { name: 'Dusty', color: 0x2f9fd0, skill: 0.97 }, { name: 'Cholla', color: 0x58b368, skill: 0.95 },
    { name: 'Gila', color: 0xf08a24, skill: 0.93 }, { name: 'Yucca', color: 0x9b6bd6, skill: 0.91 },
    { name: 'Mesa', color: 0xf2f2f2, skill: 0.89 }, { name: 'You', color: 0xe8452c, skill: 1 }
  ];
  var NETCOL = [0xe8452c, 0x2f9fd0, 0x58b368, 0xffcf3a, 0x9b6bd6, 0xf2f2f2];
  var ITEMS = { nitro: 'Nitro', weed: 'Tumbleweed', sting: 'Stinger' };

  // ---------- renderer / scene ----------
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  // real shadows on desktop; phones keep the cheap blob shadow
  var SHADOWS = !(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  renderer.shadowMap.enabled = SHADOWS; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf9dcae, 150, 640);
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0xb0623a, SHADOWS ? 0.82 : 1.0));
  var sun = new THREE.DirectionalLight(0xffe2b8, SHADOWS ? 1.05 : 0.8); sun.position.set(-90, 130, 60); scene.add(sun); scene.add(sun.target);
  if (SHADOWS) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04; var shc = sun.shadow.camera; shc.left = -75; shc.right = 75; shc.top = 75; shc.bottom = -75; shc.near = 20; shc.far = 420; shc.updateProjectionMatrix(); }
  function noiseTex(size, lo, hi, extra) {
    var t = canvasTex(size, size, function (g) { var im = g.createImageData(size, size), d = im.data; for (var i = 0; i < d.length; i += 4) { var v = lo + Math.random() * (hi - lo); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } g.putImageData(im, 0, 0); if (extra) extra(g, size); });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  (function () {
    var g = new THREE.SphereGeometry(1300, 24, 12), top = new THREE.Color(TEAL), hor = new THREE.Color(0xf9dcae), c = new THREE.Color(), pos = g.attributes.position, cols = [];
    for (var i = 0; i < pos.count; i++) { var t = Math.max(0, Math.min(1, pos.getY(i) / 480)); c.copy(hor).lerp(top, Math.pow(t, 0.6)); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
    var sunDisk = new THREE.Mesh(new THREE.CircleGeometry(150, 40), new THREE.MeshBasicMaterial({ color: SUN, fog: false, depthWrite: false }));
    sunDisk.position.set(-500, 190, -1000); sunDisk.lookAt(0, 0, 0); scene.add(sunDisk);
  })();
  var sandTex = noiseTex(256, 205, 255); sandTex.repeat.set(260, 260);
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(3400, 3400), new THREE.MeshLambertMaterial({ color: SAND, map: sandTex }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.1; ground.receiveShadow = true; scene.add(ground);
  // asphalt: grain plus two darker bands where tyres have laid rubber
  var asphaltTex = noiseTex(256, 170, 255, function (g, s) { var gr = g.createLinearGradient(0, 0, s, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.22, 'rgba(0,0,0,0)'); gr.addColorStop(0.32, 'rgba(0,0,0,0.2)'); gr.addColorStop(0.42, 'rgba(0,0,0,0.05)'); gr.addColorStop(0.58, 'rgba(0,0,0,0.05)'); gr.addColorStop(0.68, 'rgba(0,0,0,0.2)'); gr.addColorStop(0.78, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
  var puffTex = canvasTex(64, 64, function (g) { var gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });

  function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); var t = new THREE.CanvasTexture(c); return t; }
  var checkTex = canvasTex(2, 2, function (g) { g.fillStyle = '#fdebc8'; g.fillRect(0, 0, 2, 2); g.fillStyle = '#2a0d1a'; g.fillRect(0, 0, 1, 1); g.fillRect(1, 1, 1, 1); });
  checkTex.magFilter = THREE.NearestFilter; checkTex.wrapS = checkTex.wrapT = THREE.RepeatWrapping; checkTex.repeat.set(HW, 1);
  var bannerTex = canvasTex(512, 64, function (g) { g.fillStyle = '#2a0d1a'; g.fillRect(0, 0, 512, 64); g.fillStyle = '#ffcf3a'; g.font = 'bold 40px Impact, Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('COPPER CANYON GP', 256, 34); });
  var padTex = canvasTex(64, 64, function (g) { g.fillStyle = '#f0512c'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#ffcf3a'; g.lineWidth = 9; for (var y = 14; y < 70; y += 22) { g.beginPath(); g.moveTo(6, y + 12); g.lineTo(32, y - 8); g.lineTo(58, y + 12); g.stroke(); } });
  var boxTex = canvasTex(64, 64, function (g) { g.fillStyle = '#ffcf3a'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#2a0d1a'; g.lineWidth = 6; g.strokeRect(3, 3, 58, 58); g.fillStyle = '#2a0d1a'; g.font = 'bold 46px Impact, Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 32, 35); });
  var decalOpts = { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 };

  // ---------- track ----------
  var TR = null, seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function buildTrack(ti) {
    if (TR && TR.id === ti) return;
    if (TR) { scene.remove(TR.group); TR.group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
    var def = TRACKS[ti], grp = new THREE.Group(), P = [], T = [], NR = [], VC = [], i;
    var curve = new THREE.CatmullRomCurve3(def.pts.map(function (p) { return new THREE.Vector3(p[0], 0, p[1]); }), true, 'centripetal');
    var minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (i = 0; i < N; i++) {
      var u = i / N, p = curve.getPointAt(u), t = curve.getTangentAt(u).normalize();
      P.push(p); T.push(t); NR.push(new THREE.Vector3(t.z, 0, -t.x));
      minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); minz = Math.min(minz, p.z); maxz = Math.max(maxz, p.z);
    }
    var SEG = curve.getLength() / N;
    for (i = 0; i < N; i++) {
      var a = T[(i - 4 + N) % N], b = T[(i + 4) % N], ang = Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
      VC.push(Math.max(17, Math.min(70, 1.2 / Math.max(ang / (8 * SEG), 1e-4))));
    }
    function strip(fa, fb, colorFn) {
      var pos = [], col = [], uv = [], c = new THREE.Color();
      for (var i = 0; i < N; i++) {
        var hex = colorFn(i); if (hex === null) continue;
        var j = (i + 1) % N, a0 = fa(i), b0 = fb(i), a1 = fa(j), b1 = fb(j);
        pos.push(a0.x, a0.y, a0.z, b0.x, b0.y, b0.z, a1.x, a1.y, a1.z, b0.x, b0.y, b0.z, b1.x, b1.y, b1.z, a1.x, a1.y, a1.z);
        var v0 = i * 0.2, v1 = v0 + 0.2; uv.push(0, v0, 1, v0, 0, v1, 1, v0, 1, v1, 0, v1);
        c.set(hex); for (var k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
      return g;
    }
    var at = function (off, y) { return function (i) { return new THREE.Vector3(P[i].x + NR[i].x * off, y, P[i].z + NR[i].z * off); }; };
    var flatMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    var roadMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, map: asphaltTex });
    var lamb = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    var add = function (g, m, cast) { var me = new THREE.Mesh(g, m); me.receiveShadow = true; me.castShadow = !!cast; grp.add(me); };
    add(strip(at(-WALL, -0.04), at(WALL, -0.04), function () { return 0xe08a3a; }), lamb);
    add(strip(at(-HW, 0), at(HW, 0), function () { return 0x55404c; }), roadMat);
    var kerb = function (i) { return Math.floor(i / 3) % 2 ? CORAL : BONE; };
    add(strip(at(HW, 0.03), at(HW + 1.2, 0.03), kerb), flatMat);
    add(strip(at(-HW - 1.2, 0.03), at(-HW, 0.03), kerb), flatMat);
    add(strip(at(-0.18, 0.03), at(0.18, 0.03), function (i) { return Math.floor(i / 4) % 2 ? null : BONE; }), flatMat);
    var wallCol = function (i) { return Math.floor(i / 8) % 2 ? BONE : TEAL; };
    add(strip(at(WALL + 0.6, 0), at(WALL + 0.6, 1.1), wallCol), lamb, true);
    add(strip(at(-WALL - 0.6, 0), at(-WALL - 0.6, 1.1), wallCol), lamb, true);
    var heading = function (i) { return Math.atan2(T[i].x, T[i].z); };
    // start line + gantry
    var lg = new THREE.PlaneGeometry(HW * 2, 2); lg.rotateX(-Math.PI / 2);
    var line = new THREE.Mesh(lg, new THREE.MeshBasicMaterial(Object.assign({ map: checkTex }, decalOpts)));
    line.position.set(P[0].x, 0.04, P[0].z); line.rotation.y = heading(0); grp.add(line);
    var gan = new THREE.Group(), postM = new THREE.MeshLambertMaterial({ color: INK }), banM = new THREE.MeshBasicMaterial({ map: bannerTex });
    [-1, 1].forEach(function (s) { var po = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8), postM); po.position.set(s * (HW + 2.2), 4.5, 0); gan.add(po); });
    var beam = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 5.2, 2.2, 0.6), [postM, postM, postM, postM, banM, banM]); beam.position.y = 8.6; gan.add(beam);
    gan.position.set(P[0].x, 0, P[0].z); gan.rotation.y = heading(0); gan.traverse(function (o) { o.castShadow = true; }); grp.add(gan);
    // boost pads
    var PADS = def.pads.map(function (f) { return Math.floor(f * N); }), padM = new THREE.MeshBasicMaterial(Object.assign({ map: padTex }, decalOpts));
    PADS.forEach(function (i) { var g = new THREE.PlaneGeometry(6, 7); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI); var m = new THREE.Mesh(g, padM); m.position.set(P[i].x, 0.05, P[i].z); m.rotation.y = heading(i); grp.add(m); });
    // item boxes
    var boxes = [], boxM = new THREE.MeshBasicMaterial({ map: boxTex }), boxG = new THREE.BoxGeometry(1.7, 1.7, 1.7);
    def.boxes.forEach(function (f) { var i = Math.floor(f * N); [-4.2, 0, 4.2].forEach(function (off) { var m = new THREE.Mesh(boxG, boxM); m.position.set(P[i].x + NR[i].x * off, 1.4, P[i].z + NR[i].z * off); grp.add(m); boxes.push({ x: m.position.x, z: m.position.z, mesh: m, t: 0 }); }); });
    // scenery
    seed = 7 + ti * 13;
    var cx = (minx + maxx) / 2, cz = (minz + maxz) / 2, ex = (maxx - minx) / 2 + 120, ez = (maxz - minz) / 2 + 120;
    function tdist(x, z) { var m = 1e9; for (var i = 0; i < N; i += 4) { var dx = x - P[i].x, dz = z - P[i].z, d = dx * dx + dz * dz; if (d < m) m = d; } return Math.sqrt(m); }
    var spots = [];
    for (var tries = 0; tries < 1500 && spots.length < 300; tries++) { var x = cx + (rnd() - 0.5) * 2 * ex, z = cz + (rnd() - 0.5) * 2 * ez; if (tdist(x, z) > WALL + 5) spots.push([x, z]); }
    var nC = Math.min(190, spots.length), nR = Math.max(1, spots.length - nC), green = new THREE.MeshLambertMaterial({ color: 0x236b5a });
    var tg = new THREE.CylinderGeometry(0.55, 0.65, 7, 7); tg.translate(0, 3.5, 0);
    var aA = new THREE.CylinderGeometry(0.36, 0.36, 2.6, 6); aA.translate(1.5, 4.6, 0);
    var aB = new THREE.CylinderGeometry(0.36, 0.36, 1.5, 6); aB.rotateZ(Math.PI / 2); aB.translate(0.9, 3.4, 0);
    var aC = new THREE.CylinderGeometry(0.33, 0.33, 2, 6); aC.translate(-1.3, 3.6, 0);
    var aD = new THREE.CylinderGeometry(0.33, 0.33, 1.3, 6); aD.rotateZ(Math.PI / 2); aD.translate(-0.8, 2.7, 0);
    var parts = [tg, aA, aB, aC, aD].map(function (g) { var im = new THREE.InstancedMesh(g, green, Math.max(1, nC)); im.castShadow = true; im.frustumCulled = false; grp.add(im); return im; });
    var rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xa62f1e, flatShading: true, roughness: 1 }), nR); rocks.castShadow = true; rocks.receiveShadow = true; rocks.frustumCulled = false; grp.add(rocks);
    var d = new THREE.Object3D();
    spots.forEach(function (s, i) {
      d.position.set(s[0], 0, s[1]); d.rotation.set(0, rnd() * 6.28, 0);
      if (i < nC) { var k = 0.7 + rnd() * 0.7; d.scale.set(k, k, k); d.updateMatrix(); parts.forEach(function (p) { p.setMatrixAt(i, d.matrix); }); }
      else { var k2 = 1 + rnd() * 3.5; d.scale.set(k2 * (0.8 + rnd() * 0.6), k2 * (0.5 + rnd() * 0.5), k2); d.position.y = k2 * 0.2; d.updateMatrix(); rocks.setMatrixAt(i - nC, d.matrix); }
    });
    var mesaM = new THREE.MeshStandardMaterial({ color: 0xc2452a, flatShading: true, roughness: 1 }), capM = new THREE.MeshStandardMaterial({ color: 0xea6637, flatShading: true, roughness: 1 });
    var R0 = Math.max(ex, ez) + 130;
    for (i = 0; i < 28; i++) {
      var an = (i / 28) * Math.PI * 2 + rnd() * 0.2, r = R0 + rnd() * 170, w = 30 + rnd() * 50, h = 30 + rnd() * 70;
      var m = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.7, w, h, 7), mesaM); m.position.set(cx + Math.cos(an) * r, h / 2 - 1, cz + Math.sin(an) * r); m.rotation.y = rnd() * 3;
      var cap = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.66, w * 0.72, h * 0.12, 7), capM); cap.position.y = h / 2; m.add(cap); grp.add(m);
    }
    scene.add(grp);
    TR = { id: ti, def: def, P: P, T: T, NR: NR, VC: VC, SEG: SEG, PADS: PADS, boxes: boxes, group: grp, cx: cx, cz: cz, ms: 228 / Math.max(maxx - minx, maxz - minz), heading: heading };
  }

  // ---------- karts ----------
  function box(w, h, d, mat, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
  var tyreMat = new THREE.MeshLambertMaterial({ color: 0x1b1b1e }), darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2526 }), suitMat = new THREE.MeshLambertMaterial({ color: BONE });
  var hubMat = new THREE.MeshLambertMaterial({ color: 0x9a9aa2 });
  var wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.42, 20); wheelGeo.rotateZ(Math.PI / 2);
  var shadowGeo = new THREE.CircleGeometry(1.7, 16); shadowGeo.rotateX(-Math.PI / 2);
  var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  function makeKart(color, ghost, parent) {
    var g = new THREE.Group(), body = new THREE.Group();
    var paint = new THREE.MeshLambertMaterial({ color: color, transparent: !!ghost, opacity: ghost ? 0.4 : 1 });
    var dk = ghost ? paint : darkMat, ty = ghost ? paint : tyreMat, su = ghost ? paint : suitMat;
    body.add(box(1.5, 0.4, 2.7, paint, 0, 0.55, 0)); body.add(box(1.0, 0.3, 0.9, paint, 0, 0.5, 1.6)); body.add(box(1.9, 0.12, 0.35, dk, 0, 0.42, 2.05));
    body.add(box(0.45, 0.3, 1.2, dk, -0.95, 0.5, 0)); body.add(box(0.45, 0.3, 1.2, dk, 0.95, 0.5, 0)); body.add(box(0.9, 0.8, 0.2, dk, 0, 1.0, -0.75));
    var seat = new THREE.Group(); seat.position.set(0, 0.72, -0.3); body.add(seat);
    if (ghost) { body.add(box(0.7, 0.7, 0.5, su, 0, 1.05, -0.35)); var head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), paint); head.position.set(0, 1.7, -0.35); body.add(head); }
    body.add(box(1.8, 0.1, 0.5, paint, 0, 1.45, -1.35));
    body.add(box(0.1, 0.6, 0.3, dk, -0.6, 1.1, -1.3)); body.add(box(0.1, 0.6, 0.3, dk, 0.6, 1.1, -1.3));
    var fw = [];
    var wh = [];
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (p) { var w = new THREE.Mesh(wheelGeo, ty); w.position.set(p[0], 0.42, p[1]); w.rotation.order = 'YXZ'; if (!ghost) { w.add(box(0.46, 0.56, 0.1, hubMat, 0, 0, 0)); w.add(box(0.46, 0.1, 0.56, hubMat, 0, 0, 0)); } if (p[1] > 0) fw.push(w); wh.push(w); body.add(w); });
    g.add(body);
    if (!ghost) { g.traverse(function (o) { o.castShadow = true; }); if (!SHADOWS || parent) { var sh = new THREE.Mesh(shadowGeo, shadowMat); sh.position.y = 0.07; g.add(sh); } }
    (parent || scene).add(g);
    return { g: g, body: body, fw: fw, wh: wh, paint: paint, seat: seat };
  }
  // ---------- drivers: six characters built from primitives, each with its own animation ----------
  var matC = {};
  function mat(c) { return matC[c] || (matC[c] = new THREE.MeshLambertMaterial({ color: c })); }
  var GEO = { sph: new THREE.SphereGeometry(1, 14, 10), cyl: new THREE.CylinderGeometry(1, 1, 1, 12), cone: new THREE.ConeGeometry(1, 1, 12), box: new THREE.BoxGeometry(1, 1, 1), tor: new THREE.TorusGeometry(1, 0.32, 8, 16), chili: new THREE.CylinderGeometry(0.36, 0.2, 1.3, 12) };
  GEO.chili.translate(0, 0.65, 0);
  function part(geo, c, x, y, z, sx, sy, sz) { var m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz); return m; }
  function grp(x, y, z) { var g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); for (var i = 3; i < arguments.length; i++) g.add(arguments[i]); return g; }
  function eyes(g, y, z, dx, r) { [-1, 1].forEach(function (s) { g.add(part(GEO.sph, 0xffffff, s * dx, y, z, r)); g.add(part(GEO.sph, 0x1b1b1e, s * dx, y, z + r * 0.7, r * 0.5)); }); }
  var BLACK = 0x1b1b1e, WHITE = 0xffffff;
  var CHARS = [
    { name: 'Rusty', tag: 'Tin-can prospector. One eye, loose jaw.', color: 0x2f9fd0, build: function () {
      var g = new THREE.Group(), tin = 0x9aa7ad, head = grp(0, 1.05, 0), jaw = grp(0, -0.3, 0.04, part(GEO.box, 0x6f7b80, 0, 0, 0, 0.46, 0.12, 0.4)), ant = grp(0, 0.22, 0);
      g.add(part(GEO.box, tin, 0, 0.4, 0, 0.62, 0.72, 0.46)); g.add(part(GEO.box, 0xb5651d, 0.16, 0.5, 0.235, 0.2, 0.2, 0.02)); g.add(part(GEO.box, 0xb5651d, -0.2, 0.25, -0.235, 0.16, 0.26, 0.02));
      head.add(part(GEO.box, tin, 0, 0, 0, 0.56, 0.46, 0.46)); var eye = grp(0, 0.03, 0.24, part(GEO.sph, WHITE, 0, 0, 0, 0.16), part(GEO.sph, BLACK, 0, 0, 0.12, 0.08)); head.add(eye);
      [-1, 1].forEach(function (s) { var b = part(GEO.cyl, 0x6f7b80, s * 0.32, 0, 0, 0.09, 0.1, 0.09); b.rotation.z = Math.PI / 2; head.add(b); });
      ant.add(part(GEO.cyl, BLACK, 0, 0.2, 0, 0.02, 0.4, 0.02)); ant.add(part(GEO.sph, 0xf0512c, 0, 0.44, 0, 0.09)); head.add(ant); head.add(jaw); g.add(head);
      return { g: g, anim: function (t, k, sp) { jaw.position.y = -0.3 - Math.abs(Math.sin(t * 15)) * 0.08 * (0.3 + sp); ant.rotation.z = Math.sin(t * 7) * 0.5; ant.rotation.x = Math.cos(t * 5) * 0.3 - sp * 0.5; head.rotation.y = Math.sin(t * 1.4) * 0.35; eye.scale.y = (t % 3.1) < 0.12 ? 0.1 : 1; } };
    } },
    { name: 'Prickles', tag: 'A cactus in sunglasses. Waves at everyone.', color: 0x58b368, build: function () {
      var g = new THREE.Group(), gr = 0x3f9a5a, arms = [];
      g.add(part(GEO.cyl, gr, 0, 0.6, 0, 0.34, 1.2, 0.34)); g.add(part(GEO.sph, gr, 0, 1.2, 0, 0.34));
      [-1, 1].forEach(function (s) { var a = grp(s * 0.3, s > 0 ? 0.75 : 0.55, 0), h = part(GEO.cyl, gr, s * 0.2, 0, 0, 0.11, 0.42, 0.11); h.rotation.z = Math.PI / 2; a.add(h); a.add(part(GEO.cyl, gr, s * 0.4, 0.22, 0, 0.11, 0.48, 0.11)); a.add(part(GEO.sph, gr, s * 0.4, 0.46, 0, 0.11)); g.add(a); arms.push(a); });
      [-0.15, 0.15].forEach(function (x) { g.add(part(GEO.box, BLACK, x, 1.12, 0.32, 0.21, 0.14, 0.06)); }); g.add(part(GEO.box, BLACK, 0, 1.15, 0.32, 0.14, 0.035, 0.04));
      var fl = part(GEO.sph, 0xff7fa8, 0.1, 1.56, 0, 0.11); g.add(fl);
      return { g: g, anim: function (t, k, sp) { arms[0].rotation.z = Math.sin(t * 6) * 0.45 * (0.4 + sp); arms[1].rotation.z = Math.sin(t * 6 + 1.6) * 0.45 * (0.4 + sp); fl.scale.setScalar(0.11 + Math.sin(t * 4) * 0.02); g.rotation.y = Math.sin(t * 2) * 0.12; } };
    } },
    { name: 'Gus', tag: 'Jackalope. Ears like windsocks.', color: 0xf08a24, build: function () {
      var g = new THREE.Group(), tan = 0xd9a066, head = grp(0, 1.0, 0.05), ears = [];
      g.add(part(GEO.sph, tan, 0, 0.4, 0, 0.42, 0.46, 0.4)); g.add(part(GEO.sph, WHITE, 0, 0.3, -0.38, 0.14));
      head.add(part(GEO.sph, tan, 0, 0, 0, 0.33)); eyes(head, 0.08, 0.27, 0.14, 0.075);
      head.add(part(GEO.sph, 0xff7fa8, 0, -0.03, 0.33, 0.06)); head.add(part(GEO.box, WHITE, 0, -0.17, 0.3, 0.13, 0.13, 0.04));
      [-1, 1].forEach(function (s) { var e = grp(s * 0.14, 0.25, -0.05, part(GEO.sph, tan, 0, 0.36, 0, 0.09, 0.38, 0.05), part(GEO.sph, 0xff9fb8, 0, 0.36, 0.03, 0.05, 0.3, 0.03)); head.add(e); ears.push(e);
        var a = part(GEO.cyl, 0x6b4423, s * 0.3, 0.36, -0.05, 0.03, 0.42, 0.03); a.rotation.z = -s * 0.5; head.add(a); var b = part(GEO.cyl, 0x6b4423, s * 0.42, 0.42, -0.05, 0.025, 0.2, 0.025); b.rotation.z = -s * 1.3; head.add(b); });
      g.add(head);
      return { g: g, anim: function (t, k, sp) { ears[0].rotation.x = -sp * 1.1 + Math.sin(t * 9) * 0.14; ears[1].rotation.x = -sp * 0.9 + Math.sin(t * 9 + 1) * 0.14; ears[1].rotation.z = -0.35 - Math.sin(t * 2) * 0.1; head.rotation.z = Math.sin(t * 3) * 0.12; head.position.y = 1.0 + Math.abs(Math.sin(t * 5)) * 0.05; } };
    } },
    { name: 'Beaky', tag: 'Vulture. Patient. Long neck, short temper.', color: 0x9b6bd6, build: function () {
      var g = new THREE.Group(), dark = 0x3a3040, pink = 0xe8a0a0, neck = grp(0, 0.78, 0), wings = [];
      g.add(part(GEO.sph, dark, 0, 0.4, 0, 0.42, 0.46, 0.42)); var col = part(GEO.tor, WHITE, 0, 0.8, 0, 0.2); col.rotation.x = Math.PI / 2; g.add(col);
      neck.add(part(GEO.cyl, pink, 0, 0.35, 0, 0.08, 0.7, 0.08)); neck.add(part(GEO.sph, pink, 0, 0.76, 0.03, 0.2)); eyes(neck, 0.82, 0.18, 0.09, 0.055);
      var beak = part(GEO.cone, 0xffcf3a, 0, 0.7, 0.3, 0.09, 0.32, 0.09); beak.rotation.x = Math.PI / 2 + 0.5; neck.add(beak); g.add(neck);
      [-1, 1].forEach(function (s) { var w = grp(s * 0.4, 0.55, -0.05, part(GEO.sph, dark, s * 0.08, -0.15, 0, 0.1, 0.34, 0.26)); g.add(w); wings.push(w); });
      return { g: g, anim: function (t, k, sp) { neck.rotation.z = Math.sin(t * 3) * 0.28 - k.steer * 0.3; neck.rotation.x = sp * 0.55 + Math.sin(t * 6) * 0.06; var f = k.boost > 0 ? Math.sin(t * 30) * 0.9 + 0.9 : Math.sin(t * 2) * 0.08; wings[0].rotation.z = -f; wings[1].rotation.z = f; } };
    } },
    { name: 'Clucks', tag: 'Sheriff. Chicken. Takes both very seriously.', color: 0xf2f2f2, build: function () {
      var g = new THREE.Group(), head = grp(0, 1.0, 0.05), tail = grp(0, 0.5, -0.36);
      g.add(part(GEO.sph, WHITE, 0, 0.4, 0, 0.42, 0.48, 0.42)); g.add(part(GEO.box, 0xffcf3a, 0.15, 0.55, 0.39, 0.13, 0.13, 0.03));
      [-0.5, 0, 0.5].forEach(function (a) { var f = part(GEO.cone, WHITE, Math.sin(a) * 0.2, 0.22, -Math.cos(a) * 0.05, 0.09, 0.5, 0.05); f.rotation.z = -a; f.rotation.x = -0.5; tail.add(f); }); g.add(tail);
      head.add(part(GEO.sph, WHITE, 0, 0, 0, 0.3)); eyes(head, 0.06, 0.24, 0.13, 0.07);
      var beak = part(GEO.cone, 0xf08a24, 0, -0.03, 0.36, 0.09, 0.24, 0.09); beak.rotation.x = Math.PI / 2; head.add(beak); head.add(part(GEO.sph, 0xe8452c, 0, -0.2, 0.26, 0.07, 0.11, 0.07));
      head.add(part(GEO.cyl, 0x7a4a22, 0, 0.26, 0, 0.44, 0.04, 0.44)); head.add(part(GEO.cyl, 0x7a4a22, 0, 0.38, 0, 0.22, 0.22, 0.22)); head.add(part(GEO.sph, 0xe8452c, 0, 0.52, 0, 0.08));
      g.add(head);
      return { g: g, anim: function (t, k, sp) { head.rotation.x = Math.max(0, Math.sin(t * 5.5)) * 0.55; head.rotation.y = Math.sin(t * 2.3) * 0.4; tail.rotation.y = Math.sin(t * 12) * 0.25 * (0.3 + sp); } };
    } },
    { name: 'Pepe', tag: 'Chili pepper. Runs hot. Never takes the hat off.', color: 0xe8452c, build: function () {
      var g = new THREE.Group(), red = 0xd8301f, hat = grp(0, 1.42, 0), mo = grp(0, 0.84, 0.31);
      g.add(part(GEO.chili, red, 0, 0, 0, 1)); g.add(part(GEO.sph, red, 0, 1.3, 0, 0.36, 0.22, 0.36)); eyes(g, 1.06, 0.3, 0.13, 0.08);
      [-1, 1].forEach(function (s) { var m = part(GEO.box, BLACK, s * 0.13, 0, 0, 0.24, 0.07, 0.05); m.rotation.z = -s * 0.4; mo.add(m); }); g.add(mo);
      hat.add(part(GEO.cyl, 0xffcf3a, 0, 0, 0, 0.72, 0.05, 0.72)); hat.add(part(GEO.cyl, 0xf0512c, 0, 0.08, 0, 0.3, 0.1, 0.3)); hat.add(part(GEO.cone, 0xffcf3a, 0, 0.36, 0, 0.28, 0.5, 0.28)); hat.add(part(GEO.cyl, 0x3f9a5a, 0, 0.66, 0, 0.04, 0.14, 0.04)); g.add(hat);
      return { g: g, anim: function (t, k, sp) { g.rotation.y = Math.sin(t * 4) * 0.2; mo.rotation.z = Math.sin(t * 9) * 0.18; hat.rotation.z = Math.sin(t * 3) * 0.1 - k.steer * 0.2; hat.rotation.x = -sp * 0.25; hat.position.y = 1.42 + Math.abs(Math.sin(t * 6)) * 0.05 * (0.3 + sp); } };
    } }
  ];
  function setChar(k, ci) {
    ci = ((ci | 0) % 6 + 6) % 6; if (k.chi === ci) return;
    if (k.chr) k.seat.remove(k.chr.g);
    k.chr = CHARS[ci].build(); k.chi = ci; k.chr.g.scale.setScalar(1.5); k.chr.g.traverse(function (o) { o.castShadow = true; }); k.seat.add(k.chr.g);
  }
  function animChar(k, t) {
    if (!k.chr) return;
    var sp = Math.min(1, Math.hypot(k.vx || 0, k.vz || 0) / 40), g = k.chr.g;
    k.chr.anim(t, k, sp);
    g.position.y = Math.abs(Math.sin(t * 19)) * 0.025 * sp + (k.finished ? Math.abs(Math.sin(t * 7)) * 0.3 : 0);
    g.rotation.z = -(k.steer || 0) * 0.22; g.rotation.x = k.boost > 0 ? -0.28 : 0;
  }
  var karts = ROSTER.map(function (r, i) { var m = makeKart(r.color); m.slot = i; return m; });
  var ghost = makeKart(BONE, true); ghost.g.visible = false;
  function resetKart(k, kind, name, color, skill, gridSlot, ci) {
    setChar(k, ci); k.kind = kind; k.active = !!kind; k.g.visible = k.active; k.name = name; k.color = color; k.skill = skill; k.paint.color.setHex(color);
    var back = 6 + Math.floor(gridSlot / 2) * 6 + (gridSlot % 2) * 3, i = (N - back) % N, side = gridSlot % 2 ? -3.2 : 3.2;
    k.x = TR.P[i].x + TR.NR[i].x * side; k.z = TR.P[i].z + TR.NR[i].z * side; k.h = TR.heading(i);
    k.vx = k.vz = 0; k.idx = i; k.total = -back; k.d = side; k.steer = 0; k.boost = 0; k.driftT = 0; k.drifting = false; k.fake = false; k.corner = 0;
    k.finished = false; k.finishTime = 0; k.off = side; k.offT = side; k.offClock = 2 + Math.random() * 3; k.mis = 0; k.spin = 0; k.item = null; k.itemClock = 0; k.use = false;
    k.thr = 0; k.pitch = 0; k.roll = 0; k.wspin = 0; k.yawV = 0; k.rumble = 0;
    k.lapStart = 0; k.bestLap = 0; k.lastLap = 1; k.skidT = 0; k.tx = k.x; k.tz = k.z; k.th = k.h; k.peer = null;
    place(k);
  }
  function place(k) {
    k.g.position.set(k.x, 0, k.z); k.g.rotation.y = k.h;
    // body: drift angle eases in, rolls out of corners, pitches under power and braking, rattles on sand
    k.yawV += (((k.drifting || k.fake) ? k.steer * 0.34 : 0) - k.yawV) * 0.18;
    k.body.rotation.y = k.spin > 0 ? clockT * 17 : k.yawV; k.body.rotation.z = k.roll || 0; k.body.rotation.x = k.pitch || 0;
    k.body.position.y = k.rumble ? Math.sin(clockT * 47 + k.slot) * 0.035 * k.rumble : 0;
    for (var wi = 0; wi < k.wh.length; wi++) k.wh[wi].rotation.x = k.wspin || 0;
    k.fw[0].rotation.y = k.fw[1].rotation.y = k.steer * 0.4;
    animChar(k, clockT);
  }

  // ---------- effects: particles, skid marks ----------
  var PN = 200, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pI = 0, tmpC = new THREE.Color();
  for (var q = 0; q < PN; q++) pPos[q * 3 + 1] = -50;
  var pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  var pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 1.5, map: puffTex, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false })); pts.frustumCulled = false; scene.add(pts);
  function emit(x, y, z, vx, vy, vz, life, hex) {
    var i = pI++ % PN; pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z; pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz; pLife[i] = life;
    tmpC.setHex(hex); pCol[i * 3] = tmpC.r; pCol[i * 3 + 1] = tmpC.g; pCol[i * 3 + 2] = tmpC.b;
  }
  function updParticles(dt) {
    for (var i = 0; i < PN; i++) { if (pLife[i] <= 0) continue; pLife[i] -= dt; if (pLife[i] <= 0) { pPos[i * 3 + 1] = -50; continue; } pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt; }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  }
  var SK = 700, skG = new THREE.PlaneGeometry(0.34, 1.5); skG.rotateX(-Math.PI / 2);
  var skid = new THREE.InstancedMesh(skG, new THREE.MeshBasicMaterial(Object.assign({ color: 0x180810, transparent: true, opacity: 0.5, depthWrite: false }, decalOpts)), SK), skI = 0, dummy = new THREE.Object3D();
  skid.frustumCulled = false; scene.add(skid);
  function clearSkids() { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); for (var i = 0; i < SK; i++) skid.setMatrixAt(i, dummy.matrix); skid.instanceMatrix.needsUpdate = true; dummy.scale.set(1, 1, 1); }
  function skidAt(k) {
    var mh = Math.atan2(k.vx, k.vz), c = Math.cos(k.h), s = Math.sin(k.h);
    [-1, 1].forEach(function (side) { dummy.position.set(k.x - s * 1.0 + c * side, 0.03, k.z - c * 1.0 - s * side); dummy.rotation.set(0, mh, 0); dummy.updateMatrix(); skid.setMatrixAt(skI++ % SK, dummy.matrix); });
    skid.instanceMatrix.needsUpdate = true;
  }

  // ---------- items ----------
  var weeds = [], stings = [];
  var weedG = new THREE.IcosahedronGeometry(1.3, 0), weedM = new THREE.MeshBasicMaterial({ color: 0x7a4a22, wireframe: true });
  var stingG = new THREE.ConeGeometry(0.6, 2.2, 8); stingG.rotateX(Math.PI / 2); var stingM = new THREE.MeshLambertMaterial({ color: CORAL, emissive: 0x802010 });
  function clearItems() { weeds.concat(stings).forEach(function (o) { scene.remove(o.mesh); }); weeds = []; stings = []; if (TR) TR.boxes.forEach(function (b) { b.t = 0; b.mesh.visible = itemsOn(); }); }
  function itemsOn() { return M === 'gp' || M === 'split' || M === 'online' || M === 'attract'; }
  function useItem(k) {
    var it = k.item; if (!it) return; k.item = null;
    if (it === 'nitro') { k.boost = 1.3; if (isHuman(k)) sfx('boost'); }
    else if (it === 'weed') { var m = new THREE.Mesh(weedG, weedM); m.position.set(k.x - Math.sin(k.h) * 3.5, 1.3, k.z - Math.cos(k.h) * 3.5); scene.add(m); weeds.push({ mesh: m, owner: k, t: 0 }); if (isHuman(k)) sfx('pick'); }
    else { var s = new THREE.Mesh(stingG, stingM); scene.add(s); stings.push({ mesh: s, owner: k, pi: k.idx + 3, d: k.d, t: 0 }); if (isHuman(k)) sfx('boost'); }
  }
  function spinOut(k) { if (k.spin > 0) return; k.spin = 1.1; k.boost = 0; if (isHuman(k)) sfx('hit'); for (var i = 0; i < 10; i++) emit(k.x, 0.6, k.z, (Math.random() - 0.5) * 12, 3 + Math.random() * 6, (Math.random() - 0.5) * 12, 0.6, SUN); }
  function updItems(dt, t) {
    var i, j, k;
    TR.boxes.forEach(function (b) {
      if (b.t > 0) { b.t -= dt; if (b.t <= 0) b.mesh.visible = true; return; }
      if (!b.mesh.visible) return;
      b.mesh.rotation.y = t * 1.5; b.mesh.position.y = 1.4 + Math.sin(t * 3 + b.x) * 0.15;
      for (j = 0; j < karts.length; j++) { k = karts[j]; if (!k.active || k.kind === 'remote' || k.item) continue; if (Math.abs(k.x - b.x) < 2.2 && Math.abs(k.z - b.z) < 2.2) {
        b.t = 4; b.mesh.visible = false; var r = Math.random();
        k.item = (M === 'online') ? 'nitro' : r < 0.4 ? 'nitro' : r < 0.7 ? 'weed' : 'sting'; k.itemClock = 1 + Math.random() * 4; if (isHuman(k)) sfx('pick'); break; } }
    });
    for (i = weeds.length - 1; i >= 0; i--) { var w = weeds[i]; w.t += dt; w.mesh.rotation.x += dt * 2; w.mesh.rotation.y += dt;
      var gone = w.t > 30;
      for (j = 0; j < karts.length && !gone; j++) { k = karts[j]; if (!k.active || k.kind === 'remote' || (k === w.owner && w.t < 1.2)) continue; if (Math.hypot(k.x - w.mesh.position.x, k.z - w.mesh.position.z) < 2.3) { spinOut(k); gone = true; } }
      if (gone) { scene.remove(w.mesh); weeds.splice(i, 1); } }
    for (i = stings.length - 1; i >= 0; i--) { var s = stings[i]; s.t += dt; s.pi += 95 / TR.SEG * dt;
      var tgt = null, best = 1e9;
      for (j = 0; j < karts.length; j++) { k = karts[j]; if (!k.active || k === s.owner) continue; var ahead = ((k.idx - Math.floor(s.pi)) % N + N) % N; if (ahead < 120 && ahead < best) { best = ahead; tgt = k; } }
      if (tgt) s.d += (tgt.d - s.d) * Math.min(1, 5 * dt);
      var a = ((Math.floor(s.pi) % N) + N) % N, fr = s.pi - Math.floor(s.pi), b2 = (a + 1) % N;
      var x = TR.P[a].x + (TR.P[b2].x - TR.P[a].x) * fr + TR.NR[a].x * s.d, z = TR.P[a].z + (TR.P[b2].z - TR.P[a].z) * fr + TR.NR[a].z * s.d;
      s.mesh.position.set(x, 1, z); s.mesh.rotation.y = TR.heading(a); emit(x, 1, z, 0, 1, 0, 0.3, CORAL);
      var hit = s.t > 6;
      for (j = 0; j < karts.length && !hit; j++) { k = karts[j]; if (!k.active || k === s.owner || k.kind === 'remote') continue; if (Math.hypot(k.x - x, k.z - z) < 2.6) { spinOut(k); hit = true; } }
      if (hit) { scene.remove(s.mesh); stings.splice(i, 1); } }
  }

  // ---------- physics ----------
  function isHuman(k) { return k.kind === 'p1' || k.kind === 'p2'; }
  function locate(k) {
    var best = k.idx, bd = 1e9;
    for (var o = -25; o <= 25; o++) { var j = (k.idx + o + N) % N, dx = k.x - TR.P[j].x, dz = k.z - TR.P[j].z, d2 = dx * dx + dz * dz; if (d2 < bd) { bd = d2; best = j; } }
    k.total += ((best - k.idx + N + N / 2) % N) - N / 2; k.idx = best;
    k.d = (k.x - TR.P[best].x) * TR.NR[best].x + (k.z - TR.P[best].z) * TR.NR[best].z;
  }
  function step(k, inp, dt) {
    if (k.spin > 0) { k.spin -= dt; inp = { steer: 0, throttle: false, brake: false, drift: false }; k.vx *= Math.exp(-2.4 * dt); k.vz *= Math.exp(-2.4 * dt); }
    var sp0 = Math.hypot(k.vx, k.vz), vf0 = k.vx * Math.sin(k.h) + k.vz * Math.cos(k.h);
    k.steer += (inp.steer - k.steer) * Math.min(1, (Math.abs(inp.steer) < Math.abs(k.steer) ? 9 : 6.5) * dt);
    k.thr += ((inp.throttle ? 1 : 0) - k.thr) * Math.min(1, 7 * dt);
    var drift = inp.drift && sp0 > 16;
    var turn = (drift ? 2.5 : 1.9) * Math.min(1, sp0 / 10) * (1 - 0.25 * sp0 / BOOSTV);
    k.h += k.steer * turn * dt * (vf0 < -0.5 ? -1 : 1);
    var fx = Math.sin(k.h), fz = Math.cos(k.h), vf = k.vx * fx + k.vz * fz, vl = k.vx * fz - k.vz * fx;
    var offRoad = Math.abs(k.d) > HW + 1.4, top = MAXV * k.skill * (inp.pace || 1);
    if (k.boost > 0) { top = BOOSTV; vf += 30 * dt; k.boost -= dt; }
    if (offRoad) top *= 0.45;
    if (vf < top) vf += ACC * k.thr * (1.25 - 0.85 * Math.max(0, vf) / top) * dt;
    if (inp.brake) { vf -= (vf > 0 ? 46 : 14) * dt; vf = Math.max(vf, -12); }
    if (!inp.throttle && !inp.brake) vf -= vf * 0.7 * dt;
    if (vf > top) vf -= (vf - top) * Math.min(1, (offRoad ? 3.5 : 1.6) * dt);
    vl *= Math.exp(-(drift ? 2.2 : 9) * dt);
    var ax = (vf - vf0) / Math.max(dt, 0.001), spf = Math.min(1, sp0 / 30);
    k.pitch += (Math.max(-0.07, Math.min(0.09, -ax * 0.0032)) - k.pitch) * Math.min(1, 8 * dt);
    k.roll += (k.steer * spf * (drift ? 0.14 : 0.085) - k.roll) * Math.min(1, 7 * dt);
    k.wspin += vf * dt / 0.42; k.rumble += ((offRoad ? Math.min(1, sp0 / 25) : 0) - k.rumble) * Math.min(1, 10 * dt);
    k.vx = fx * vf + fz * vl; k.vz = fz * vf - fx * vl; k.x += k.vx * dt; k.z += k.vz * dt;
    locate(k);
    if (Math.abs(k.d) > WALL) {
      var s = Math.sign(k.d), n = TR.NR[k.idx], over = k.d - s * WALL; k.x -= n.x * over; k.z -= n.z * over; k.d = s * WALL;
      var vn = k.vx * n.x + k.vz * n.z;
      if (vn * s > 0) { k.vx -= n.x * vn * 1.4; k.vz -= n.z * vn * 1.4; k.vx *= 0.985; k.vz *= 0.985;
        if (Math.abs(vn) > 5) { for (var e = 0; e < 6; e++) emit(k.x + n.x * s, 0.7, k.z + n.z * s, (Math.random() - 0.5) * 14, 2 + Math.random() * 7, (Math.random() - 0.5) * 14, 0.4, SUN); if (isHuman(k)) sfx('hit'); } }
    }
    for (var p = 0; p < TR.PADS.length; p++) { var dI = Math.abs(((k.idx - TR.PADS[p] + N + N / 2) % N) - N / 2); if (dI < 3 && Math.abs(k.d) < 3.2 && k.boost < 0.9) { k.boost = 1.1; if (isHuman(k)) sfx('boost'); } }
    if (drift && Math.abs(k.steer) > 0.3) { k.driftT += dt; k.drifting = true; }
    else { if (k.drifting && k.driftT > 0.6) { k.boost = Math.max(k.boost, k.driftT > 2.1 ? 1.4 : k.driftT > 1.3 ? 1.0 : 0.6); if (isHuman(k)) sfx('boost'); } k.driftT = 0; k.drifting = false; }
    if (k.use) { k.use = false; useItem(k); }
    // trails
    var sliding = k.drifting || k.fake;
    if (sliding || (offRoad && sp0 > 8)) {
      var tier = k.driftT > 2.1 ? CORAL : k.driftT > 1.3 ? SUN : sliding ? BONE : 0xe9b877;
      emit(k.x - fx * 1.3 + (Math.random() - 0.5) * 1.6, 0.3, k.z - fz * 1.3 + (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 3, 0.6, tier);
      if (sliding) { k.skidT -= dt; if (k.skidT <= 0) { k.skidT = 0.035; skidAt(k); } }
    }
    if (k.boost > 0) emit(k.x - fx * 1.6, 0.6, k.z - fz * 1.6, -k.vx * 0.2, 0.5, -k.vz * 0.2, 0.25, Math.random() < 0.5 ? SUN : CORAL);
  }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function aiInput(k, dt) {
    var sp = Math.hypot(k.vx, k.vz), i, o, humans = karts.filter(function (h) { return h.active && isHuman(h) && !h.finished; });
    // racing line: wander, then defend against a human right behind
    k.offClock -= dt; if (k.offClock <= 0) { k.offClock = 3 + Math.random() * 4; k.offT = (Math.random() - 0.5) * 9; }
    for (i = 0; i < humans.length; i++) { var gap = k.total - humans[i].total; if (gap > 3 && gap < 28) k.offT = Math.max(-5, Math.min(5, humans[i].d)); }
    for (i = 0; i < TR.PADS.length; i++) { var ah = ((TR.PADS[i] - k.idx) % N + N) % N; if (ah < 45) k.offT = 0; }
    k.off += (k.offT - k.off) * Math.min(1, 1.2 * dt);
    var j = (k.idx + Math.floor((8 + sp * 0.4) / TR.SEG)) % N;
    var tx = TR.P[j].x + TR.NR[j].x * k.off, tz = TR.P[j].z + TR.NR[j].z * k.off, diff = wrap(Math.atan2(tx - k.x, tz - k.z) - k.h);
    var vt = 1e9, look = Math.floor(sp * 0.9 / TR.SEG) + 6;
    for (var s = 0; s < look; s += 3) vt = Math.min(vt, TR.VC[(k.idx + s) % N]);
    // the odd late-braking mistake
    if (k.mis > 0) { k.mis -= dt; vt *= 1.25; } else if (k.kind === 'ai' && vt < 32 && Math.random() < dt * 0.05) k.mis = 1.1;
    // slide through tight corners and pick up a small exit boost
    if (TR.VC[k.idx] < 30 && sp > 22) k.corner += dt; else { if (k.corner > 0.8 && k.kind === 'ai') k.boost = Math.max(k.boost, 0.45); k.corner = 0; }
    k.fake = k.corner > 0.3 && Math.abs(k.steer) > 0.4;
    // items
    if (k.item && k.spin <= 0) { k.itemClock -= dt; if (k.itemClock <= 0) {
      var go = k.itemClock < -8;
      if (k.item === 'nitro') go = go || vt > 50;
      else for (o = 0; o < karts.length; o++) { var ot = karts[o]; if (!ot.active || ot === k) continue; var g2 = ot.total - k.total; if (k.item === 'weed' ? (g2 < -3 && g2 > -30) : (g2 > 5 && g2 < 70)) go = true; }
      if (go) k.use = true; } }
    var lead = humans.length ? humans[0] : null, pace = 1;
    if (lead && k.kind === 'ai') { var gp = k.total - lead.total; pace = gp > 90 ? 0.93 : gp < -90 ? 1.05 : 1; }
    return { steer: Math.max(-1, Math.min(1, diff * 2.5)), throttle: sp < vt, brake: sp > vt + 5, drift: false, pace: pace };
  }
  function collide() {
    for (var a = 0; a < karts.length; a++) for (var b = a + 1; b < karts.length; b++) {
      var A = karts[a], B = karts[b]; if (!A.active || !B.active) continue;
      var dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz);
      if (d < 2.5 && d > 0.001) {
        var nx = dx / d, nz = dz / d, ra = A.kind === 'remote', rb = B.kind === 'remote'; if (ra && rb) continue;
        var push = (2.5 - d), wa = ra ? 0 : rb ? 1 : 0.5, wb = rb ? 0 : ra ? 1 : 0.5;
        A.x -= nx * push * wa; A.z -= nz * push * wa; B.x += nx * push * wb; B.z += nz * push * wb;
        var rel = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz;
        if (rel < 0) { if (!ra) { A.vx += nx * rel * 0.5; A.vz += nz * rel * 0.5; } if (!rb) { B.vx -= nx * rel * 0.5; B.vz -= nz * rel * 0.5; } }
      }
    }
  }

  // ---------- input ----------
  var keys = {}, touch = { L: false, R: false, B: false, D: false }, touchMode = false;
  var ITEMKEYS = { KeyE: 'p1', KeyX: 'p1', Slash: 'p2', Period: 'p2', Numpad0: 'p2' };
  addEventListener('keydown', function (e) {
    if (!full) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash'].indexOf(e.code) >= 0) e.preventDefault();
    if (!e.repeat && ITEMKEYS[e.code] && state === 'race') { var who = M === 'split' ? ITEMKEYS[e.code] : 'p1'; karts.forEach(function (k) { if (k.active && k.kind === who) k.use = true; }); }
    keys[e.code] = true;
    if (e.code === 'KeyR' && (state === 'race' || state === 'count') && M !== 'online') startRace(M);
    if (e.code === 'Escape') toMenu();
  });
  addEventListener('keyup', function (e) { keys[e.code] = false; });
  addEventListener('blur', function () { for (var k in keys) keys[k] = false; });
  [['tL', 'L'], ['tR', 'R'], ['tB', 'B'], ['tD', 'D']].forEach(function (p) {
    var el = $(p[0]), set = function (v) { return function (e) { e.preventDefault(); touch[p[1]] = v; el.classList.toggle('down', v); }; };
    el.addEventListener('pointerdown', set(true)); ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { el.addEventListener(n, set(false)); });
  });
  $('tI').addEventListener('pointerdown', function (e) { e.preventDefault(); karts.forEach(function (k) { if (k.active && k.kind === 'p1') k.use = true; }); });
  addEventListener('touchstart', function () { touchMode = true; }, { passive: true });
  function humanInput(k) {
    var l, r, up, dn, dr;
    if (M === 'split' && k.kind === 'p1') { l = keys.KeyA; r = keys.KeyD; up = keys.KeyW; dn = keys.KeyS; dr = keys.ShiftLeft || keys.Space; }
    else if (M === 'split') { l = keys.ArrowLeft; r = keys.ArrowRight; up = keys.ArrowUp; dn = keys.ArrowDown; dr = keys.ShiftRight || keys.Enter; }
    else { l = keys.ArrowLeft || keys.KeyA || touch.L; r = keys.ArrowRight || keys.KeyD || touch.R; dn = keys.ArrowDown || keys.KeyS || touch.B; up = keys.ArrowUp || keys.KeyW || (touchMode && !dn); dr = keys.Space || keys.ShiftLeft || keys.ShiftRight || touch.D; }
    return { steer: (l ? 1 : 0) - (r ? 1 : 0), throttle: !!up, brake: !!dn, drift: !!dr };
  }

  // ---------- audio ----------
  var AU = { ctx: null, sound: true, music: true, eng: null, engG: null, skidG: null, master: null, noise: null, step: 0, next: 0, timer: 0 };
  function initAudio() {
    if (AU.ctx) { if (AU.ctx.resume) AU.ctx.resume(); return; }
    try {
      var c = AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
      AU.master = c.createGain(); AU.master.gain.value = AU.sound ? 1 : 0; AU.master.connect(c.destination);
      var len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; AU.noise = buf;
      var o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(); o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 600;
      AU.engG = c.createGain(); AU.engG.gain.value = 0; o1.connect(lp); o2.connect(lp); lp.connect(AU.engG); AU.engG.connect(AU.master); o1.start(); o2.start(); AU.eng = [o1, o2, lp];
      var ns = c.createBufferSource(); ns.buffer = buf; ns.loop = true; var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 6;
      AU.skidG = c.createGain(); AU.skidG.gain.value = 0; ns.connect(bp); bp.connect(AU.skidG); AU.skidG.connect(AU.master); ns.start();
      AU.musG = c.createGain(); AU.musG.gain.value = 0.5; AU.musG.connect(AU.master);
    } catch (e) { AU.ctx = null; }
  }
  function tone(type, f, t, dur, vol, dest, f2) {
    var c = AU.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(dest || AU.master); o.start(t); o.stop(t + dur + 0.02);
  }
  function burst(t, dur, vol, freq, dest) {
    var c = AU.ctx, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); s.buffer = AU.noise; f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = 1.2;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(f); f.connect(g); g.connect(dest || AU.master); s.start(t); s.stop(t + dur + 0.02); return f;
  }
  function sfx(n, a) {
    if (!AU.ctx || !AU.sound) return; var t = AU.ctx.currentTime;
    try {
      if (n === 'beep') tone('square', a || 440, t, 0.18, 0.07);
      else if (n === 'go') tone('square', 880, t, 0.5, 0.08);
      else if (n === 'boost') { burst(t, 0.6, 0.16, 500).frequency.exponentialRampToValueAtTime(3200, t + 0.5); tone('sawtooth', 180, t, 0.4, 0.05, null, 520); }
      else if (n === 'pick') { tone('square', 660, t, 0.09, 0.06); tone('square', 990, t + 0.09, 0.14, 0.06); }
      else if (n === 'hit') { tone('sine', 150, t, 0.25, 0.25, null, 50); burst(t, 0.15, 0.18, 900); }
      else if (n === 'roar') { burst(t, 1.6, 0.3, 220).frequency.exponentialRampToValueAtTime(900, t + 1.2); tone('sawtooth', 70, t, 1.5, 0.12, null, 260); }
      else if (n === 'win') [523, 659, 784, 1047].forEach(function (f, i) { tone('square', f, t + i * 0.12, 0.25, 0.06); });
    } catch (e) {}
  }
  // a small surf-rock loop: bass, plucked lead, hat
  var BASS = [82.4, 0, 82.4, 0, 98, 0, 82.4, 0, 110, 0, 110, 0, 98, 0, 73.4, 0], LEAD = [330, 0, 392, 330, 0, 440, 0, 392, 494, 0, 440, 392, 0, 330, 294, 0];
  function musicTick() {
    if (!AU.ctx || !AU.music || !AU.sound || !(state === 'race' || state === 'count')) { AU.next = 0; return; }
    var c = AU.ctx, spb = 60 / 132 / 2; if (!AU.next || AU.next < c.currentTime) AU.next = c.currentTime + 0.05;
    while (AU.next < c.currentTime + 0.3) {
      var s = AU.step % 16, bar = Math.floor(AU.step / 16) % 4, tr = bar === 2 ? 1.335 : bar === 3 ? 1.189 : 1;
      if (BASS[s]) tone('triangle', BASS[s] * tr, AU.next, spb * 1.7, 0.22, AU.musG);
      if (LEAD[s] && bar % 2 === 1 || (LEAD[s] && s % 4 === 0)) tone('square', LEAD[s] * tr, AU.next, spb * 0.9, 0.035, AU.musG);
      burst(AU.next, 0.04, s % 4 === 2 ? 0.1 : 0.035, 7000, AU.musG);
      if (s % 8 === 0) tone('sine', 120, AU.next, 0.12, 0.3, AU.musG, 45);
      AU.next += spb; AU.step++;
    }
  }
  setInterval(musicTick, 100);

  // ---------- save ----------
  var SAVE = {}; try { SAVE = JSON.parse(localStorage.getItem('cck-save') || '{}') || {}; } catch (e) { SAVE = {}; }
  function rec(ti) { return SAVE['t' + ti] || (SAVE['t' + ti] = {}); }
  function persist() { try { localStorage.setItem('cck-save', JSON.stringify(SAVE)); } catch (e) {} }

  // ---------- views / HUD ----------
  var views = [], huds = $('huds'), W = 1, H = 1, full = false, visible = true;
  function ord(n) { return n + (['th', 'st', 'nd', 'rd'][n % 10 > 3 || (n > 10 && n < 14) ? 0 : n % 10]); }
  function fmt(t) { return Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60).toFixed(1); }
  function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }
  function makeView(k) {
    var el = document.createElement('div'); el.className = 'hud';
    el.innerHTML = '<div class="hPos"><b></b><span></span></div><div class="hLap"><span>Lap</span><b class="l"></b><span>Time</span><b class="t"></b></div><div class="hItem" hidden></div><div class="hNote" hidden></div><div class="hSpd"><b></b><span>km/h</span><div class="hMeter"><i></i></div></div>';
    huds.appendChild(el);
    var qs = function (s) { return el.querySelector(s); };
    return { kart: k, cam: new THREE.PerspectiveCamera(62, 1, 0.5, 1700), camPos: new THREE.Vector3(k.x - Math.sin(k.h) * 10, 5, k.z - Math.cos(k.h) * 10), yaw: k.h, look: new THREE.Vector3(k.x + Math.sin(k.h) * 5, 1.4, k.z + Math.cos(k.h) * 5), el: el,
      pos: qs('.hPos b'), of: qs('.hPos span'), lap: qs('.l'), time: qs('.t'), item: qs('.hItem'), note: qs('.hNote'), spd: qs('.hSpd b'), meter: qs('.hMeter i'), noteT: 0, rect: [0, 0, 1, 1] };
  }
  function layout() {
    var r = stage.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    views.forEach(function (v, i) {
      var n = views.length, side = W >= H;
      v.rect = n === 1 ? [0, 0, W, H] : side ? [i * W / 2, 0, W / 2, H] : [0, i * H / 2, W, H / 2];
      v.el.style.cssText = 'left:' + v.rect[0] + 'px;top:' + v.rect[1] + 'px;width:' + v.rect[2] + 'px;height:' + v.rect[3] + 'px';
      v.cam.aspect = v.rect[2] / v.rect[3]; v.cam.updateProjectionMatrix();
    });
    stage.classList.toggle('two', views.length === 2);
  }
  function note(v, text, secs) { v.note.textContent = text; v.note.hidden = false; v.noteT = secs; }
  function standings() {
    return karts.filter(function (k) { return k.active; }).sort(function (a, b) { return (a.finished && b.finished) ? a.finishTime - b.finishTime : a.finished ? -1 : b.finished ? 1 : b.total - a.total; });
  }
  var mini = $('mini'), mg = mini.getContext('2d');
  function drawMap() {
    var mx = function (x) { return 132 - (x - TR.cx) * TR.ms; }, mz = function (z) { return 132 + (z - TR.cz) * TR.ms; };
    mg.clearRect(0, 0, 264, 264); mg.lineJoin = 'round'; mg.beginPath();
    for (var i = 0; i <= N; i += 4) { var p = TR.P[i % N]; if (i) mg.lineTo(mx(p.x), mz(p.z)); else mg.moveTo(mx(p.x), mz(p.z)); }
    mg.closePath(); mg.strokeStyle = '#fdebc8'; mg.lineWidth = 11; mg.stroke(); mg.strokeStyle = '#2a0d1a'; mg.lineWidth = 6; mg.stroke();
    karts.forEach(function (k) { if (!k.active) return; var hu = isHuman(k); mg.beginPath(); mg.arc(mx(k.x), mz(k.z), hu ? 9 : 6, 0, 6.3); mg.fillStyle = hex(k.color); mg.fill(); mg.strokeStyle = hu ? '#fdebc8' : '#2a0d1a'; mg.lineWidth = hu ? 3 : 1.5; mg.stroke(); });
  }
  function updHud(v, dt) {
    var k = v.kart, list = standings(), laps = TR.def.laps;
    v.pos.textContent = M === 'tt' ? 'TT' : ord(list.indexOf(k) + 1);
    v.of.textContent = M === 'tt' ? (rec(TR.id).lap ? 'best ' + fmt(rec(TR.id).lap) : 'no best yet') : 'of ' + list.length;
    v.lap.textContent = Math.max(1, Math.min(laps, Math.floor(k.total / N) + 1)) + '/' + laps;
    v.time.textContent = fmt(k.finished ? k.finishTime : raceTime);
    v.spd.textContent = Math.round(Math.hypot(k.vx, k.vz) * 3.2);
    if (k.boost > 0) { v.meter.style.width = Math.min(100, k.boost / 1.4 * 100) + '%'; v.meter.style.background = '#f0512c'; }
    else { v.meter.style.width = Math.min(100, k.driftT / 2.1 * 100) + '%'; v.meter.style.background = k.driftT > 1.3 ? '#ffcf3a' : '#fdebc8'; }
    if (k.item) { v.item.hidden = false; v.item.textContent = ITEMS[k.item] + (touchMode ? '' : M === 'split' ? (k.kind === 'p1' ? '  [E]' : '  [/]') : '  [E]'); } else v.item.hidden = true;
    if (v.noteT > 0) { v.noteT -= dt; if (v.noteT <= 0) v.note.hidden = true; }
  }

  // ---------- online ----------
  var NET = { room: null, st: 'off', race: 0, last: 0, nick: 'Racer ' + (10 + Math.floor(Math.random() * 90)), col: Math.floor(Math.random() * 6), sendT: 0, lobbyT: 0 };
  if (window.claude && window.claude.use) { try { window.claude.use('room').then(function (r) { NET.room = r; if (r) r.onPeers(function () {}, function () { NET.room = null; }); refreshLobby(); }, function () {}); } catch (e) {} }
  function pres(patch) { if (NET.room) { try { var p = NET.room.presence(patch); if (p && p.catch) p.catch(function () {}); } catch (e) {} } }
  function racers() { if (!NET.room) return []; var out = []; try { NET.room.peers().forEach(function (p) { if (p && p.presence && p.presence.cck === 1) out.push(p); }); } catch (e) {} return out; }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function chOf(p) { return ((num(p.presence.ch, 0) | 0) % 6 + 6) % 6; }
  function nickOf(p) { var s = typeof p.presence.nick === 'string' ? p.presence.nick.replace(/[^\w \-]/g, '').slice(0, 12) : ''; return s || 'Racer'; }
  function refreshLobby() {
    var el = $('lobbyList'); if (!el) return; el.textContent = '';
    if (!NET.room) { $('lobbyMsg').textContent = 'Online racing is not available in this view. It needs the page opened by signed-in people it has been shared with. Split screen works anywhere.'; $('lobbyGo').disabled = true; return; }
    var list = racers(); $('lobbyGo').disabled = false;
    $('lobbyMsg').textContent = list.length < 2 ? 'Nobody else is here yet. Share the page, ask them to open Online, then start. You can also start alone.' : list.length + ' racers on the grid. Anyone can start the race.';
    list.forEach(function (p) { var li = document.createElement('li'), dot = document.createElement('i'), s = document.createElement('span'); dot.style.background = hex(CHARS[chOf(p)].color); s.textContent = nickOf(p) + ' as ' + CHARS[chOf(p)].name + (p.isMe && p.sameTab ? ' (you)' : '') + (p.presence.st === 'race' ? ' · racing' : ''); li.append(dot, s); el.append(li); });
  }
  function enterLobby() { NET.st = 'lobby'; pres({ cck: 1, nick: NET.nick, ch: myChar(), st: 'lobby', race: 0, tot: 0, ft: 0 }); show('scrLobby'); refreshLobby(); }
  function leaveNet() { if (NET.st !== 'off') { NET.st = 'off'; pres({ cck: null, st: null, race: null }); } }
  function joinRace(id, trk) {
    NET.race = NET.last = id; NET.st = 'race'; trackSel = trk === 1 ? 1 : 0;
    var ids = racers().map(function (p) { return p.peer; }).sort(), mine = ''; racers().forEach(function (p) { if (p.isMe && p.sameTab) mine = p.peer; });
    NET.slot = Math.max(0, ids.indexOf(mine)) % 6;
    startRace('online');
    pres({ st: 'race', race: id, trk: trackSel, tot: Math.round(me().total), ft: 0, x: me().x, z: me().z, h: me().h });
  }
  function netFrame(dt, now) {
    if (NET.st === 'off' || !NET.room) return;
    var list = racers(), i;
    if (NET.st === 'lobby') {
      NET.lobbyT -= dt; if (NET.lobbyT <= 0) { NET.lobbyT = 0.6; refreshLobby(); }
      for (i = 0; i < list.length; i++) { var p = list[i], pr = p.presence; if (p.isMe && p.sameTab) continue;
        if (pr.st === 'race' && typeof pr.race === 'number' && pr.race && pr.race !== NET.last && Date.now() - p.updatedAt < 5000 && num(pr.tot, 0) < N * 0.4) { joinRace(pr.race, pr.trk); return; } }
      return;
    }
    // racing: mirror the others onto spare karts
    var seen = {};
    for (i = 0; i < list.length; i++) { var q2 = list[i], s = q2.presence; if ((q2.isMe && q2.sameTab) || s.race !== NET.race) continue;
      var k = null; karts.forEach(function (c) { if (c.active && c.kind === 'remote' && c.peer === q2.peer) k = c; });
      if (!k) { for (var j = 0; j < 5; j++) if (!karts[j].active) { k = karts[j]; resetKart(k, 'remote', nickOf(q2), CHARS[chOf(q2)].color, 1, j, chOf(q2)); k.peer = q2.peer; k.x = num(s.x, k.x); k.z = num(s.z, k.z); break; } }
      if (!k) continue; seen[q2.peer] = 1;
      k.tx = num(s.x, k.tx); k.tz = num(s.z, k.tz); k.th = num(s.h, k.th); k.steer = Math.max(-1, Math.min(1, num(s.sp, 0))); k.fake = s.dr === 1; k.total = num(s.tot, k.total);
      var ft = num(s.ft, 0); k.finished = ft > 0; k.finishTime = ft;
      var a = 1 - Math.exp(-12 * dt), ox = k.x, oz = k.z; k.x += (k.tx - k.x) * a; k.z += (k.tz - k.z) * a; k.h += wrap(k.th - k.h) * a; k.vx = (k.x - ox) / Math.max(dt, 0.001); k.vz = (k.z - oz) / Math.max(dt, 0.001);
    }
    karts.forEach(function (c) { if (c.active && c.kind === 'remote' && !seen[c.peer]) { c.active = false; c.g.visible = false; } });
    NET.sendT -= dt;
    if (NET.sendT <= 0) { NET.sendT = 0.05; var m = me(); pres({ x: +m.x.toFixed(2), z: +m.z.toFixed(2), h: +m.h.toFixed(3), sp: +m.steer.toFixed(2), dr: (m.drifting ? 1 : 0), tot: Math.round(m.total), ft: m.finished ? +m.finishTime.toFixed(2) : 0 }); }
  }

  // ---------- game state ----------
  var clockT = 0, M = 'attract', state = 'attract', trackSel = 0, countT = 0, raceTime = 0, doneT = 0, lastCount = 0, ghostBuf = [], ghostT = 0, camClock = 0, camMode = 0;
  var tmp = new THREE.Vector3(), look = new THREE.Vector3(), big = $('gBig');
  var PACES = [0.97, 0.95, 0.93, 0.91, 0.89];
  function myChar() { return ((SAVE.ch | 0) % 6 + 6) % 6; }
  function p2Char() { var c = SAVE.ch2 === undefined ? (myChar() + 2) % 6 : ((SAVE.ch2 | 0) % 6 + 6) % 6; return c === myChar() ? (c + 1) % 6 : c; }
  function me() { return karts[5]; }
  function show(id) { ['scrMenu', 'scrLobby', 'scrRes'].forEach(function (s) { $(s).hidden = s !== id; }); $('gCard').hidden = !id; }
  function setup(mode) {
    M = mode; buildTrack(trackSel); clearSkids();
    var cfg = mode === 'gp' ? ['ai', 'ai', 'ai', 'ai', 'ai', 'p1'] : mode === 'split' ? ['ai', 'ai', 'ai', 'ai', 'p2', 'p1'] : mode === 'attract' ? ['ai', 'ai', 'ai', 'ai', 'ai', 'ai'] : [null, null, null, null, null, 'p1'];
    var pc = myChar(), p2 = p2Char(), pool = [0, 1, 2, 3, 4, 5].filter(function (c) { return mode === 'attract' || (c !== pc && (mode !== 'split' || c !== p2)); }), ai = 0;
    karts.forEach(function (k, i) {
      var ci = i, skill = 1, slot = i, name;
      if (cfg[i] === 'p1') { ci = pc; name = mode === 'split' ? 'P1 ' + CHARS[ci].name : mode === 'online' ? NET.nick : CHARS[ci].name; if (mode === 'online') slot = NET.slot || 0; if (mode === 'tt') slot = 0; }
      else if (cfg[i] === 'p2') { ci = p2; name = 'P2 ' + CHARS[ci].name; }
      else { ci = pool[ai % pool.length]; skill = mode === 'attract' && ai === 5 ? 0.96 : PACES[ai % 5]; name = CHARS[ci].name; ai++; }
      resetKart(k, cfg[i], name, CHARS[ci].color, skill, slot, ci);
    });
    clearItems();
    huds.textContent = ''; views = mode === 'split' ? [makeView(karts[5]), makeView(karts[4])] : [makeView(karts[5])];
    ghost.g.visible = false; ghostBuf = []; ghostT = 0; raceTime = 0;
    layout();
  }
  function startRace(mode) {
    initAudio(); setup(mode); state = 'count'; countT = 3.2; lastCount = 0; show(null);
    stage.classList.add('racing'); stage.classList.toggle('touch', touchMode && mode !== 'split');
  }
  function attract() { leaveNet(); setup('attract'); state = 'attract'; stage.classList.remove('racing', 'touch'); big.hidden = true; }
  function toMenu() { if (!full) return; if (state !== 'attract') attract(); refreshMenu(); show('scrMenu'); }
  function refreshMenu() {
    var r = rec(trackSel), bits = []; if (r.lap) bits.push('Best lap ' + fmt(r.lap)); if (r.race) bits.push('Best Grand Prix ' + fmt(r.race));
    $('menuBest').textContent = bits.length ? bits.join(' · ') : 'No times set on this circuit yet.';
    [0, 1].forEach(function (i) { $('trk' + i).setAttribute('aria-pressed', i === trackSel); });
    var c = CHARS[myChar()]; $('chName').textContent = c.name; $('chTag').textContent = c.tag; $('p2Char').textContent = 'Player 2 drives ' + CHARS[p2Char()].name;
    Array.prototype.forEach.call($('chBtns').children, function (b, i) { b.setAttribute('aria-pressed', i === myChar()); });
    $('optSound').textContent = 'Sound ' + (AU.sound ? 'on' : 'off'); $('optMusic').textContent = 'Music ' + (AU.music ? 'on' : 'off');
  }
  function results() {
    var list = standings(), ol = $('resList'), k = me(), r = rec(TR.id), title, sub = [];
    if (M === 'tt') { title = 'Time trial done'; sub.push('Best lap this run ' + (k.bestLap ? fmt(k.bestLap) : 'none')); if (r.lap) sub.push('Record ' + fmt(r.lap)); }
    else {
      var place = list.indexOf(k) + 1;
      if (M === 'split') { var w = list.filter(isHuman)[0]; title = w.name + ' wins'; } else title = place === 1 ? 'You won!' : 'Finished ' + ord(place);
      sub.push('Race time ' + fmt(k.finishTime)); if (k.bestLap) sub.push('best lap ' + fmt(k.bestLap));
      if (M === 'gp' && (!r.race || k.finishTime < r.race)) { r.race = +k.finishTime.toFixed(2); persist(); sub.push('new best'); }
      if (place === 1) sfx('win');
    }
    $('resTitle').textContent = title; $('resSub').textContent = sub.join(' · ');
    ol.textContent = '';
    if (M !== 'tt') list.forEach(function (c, i) {
      var li = document.createElement('li'); if (isHuman(c)) li.className = 'me';
      var a = document.createElement('span'), dot = document.createElement('i'), b = document.createElement('span'), t = document.createElement('span');
      a.textContent = ord(i + 1); dot.style.background = hex(c.color); b.textContent = c.name; t.textContent = c.finished ? fmt(c.finishTime) : 'still racing'; li.append(a, dot, b, t); ol.append(li);
    });
    $('resAgain').textContent = M === 'online' ? 'Back to the lobby' : 'Race again';
    show('scrRes'); stage.classList.remove('touch');
  }
  function lapLogic(v) {
    var k = v.kart, lap = Math.floor(k.total / N) + 1, laps = TR.def.laps;
    if (lap > k.lastLap && !k.finished) {
      var lt = raceTime - k.lapStart; k.lapStart = raceTime; k.lastLap = lap; if (!k.bestLap || lt < k.bestLap) k.bestLap = lt;
      var r = rec(TR.id), isRec = !r.lap || lt < r.lap;
      if (isRec && lap > 1 && lt > 5) { r.lap = +lt.toFixed(2); if (M === 'tt') r.ghost = ghostBuf.slice(0, 900); persist(); }
      if (lap <= laps) note(v, (lap === laps ? 'Final lap' : 'Lap ' + (lap - 1)) + ' · ' + fmt(lt) + (isRec && lap > 1 ? ' · record' : ''), 2.6);
      sfx('beep', 660); ghostBuf = []; ghostT = 0;
    }
  }
  function update(dt, now) {
    var t = now / 1000, i; clockT = t;
    if (state === 'count') {
      countT -= dt; var n = Math.ceil(countT - 0.2); big.hidden = false; big.textContent = n > 0 ? n : 'GO!';
      if (n !== lastCount) { lastCount = n; sfx(n > 0 ? 'beep' : 'go'); }
      if (countT <= 0.2) state = 'race';
    } else if (state !== 'menuidle') {
      if (state !== 'attract' && countT > -0.8) { countT -= dt; if (countT <= -0.8) big.hidden = true; }
      raceTime += dt;
      // fixed small physics steps so the feel does not change with frame rate
      var sub = Math.max(1, Math.min(8, Math.round(dt * 120))), hs = dt / sub, inps = karts.map(function (k) { return (!k.active || k.kind === 'remote') ? null : (isHuman(k) && !k.finished) ? humanInput(k) : aiInput(k, dt); });
      for (var si = 0; si < sub; si++) { karts.forEach(function (k, ki) { if (inps[ki]) step(k, inps[ki], hs); }); collide(); }
      if (itemsOn()) updItems(dt, t);
      var laps = TR.def.laps;
      if (state !== 'attract') {
        karts.forEach(function (k) { if (k.active && k.kind !== 'remote' && !k.finished && k.total >= laps * N) { k.finished = true; k.finishTime = raceTime; } });
        views.forEach(lapLogic);
        if (M === 'tt') {
          ghostT += dt; if (ghostBuf.length < ghostT * 10) ghostBuf.push([+me().x.toFixed(1), +me().z.toFixed(1), +me().h.toFixed(2)]);
          var gh = rec(TR.id).ghost, gi = ghostT * 10, g0 = gh && gh[Math.floor(gi)], g1 = gh && gh[Math.floor(gi) + 1];
          if (g0 && g1 && me().total > 0) { var f = gi - Math.floor(gi); ghost.g.visible = true; ghost.g.position.set(g0[0] + (g1[0] - g0[0]) * f, 0, g0[1] + (g1[1] - g0[1]) * f); ghost.g.rotation.y = g0[2] + wrap(g1[2] - g0[2]) * f; } else ghost.g.visible = false;
        }
        var humans = karts.filter(function (k) { return k.active && isHuman(k); }), allDone = humans.every(function (k) { return k.finished; });
        if (allDone && state === 'race') { state = 'done'; doneT = 1.6; big.hidden = false; big.textContent = 'FINISH'; sfx('go'); }
        if (state === 'done' && doneT > 0) { doneT -= dt; if (doneT <= 0) { big.hidden = true; results(); } }
      }
    }
    netFrame(dt, now);
    karts.forEach(function (k) { if (k.active) place(k); });
    updParticles(dt);
    if (SHADOWS && views[0]) { var fk = views[0].kart, sx = Math.round(fk.x / 2) * 2, sz = Math.round(fk.z / 2) * 2; sun.position.set(sx - 90, 130, sz + 60); sun.target.position.set(sx, 0, sz); sun.target.updateMatrixWorld(); }
    // cameras
    if (state === 'attract') {
      var lead = standings()[0] || karts[0], v = views[0]; camClock -= dt; if (camClock <= 0) { camClock = 7; camMode = (camMode + 1) % 3; v.camSpot = null; }
      v.kart = lead;
      if (camMode === 0) { var j = (lead.idx + 45) % N; if (!v.camSpot) v.camSpot = new THREE.Vector3(TR.P[j].x + TR.NR[j].x * 17, 7, TR.P[j].z + TR.NR[j].z * 17); v.cam.position.copy(v.camSpot); v.cam.lookAt(lead.x, 1, lead.z); v.cam.fov = 38; }
      else if (camMode === 1) { tmp.set(lead.x - Math.sin(lead.h) * 13, 6.5, lead.z - Math.cos(lead.h) * 13); v.camPos.lerp(tmp, 1 - Math.exp(-4 * dt)); v.cam.position.copy(v.camPos); v.cam.lookAt(lead.x, 1, lead.z); v.cam.fov = 62; }
      else { v.cam.position.set(lead.x + Math.sin(t * 0.2) * 40, 34, lead.z + Math.cos(t * 0.2) * 40); v.cam.lookAt(lead.x, 0, lead.z); v.cam.fov = 50; }
      v.cam.updateProjectionMatrix();
    } else {
      views.forEach(function (v) {
        var k = v.kart, sp = Math.hypot(k.vx, k.vz), fx = Math.sin(k.h), fz = Math.cos(k.h);
        // the camera swings round behind the kart on its own heading, so it never lags sideways
        var sr = sp / BOOSTV, dist = 8 + sr * 2.8;
        v.yaw += wrap(k.h - v.yaw) * (1 - Math.exp(-5.5 * dt));
        tmp.set(k.x - Math.sin(v.yaw) * dist, 3.9 + sr * 0.7, k.z - Math.cos(v.yaw) * dist); v.camPos.lerp(tmp, 1 - Math.exp(-16 * dt));
        look.set(k.x + fx * 5, 1.4, k.z + fz * 5); v.look.lerp(look, 1 - Math.exp(-14 * dt));
        v.cam.position.copy(v.camPos);
        var shake = (k.boost > 0 ? 0.035 : 0) + (k.rumble || 0) * 0.04; if (shake) { v.cam.position.x += (Math.random() - 0.5) * shake; v.cam.position.y += (Math.random() - 0.5) * shake; }
        v.cam.lookAt(v.look); v.cam.rotateZ(-k.steer * 0.03 * Math.min(1, sp / 30));
        var fov = 62 + (sp / BOOSTV) * 16 + (k.boost > 0 ? 6 : 0); v.cam.fov += (fov - v.cam.fov) * Math.min(1, 5 * dt); v.cam.updateProjectionMatrix();
        updHud(v, dt);
      });
      drawMap();
    }
    // engine + tyres
    if (AU.ctx && AU.engG) {
      var k0 = views[0].kart, sp0 = Math.hypot(k0.vx, k0.vz), on = AU.sound && full && (state === 'race' || state === 'count' || (state === 'done' && doneT > 0)), ct = AU.ctx.currentTime, f0 = 48 + sp0 * 3.4 + (k0.boost > 0 ? 34 : 0);
      AU.master.gain.setTargetAtTime(AU.sound ? 1 : 0, ct, 0.05);
      AU.engG.gain.setTargetAtTime(on ? 0.05 : 0, ct, 0.06); AU.eng[0].frequency.setTargetAtTime(f0, ct, 0.05); AU.eng[1].frequency.setTargetAtTime(f0 / 2, ct, 0.05); AU.eng[2].frequency.setTargetAtTime(350 + sp0 * 14, ct, 0.08);
      AU.skidG.gain.setTargetAtTime(on && k0.drifting ? 0.09 : 0, ct, 0.05);
    }
  }
  function render() {
    renderer.setScissorTest(views.length > 1);
    views.forEach(function (v) { var r = v.rect; renderer.setViewport(r[0], H - r[1] - r[3], r[2], r[3]); renderer.setScissor(r[0], H - r[1] - r[3], r[2], r[3]); renderer.render(scene, v.cam); });
  }
  var last = performance.now(), simT = last;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (full || visible) { update(dt, now); render(); showFrame(now / 1000); }
    requestAnimationFrame(frame);
  }

  // ---------- UI wiring ----------
  function on(id, fn) { var e = $(id); if (e) e.addEventListener('click', function (ev) { fn(ev); e.blur(); }); }
  on('mGP', function () { leaveNet(); startRace('gp'); });
  on('mTT', function () { leaveNet(); startRace('tt'); });
  on('mSplit', function () { leaveNet(); startRace('split'); });
  on('mOnline', function () { initAudio(); enterLobby(); });
  on('trk0', function () { trackSel = 0; attract(); refreshMenu(); });
  on('trk1', function () { trackSel = 1; attract(); refreshMenu(); });
  on('optSound', function () { AU.sound = !AU.sound; initAudio(); refreshMenu(); });
  on('optMusic', function () { AU.music = !AU.music; refreshMenu(); });
  on('mBack', function () { api.close(); });
  on('gQuit', function () { if (state === 'attract') api.close(); else toMenu(); });
  on('lobbyGo', function () { joinRace(1 + Math.floor(Math.random() * 1e9), trackSel); });
  on('lobbyBack', function () { leaveNet(); toMenu(); });
  on('resAgain', function () { if (M === 'online') { attract(); enterLobby(); } else startRace(M); });
  on('resMenu', function () { toMenu(); });
  on('playLive', function () { if (api.onPlay) api.onPlay(); else api.open(); });
  CHARS.forEach(function (c, i) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = c.name; b.style.setProperty('--c', hex(c.color));
    b.addEventListener('click', function () { SAVE.ch = i; persist(); attractKeep(); refreshMenu(); b.blur(); }); $('chBtns').appendChild(b);
  });
  on('p2Char', function () { var c = p2Char(); do { c = (c + 1) % 6; } while (c === myChar()); SAVE.ch2 = c; persist(); refreshMenu(); });
  function attractKeep() { if (NET.st === 'lobby') pres({ ch: myChar() }); }
  // showroom: the chosen driver on a turntable inside the menu card
  var show3 = null;
  function showFrame(t) {
    if (!full || $('gCard').hidden || $('scrMenu').hidden) return;
    if (!show3) {
      var r = new THREE.WebGLRenderer({ canvas: $('charCv'), antialias: true, alpha: true }); r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.setSize(360, 300, false);
      var sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff0dc, 0xb0623a, 1.05)); var dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(3, 6, 5); sc.add(dl);
      var disc = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.12, 40), new THREE.MeshLambertMaterial({ color: CORAL })); disc.position.y = -0.06; sc.add(disc);
      var cam = new THREE.PerspectiveCamera(30, 360 / 300, 0.1, 60); cam.position.set(0, 3.0, 7.6); cam.lookAt(0, 1.55, 0);
      show3 = { r: r, sc: sc, cam: cam, k: makeKart(0xffffff, false, sc), turn: disc };
    }
    var c = myChar(), k = show3.k; setChar(k, c); k.paint.color.setHex(CHARS[c].color);
    k.g.rotation.y = t * 0.7 + 0.5; k.steer = Math.sin(t * 1.3) * 0.8; k.vx = 0; k.vz = 20 + 18 * Math.sin(t * 0.7); k.boost = (t % 6) > 5 ? 1 : 0; k.finished = false;
    k.fw[0].rotation.y = k.fw[1].rotation.y = k.steer * 0.4; animChar(k, t);
    show3.r.render(show3.sc, show3.cam);
  }
  var nick = $('nick'); if (nick) { nick.value = NET.nick; nick.addEventListener('input', function () { NET.nick = nick.value.replace(/[^\w \-]/g, '').slice(0, 12) || 'Racer'; if (NET.st === 'lobby') pres({ nick: NET.nick }); }); }
  addEventListener('resize', layout);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { });

  var api = {
    open: function () { full = true; stage.classList.add('full'); document.documentElement.classList.add('playing'); layout(); refreshMenu(); show('scrMenu'); },
    close: function () { leaveNet(); attract(); full = false; show(null); stage.classList.remove('full'); document.documentElement.classList.remove('playing'); layout(); },
    initAudio: initAudio, sfx: sfx, onPlay: null,
    debug: function () { return { state: state, mode: M, karts: karts, views: views, net: NET, start: startRace, track: function (i) { trackSel = i; }, chars: CHARS, showFrame: showFrame, tick: function (dt, n) { for (var i = 0; i < (n || 1); i++) { simT += dt * 1000; update(dt, simT); } render(); }, results: results }; }
  };
  attract(); show(null);
  requestAnimationFrame(frame);
  return api;
})();
