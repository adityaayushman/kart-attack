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
    k.chr = CHARS[ci].build(); k.chi = ci; k.seat.add(k.chr.g);
  }
  function animChar(k, t) {
    if (!k.chr) return;
    var sp = Math.min(1, Math.hypot(k.vx || 0, k.vz || 0) / 40), g = k.chr.g;
    k.chr.anim(t, k, sp);
    g.position.y = Math.abs(Math.sin(t * 19)) * 0.025 * sp + (k.finished ? Math.abs(Math.sin(t * 7)) * 0.3 : 0);
    g.rotation.z = -(k.steer || 0) * 0.22; g.rotation.x = k.boost > 0 ? -0.28 : 0;
  }
