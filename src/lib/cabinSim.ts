// Live cabin: a 2D fire emulation in a module cross-section, ported from the
// team's earlier project "Umbral" (module cab.js). A stable-fluids solver moves
// air, heat, oxygen, fuel vapour, smoke and carbon monoxide through a cabin with
// racks, a ventilation inlet and return, a ceiling smoke detector and a crew
// member. A piece of material pyrolyses and burns where you place it.
//
// It is an emulation: pyrolysis, radiative loss and the ventilation speed are
// calibrated by hand in Umbral, not validated against a test. It illustrates
// behaviour; it predicts nothing.
// Code generated with SI assistance (Claude Code).

export interface CabinParams {
  o0: number; // oxygen fraction of the cabin air
  T0: number; // K
  P: number; // kPa
  g: number; // m/s^2
}

export interface CrewReading {
  t: number;
  o2: number; // % at the breathing zone
  co: number; // ppm
  T: number; // °C
  P: number; // kPa, cabin
  hrr: number; // kW
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class CabinSim {
  readonly nx = 120;
  readonly ny = 60;
  readonly dx = 4.2 / 120;
  readonly depth = 1.5;
  K: CabinParams;
  t = 0;
  fans = true;
  ext = -99; // time the extinguisher was last fired
  sx = 18;
  sy = 48;
  det: number | null = null;
  peak = 0;
  hrr = 0;
  ign = 0.6;
  hist: CrewReading[] = [];

  u!: Float32Array; v!: Float32Array; u0!: Float32Array; v0!: Float32Array; p!: Float32Array; dv!: Float32Array; e!: Float32Array;
  T!: Float32Array; T1!: Float32Array; o!: Float32Array; o1!: Float32Array; f!: Float32Array; f1!: Float32Array;
  s!: Float32Array; s1!: Float32Array; c!: Float32Array; c1!: Float32Array; b!: Float32Array; bud!: Float32Array; Ts!: Float32Array;
  sol!: Uint8Array;
  inl: number[] = [];
  out: number[] = [];
  srcs: number[] = [];

  constructor(params: CabinParams) {
    this.K = params;
    this.reset(params);
  }

  idx(i: number, j: number) {
    return i + j * this.nx;
  }

  reset(params?: CabinParams) {
    if (params) this.K = params;
    const { nx, ny } = this;
    const N = nx * ny;
    const K = this.K;
    this.u = new Float32Array(N); this.v = new Float32Array(N); this.u0 = new Float32Array(N); this.v0 = new Float32Array(N);
    this.p = new Float32Array(N); this.dv = new Float32Array(N); this.e = new Float32Array(N);
    this.T = new Float32Array(N); this.T1 = new Float32Array(N); this.o = new Float32Array(N); this.o1 = new Float32Array(N);
    this.f = new Float32Array(N); this.f1 = new Float32Array(N); this.s = new Float32Array(N); this.s1 = new Float32Array(N);
    this.c = new Float32Array(N); this.c1 = new Float32Array(N); this.b = new Float32Array(N); this.bud = new Float32Array(N); this.Ts = new Float32Array(N);
    this.sol = new Uint8Array(N);
    this.inl = []; this.out = []; this.srcs = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = this.idx(i, j);
      const edge = i === 0 || j === 0 || i === nx - 1 || j === ny - 1;
      const cx = i < 8 ? 8 - i : i > nx - 9 ? i - (nx - 9) : 0;
      const cy = j < 8 ? 8 - j : j > ny - 9 ? j - (ny - 9) : 0;
      const corner = cx > 0 && cy > 0 && cx * cx + cy * cy > 64;
      const rackF = i >= 6 && i <= 30 && j >= 49; // cargo bags on the floor
      const rackC = i >= 64 && i <= 100 && j <= 7; // avionics on the ceiling
      const rackW = i >= nx - 9 && j >= 14 && j <= 40; // rack on the far wall
      this.sol[k] = edge || corner || rackF || rackC || rackW ? 1 : 0;
      this.T[k] = K.T0; this.o[k] = K.o0; this.f[k] = 0;
    }
    for (let j = 6; j <= 46; j++) this.inl.push(this.idx(1, j));
    for (let j = 42; j <= 52; j++) this.out.push(this.idx(nx - 2, j));
    for (let i2 = this.sx - 6; i2 <= this.sx + 6; i2++) {
      const kk = this.idx(i2, this.sy);
      if (!this.sol[kk] && this.sol[this.idx(i2, this.sy + 1)]) { this.srcs.push(kk); this.bud[kk] = 10; this.Ts[kk] = K.T0; }
    }
    this.t = 0; this.det = null; this.peak = 0; this.hrr = 0; this.ext = -99; this.ign = 0.6; this.hist = [];
  }

  private bil(a: Float32Array, x: number, y: number) {
    const { nx, ny } = this;
    x = Math.max(0.5, Math.min(nx - 1.5, x)); y = Math.max(0.5, Math.min(ny - 1.5, y));
    const i = x | 0, j = y | 0, fx = x - i, fy = y - j, k = i + j * nx;
    return (a[k] * (1 - fx) + a[k + 1] * fx) * (1 - fy) + (a[k + nx] * (1 - fx) + a[k + nx + 1] * fx) * fy;
  }

  private adv(dst: Float32Array, src: Float32Array, dt: number) {
    const { nx, ny, u, v, sol } = this;
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const k = i + j * nx;
      if (sol[k]) { dst[k] = src[k]; continue; }
      dst[k] = this.bil(src, i - u[k] * dt, j - v[k] * dt);
    }
  }

  private diff(a: Float32Array, tmp: Float32Array, D: number) {
    const { nx, ny, sol } = this;
    tmp.set(a);
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const k = i + j * nx;
      if (sol[k]) continue;
      const c = tmp[k];
      let s = 0, n = 0;
      if (!sol[k - 1]) { s += tmp[k - 1]; n++; }
      if (!sol[k + 1]) { s += tmp[k + 1]; n++; }
      if (!sol[k - nx]) { s += tmp[k - nx]; n++; }
      if (!sol[k + nx]) { s += tmp[k + nx]; n++; }
      a[k] = c + D * (s - n * c);
    }
  }

  step(dt: number) {
    const { nx, ny, K, u, v, T, o, f, s, c, e, sol, b } = this;
    const N = nx * ny;
    const gEff = (K.g / this.dx) * 0.06, HK = 11000, HFB = 900, Tign = 800, kr = 30, nu = 1;
    const D = Math.min(0.2, 1.5 * (101.3 / K.P) * dt);
    const cal = { Tl: 1500, Tr: 1500 }; // burning material: fixed limit temperature (assumed in Umbral)
    let i: number, j: number, k: number;
    e.fill(0);
    // vents
    const qv = this.fans ? 0.15 / this.dx : 0;
    if (this.fans) {
      for (const q of this.inl) { u[q] = qv; v[q] = 0; T[q] = K.T0; o[q] = K.o0; f[q] = 0; s[q] *= 0.3; c[q] *= 0.3; }
      for (const q of this.out) { s[q] *= 0.9; c[q] *= 0.9; f[q] *= 0.9; e[q] -= (qv * this.inl.length) / this.out.length; }
      for (const q of this.inl) e[q] += qv;
    }
    // buoyancy
    if (gEff > 0) for (k = 0; k < N; k++) { if (!sol[k]) v[k] -= ((gEff * (T[k] - K.T0)) / K.T0) * dt; }
    // igniter and source
    if (this.ign > 0) {
      this.ign -= dt;
      for (j = -2; j <= 2; j++) for (i = -2; i <= 2; i++) { k = this.idx(this.sx + i, this.sy + j); if (!sol[k]) T[k] = Math.max(T[k], 1500); }
    }
    for (const sk of this.srcs) {
      const gk = sk - nx, ii = sk % nx;
      let fl = 0;
      for (let dj = 1; dj <= 5; dj++) for (let di = -4; di <= 4; di++) { const q = gk - (dj - 1) * nx + di; if (q > 0) fl += b[q] / (1 + di * di + dj * dj * 0.5); }
      const Ts = this.Ts, hot = Math.max(T[gk] - Ts[sk], 0) * 0.6;
      Ts[sk] += (fl * HFB + hot - (Ts[sk] - K.T0) * 1.2 - 2.5e-11 * (Math.pow(Ts[sk], 4) - Math.pow(K.T0, 4))) * dt;
      if (this.ign > 0 && Math.abs(ii - this.sx) <= 2) Ts[sk] = Math.max(Ts[sk], 750);
      const r = this.bud[sk] > 0 ? 0.9 * Math.max(0, Math.min(1.5, (Ts[sk] - 620) / 300)) : 0;
      f[gk] += r * dt; this.bud[sk] -= r * dt * 0.12;
    }
    // combustion
    let hrr = 0;
    const Pn = K.P * 1000;
    for (k = 0; k < N; k++) {
      b[k] = b[k] > 1e-5 ? b[k] * 0.6 : 0;
      if (f[k] < 1e-7) f[k] = 0; if (s[k] < 1e-6) s[k] = 0; if (c[k] < 1e-9) c[k] = 0;
      if (sol[k] || f[k] < 1e-4 || o[k] < 0.004 || T[k] < Tign) continue;
      const pot = T[k] + Math.min(f[k] * nu, o[k]) * HK * 0.85, lim = f[k] * nu < o[k] ? cal.Tl : cal.Tr;
      if (pot < lim) continue;
      const burn = Math.min(f[k], o[k] / nu) * Math.min(1, kr * dt * Math.min(1, (T[k] - Tign) / 400)), dO = burn * nu;
      f[k] -= burn; o[k] -= dO; T[k] = Math.min(3300, T[k] + dO * HK); s[k] += burn * 1.6; c[k] += dO * (o[k] < 0.15 ? 0.12 : 0.02);
      b[k] += dO / dt; e[k] += (0.35 * dO * HK) / T[k] / dt;
      hrr += (((dO * Pn * this.dx * this.dx * this.depth) / (8.314 * T[k])) * 420) / dt;
    }
    this.hrr = hrr; this.peak = Math.max(this.peak, hrr);
    // extinguisher: CO2 cloud around the source
    if (this.t - this.ext < 2.5) {
      for (j = -9; j <= 9; j++) for (i = -9; i <= 9; i++) {
        if (i * i + j * j > 81) continue;
        k = this.idx(clamp(this.sx + i, 1, nx - 2), clamp(this.sy + j, 1, ny - 2));
        if (sol[k]) continue;
        o[k] *= 0.8; T[k] += (K.T0 - T[k]) * 0.25; f[k] *= 0.9;
      }
      for (const sk of this.srcs) this.bud[sk] *= 0.97;
    }
    // sealed cabin: expansion spreads as a uniform pressure rise
    let sum = 0, n = 0;
    for (k = 0; k < N; k++) { if (!sol[k]) { sum += e[k]; n++; } }
    const mean = sum / n;
    for (k = 0; k < N; k++) if (!sol[k]) e[k] -= mean;
    // advect velocity, project
    this.u0.set(u); this.v0.set(v); this.adv(u, this.u0, dt); this.adv(v, this.v0, dt);
    for (k = 0; k < N; k++) {
      if (sol[k]) { u[k] = 0; v[k] = 0; } else { u[k] = Math.abs(u[k]) > 1e-4 ? u[k] * 0.995 : 0; v[k] = Math.abs(v[k]) > 1e-4 ? v[k] * 0.995 : 0; }
    }
    if (this.fans) for (const q of this.inl) u[q] = qv;
    const dv = this.dv, p = this.p;
    for (j = 1; j < ny - 1; j++) for (i = 1; i < nx - 1; i++) {
      k = i + j * nx;
      if (sol[k]) { dv[k] = 0; continue; }
      dv[k] = 0.5 * ((sol[k + 1] ? 0 : u[k + 1]) - (sol[k - 1] ? 0 : u[k - 1]) + (sol[k + nx] ? 0 : v[k + nx]) - (sol[k - nx] ? 0 : v[k - nx])) - e[k];
    }
    for (let it = 0; it < 24; it++) for (j = 1; j < ny - 1; j++) for (i = 1; i < nx - 1; i++) {
      k = i + j * nx;
      if (sol[k]) continue;
      const pc = p[k];
      p[k] = ((sol[k - 1] ? pc : p[k - 1]) + (sol[k + 1] ? pc : p[k + 1]) + (sol[k - nx] ? pc : p[k - nx]) + (sol[k + nx] ? pc : p[k + nx]) - dv[k]) / 4;
    }
    for (j = 1; j < ny - 1; j++) for (i = 1; i < nx - 1; i++) {
      k = i + j * nx;
      if (sol[k]) continue;
      const pk = p[k];
      u[k] -= 0.5 * ((sol[k + 1] ? pk : p[k + 1]) - (sol[k - 1] ? pk : p[k - 1]));
      v[k] -= 0.5 * ((sol[k + nx] ? pk : p[k + nx]) - (sol[k - nx] ? pk : p[k - nx]));
    }
    // advect and diffuse scalars
    this.T1.set(T); this.adv(T, this.T1, dt); this.o1.set(o); this.adv(o, this.o1, dt); this.f1.set(f); this.adv(f, this.f1, dt);
    this.s1.set(s); this.adv(s, this.s1, dt); this.c1.set(c); this.adv(c, this.c1, dt);
    this.diff(T, this.T1, D); this.diff(o, this.o1, D); this.diff(f, this.f1, D); this.diff(s, this.s1, D * 0.4); this.diff(c, this.c1, D);
    for (k = 0; k < N; k++) {
      if (!sol[k]) { const tq = T[k] / 1000, t0q = K.T0 / 1000; T[k] -= ((T[k] - K.T0) * 0.08 + 70 * (tq * tq * tq * tq - t0q * t0q * t0q * t0q)) * dt; }
    }
    this.t += dt;
    const dk = this.idx(60, 9), ok = this.out[3];
    if (this.det == null && (s[dk] > 0.02 || s[ok] > 0.02)) this.det = this.t;
    if (Math.round(this.t / dt) % 15 === 0) { this.hist.push(this.crew()); if (this.hist.length > 200) this.hist.shift(); }
  }

  /** Conditions at the crew member's breathing zone. */
  crew(): CrewReading {
    const k = this.idx(82, 22);
    let tm = 0, n = 0;
    for (let k2 = 0; k2 < this.nx * this.ny; k2++) { if (!this.sol[k2]) { tm += this.T[k2]; n++; } }
    return { t: this.t, o2: 100 * this.o[k], co: 1e6 * this.c[k], T: this.T[k] - 273.15, P: (this.K.P * (tm / n)) / this.K.T0, hrr: this.hrr };
  }

  /** Move the burning material to the surface under grid cell (i, j). Returns false if there is no surface there. */
  place(i: number, j: number): boolean {
    const { nx, ny } = this;
    if (i < 2 || j < 2 || i > nx - 3 || j > ny - 3) return false;
    let jj = j;
    while (jj < ny - 2 && !this.sol[this.idx(i, jj + 1)]) jj++;
    const sx = clamp(i, 8, nx - 10);
    let ok = false;
    for (let k = sx - 6; k <= sx + 6; k++) if (this.sol[this.idx(k, jj + 1)]) ok = true;
    if (!ok) return false;
    this.sx = sx; this.sy = jj;
    this.reset();
    return true;
  }

  fireExtinguisher() {
    this.ext = this.t;
  }
}
