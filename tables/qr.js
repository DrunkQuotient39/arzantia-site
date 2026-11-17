/* Arcane - a QR code for an invite link (M34). The same encoder the table uses (app.js qrMatrix):
   byte mode, error correction L, versions 1-9 - real, scannable, no library. Built as SVG nodes,
   never as markup, so the site's Content-Security-Policy and its "text, never HTML" rule both hold. */
(() => {
  'use strict';
  function qrMatrix(text) {
    const bytes = [...new TextEncoder().encode(text)];
    // [ec codewords per block, blocks, data codewords per block] for ECC-L
    const SPEC = { 1: [7, 1, 19], 2: [10, 1, 34], 3: [15, 1, 55], 4: [20, 1, 80], 5: [26, 1, 108], 6: [18, 2, 68], 7: [20, 2, 78], 8: [24, 2, 97], 9: [30, 2, 116] };
    const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46] };
    let ver = 0;
    for (let v = 1; v <= 9; v++) { const [, nb, dc] = SPEC[v]; if (nb * dc - 2 >= bytes.length) { ver = v; break; } }
    if (!ver) throw new Error("QR payload too long");
    const [ecLen, nBlocks, dcPerBlock] = SPEC[ver];
    const totalData = nBlocks * dcPerBlock;
  
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
    put(0b0100, 4); put(bytes.length, 8);
    for (const b of bytes) put(b, 8);
    for (let i = 0; i < 4 && bits.length < totalData * 8; i++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    const PAD = [0xEC, 0x11];
    for (let i = 0; data.length < totalData; i++) data.push(PAD[i % 2]);
  
    // GF(256) Reed–Solomon
    const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
    for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
    let gp = [1];
    for (let i = 0; i < ecLen; i++) {
      const ng = new Array(gp.length + 1).fill(0);
      for (let j = 0; j < gp.length; j++) { ng[j] ^= gp[j]; ng[j + 1] ^= mul(gp[j], EXP[i]); }
      gp = ng;
    }
    const ecOf = (block) => {
      const rem = new Array(ecLen).fill(0);
      for (const b of block) {
        const f = b ^ rem[0];
        rem.shift(); rem.push(0);
        if (f) for (let j = 0; j < ecLen; j++) rem[j] ^= mul(gp[j + 1], f);
      }
      return rem;
    };
    const dBlocks = [], eBlocks = [];
    for (let i = 0; i < nBlocks; i++) { const blk = data.slice(i * dcPerBlock, (i + 1) * dcPerBlock); dBlocks.push(blk); eBlocks.push(ecOf(blk)); }
    const final = [];
    for (let i = 0; i < dcPerBlock; i++) for (const b of dBlocks) final.push(b[i]);
    for (let i = 0; i < ecLen; i++) for (const b of eBlocks) final.push(b[i]);
  
    // function patterns
    const N = 17 + ver * 4;
    const mx = Array.from({ length: N }, () => new Array(N).fill(null));
    const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < N && y < N) mx[y][x] = v; };
    const finder = (ox, oy) => {
      for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
        const on = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
        set(ox + x, oy + y, on ? 1 : 0);
      }
    };
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
    for (let i = 8; i < N - 8; i++) { mx[6][i] = i % 2 === 0 ? 1 : 0; mx[i][6] = i % 2 === 0 ? 1 : 0; }
    for (const cy of ALIGN[ver]) for (const cx of ALIGN[ver]) {
      if ((cx <= 8 && cy <= 8) || (cx >= N - 9 && cy <= 8) || (cx <= 8 && cy >= N - 9)) continue;
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) set(cx + x, cy + y, Math.max(Math.abs(x), Math.abs(y)) !== 1 ? 1 : 0);
    }
    mx[N - 8][8] = 1;
    for (let i = 0; i < 9; i++) { if (mx[8][i] === null) mx[8][i] = 2; if (mx[i][8] === null) mx[i][8] = 2; }
    for (let i = 0; i < 8; i++) { if (mx[8][N - 1 - i] === null) mx[8][N - 1 - i] = 2; if (mx[N - 1 - i][8] === null) mx[N - 1 - i][8] = 2; }
    if (ver >= 7) {
      let d = ver << 12;
      for (let i = 0; i < 6; i++) if (d & (1 << (17 - i))) d ^= 0x1F25 << (5 - i);
      const vi = (ver << 12) | (d & 0xFFF);
      for (let i = 0; i < 18; i++) {
        const bit = (vi >> i) & 1, r = Math.floor(i / 3), c = i % 3;
        mx[r][N - 11 + c] = bit; mx[N - 11 + c][r] = bit;
      }
    }
  
    // data placement, zigzag from the bottom-right
    let bi = 0;
    const nextBit = () => {
      const idx = bi >> 3;
      const v = idx < final.length ? (final[idx] >> (7 - (bi & 7))) & 1 : 0;
      bi++; return v;
    };
    let up = true;
    for (let col = N - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (let n = 0; n < N; n++) {
        const y = up ? N - 1 - n : n;
        for (const x of [col, col - 1]) if (mx[y][x] === null) mx[y][x] = nextBit() ? 3 : 4;
      }
      up = !up;
    }
  
    const MASK = [
      (r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
      (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
      (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
    ];
    const render = (mask) => {
      const g = Array.from({ length: N }, () => new Array(N).fill(false));
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = mx[y][x];
        if (v === 3 || v === 4) { const bit = v === 3; g[y][x] = MASK[mask](y, x) ? !bit : bit; }
        else g[y][x] = v === 1;
      }
      const fb = (0b01 << 3) | mask;                 // ECC level L
      let d = fb << 10;
      for (let i = 0; i < 5; i++) if (d & (1 << (14 - i))) d ^= 0x537 << (4 - i);
      const fmt = ((fb << 10) | (d & 0x3FF)) ^ 0x5412;
      for (let i = 0; i < 15; i++) {
        const bit = ((fmt >> i) & 1) === 1;
        if (i < 6) g[i][8] = bit; else if (i < 8) g[i + 1][8] = bit; else g[N - 15 + i][8] = bit;
        if (i < 8) g[8][N - 1 - i] = bit; else if (i < 9) g[8][15 - i] = bit; else g[8][14 - i] = bit;
      }
      g[N - 8][8] = true;
      return g;
    };
    const penalty = (g) => {
      let p = 0;
      for (let i = 0; i < N; i++) for (const row of [true, false]) {
        let run = 1;
        for (let j = 1; j < N; j++) {
          const a = row ? g[i][j] : g[j][i], b = row ? g[i][j - 1] : g[j - 1][i];
          if (a === b) run++; else { if (run >= 5) p += run - 2; run = 1; }
        }
        if (run >= 5) p += run - 2;
      }
      for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++) {
        const v = g[y][x];
        if (v === g[y][x + 1] && v === g[y + 1][x] && v === g[y + 1][x + 1]) p += 3;
      }
      const P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
      for (let y = 0; y < N; y++) for (let x = 0; x <= N - 11; x++) {
        let h1 = true, h2 = true, v1 = true, v2 = true;
        for (let k = 0; k < 11; k++) {
          const h = g[y][x + k] ? 1 : 0, v = g[x + k][y] ? 1 : 0;
          if (h !== P1[k]) h1 = false;
          if (h !== P2[k]) h2 = false;
          if (v !== P1[k]) v1 = false;
          if (v !== P2[k]) v2 = false;
        }
        p += (h1 ? 40 : 0) + (h2 ? 40 : 0) + (v1 ? 40 : 0) + (v2 ? 40 : 0);
      }
      let dark = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x]) dark++;
      p += Math.floor(Math.abs((dark * 100) / (N * N) - 50) / 5) * 10;
      return p;
    };
    let best = null, bestP = Infinity;
    for (let mask = 0; mask < 8; mask++) { const g = render(mask), p = penalty(g); if (p < bestP) { bestP = p; best = g; } }
    return best;
  }

  /* an <svg> of the code for `text`, or null when it is too long for version 9 */
  function qrNode(text, label) {
    let g;
    try { g = qrMatrix(text); } catch (e) { return null; }
    const NS = 'http://www.w3.org/2000/svg', N = g.length, quiet = 4, sz = N + quiet * 2;
    let d = '';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x]) d += 'M' + (x + quiet) + ' ' + (y + quiet) + 'h1v1h-1z';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + sz + ' ' + sz);
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label || 'QR code');
    svg.setAttribute('class', 'qr');
    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('width', sz); bg.setAttribute('height', sz); bg.setAttribute('fill', '#F2ECE0');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', '#14100C');
    svg.append(bg, p);
    return svg;
  }
  window.ArcaneQR = { node: qrNode, matrix: qrMatrix };
})();
