// Baseline line drawings of the six crewed environments named in the challenge.
// Original schematic artwork drawn in SVG for this project (not NASA imagery).
// Code and drawings generated with SI assistance (Claude Code).

import type { ReactNode } from "react";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.15, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, pathLength: 1 };
const THIN = { ...S, strokeWidth: 0.6, opacity: 0.55 };
const DASH = { ...THIN, strokeDasharray: "0.012 0.012" };

function Note({ x, y, x2, y2, text, anchor = "start" }: { x: number; y: number; x2: number; y2: number; text: string; anchor?: "start" | "end" }) {
  return (
    <g className="note">
      <line x1={x} y1={y} x2={x2} y2={y2} stroke="currentColor" strokeWidth={0.5} opacity={0.5} />
      <circle cx={x} cy={y} r={1.6} fill="currentColor" opacity={0.8} />
      <text x={x2 + (anchor === "start" ? 4 : -4)} y={y2 + 3} textAnchor={anchor} fontSize={7.5} letterSpacing={0.8} fill="currentColor" opacity={0.75} fontFamily="var(--font-geist-mono), monospace">
        {text}
      </text>
    </g>
  );
}

function Suit() {
  return (
    <>
      {/* helmet and visor */}
      <circle className="ink" cx={160} cy={46} r={22} {...S} />
      <path className="ink" d="M144 42 a16 13 0 0 1 32 0 v8 a16 10 0 0 1 -32 0 z" {...S} />
      <path className="ink" d="M141 64 h38" {...S} />
      {/* torso */}
      <path className="ink" d="M132 70 h56 l8 14 v52 l-10 8 h-52 l-10 -8 v-52 z" {...S} />
      {/* life support backpack */}
      <path className="ink" d="M196 76 h16 v62 h-16" {...THIN} />
      <path className="ink" d="M124 76 h-14 v62 h14" {...THIN} />
      {/* chest control unit */}
      <rect className="ink" x={146} y={92} width={28} height={18} {...S} />
      <path className="ink" d="M150 98 h8 M150 104 h14 M166 98 h4" {...THIN} />
      {/* arms */}
      <path className="ink" d="M132 74 l-24 26 l-8 40 l12 4 l10 -34 l12 -12" {...S} />
      <path className="ink" d="M188 74 l24 26 l8 40 l-12 4 l-10 -34 l-12 -12" {...S} />
      <path className="ink" d="M100 140 l-2 12 h14 l0 -8 M220 140 l2 12 h-14 l0 -8" {...S} />
      {/* legs and boots */}
      <path className="ink" d="M136 144 l-6 50 h20 l6 -40 l4 0 l6 40 h20 l-6 -50" {...S} />
      <path className="ink" d="M128 194 h24 v8 h-28 z M168 194 h24 l4 8 h-28 z" {...S} />
      <path className="ink" d="M160 20 v190" {...DASH} />
      <Note x={176} y={40} x2={236} y2={28} text="VISOR" />
      <Note x={206} y={100} x2={246} y2={92} text="LIFE SUPPORT" />
      <Note x={148} y={100} x2={78} y2={84} text="CONTROL UNIT" anchor="end" />
      <Note x={140} y={170} x2={76} y2={176} text="PRESSURE GARMENT" anchor="end" />
    </>
  );
}

function Capsule() {
  return (
    <>
      {/* docking ring */}
      <path className="ink" d="M146 30 h28 v10 h-28 z" {...S} />
      {/* crew module */}
      <path className="ink" d="M146 40 l-52 76 h132 l-52 -76" {...S} />
      {/* heat shield */}
      <path className="ink" d="M94 116 q66 22 132 0" {...S} />
      {/* hatch and windows */}
      <rect className="ink" x={150} y={66} width={20} height={26} rx={4} {...S} />
      <path className="ink" d="M124 84 l8 -12 h8 l-4 12 z M196 84 l-8 -12 h-8 l4 12 z" {...S} />
      <path className="ink" d="M110 104 h100" {...THIN} />
      {/* service module */}
      <path className="ink" d="M104 126 h112 v44 h-112 z" {...S} />
      <path className="ink" d="M104 140 h112 M104 156 h112" {...THIN} />
      <path className="ink" d="M146 170 l-10 22 h48 l-10 -22" {...S} />
      {/* solar wings */}
      <path className="ink" d="M104 146 h-64 v-12 h64 M216 146 h64 v-12 h-64" {...S} />
      <path className="ink" d="M88 134 v12 M72 134 v12 M56 134 v12 M232 134 v12 M248 134 v12 M264 134 v12" {...THIN} />
      <path className="ink" d="M160 20 v180" {...DASH} />
      <Note x={160} y={35} x2={226} y2={24} text="DOCKING RING" />
      <Note x={160} y={80} x2={246} y2={62} text="CREW CABIN" />
      <Note x={130} y={124} x2={62} y2={112} text="HEAT SHIELD" anchor="end" />
      <Note x={196} y={162} x2={250} y2={184} text="SERVICE MODULE" />
    </>
  );
}

function Spacecraft() {
  return (
    <>
      {/* habitat module */}
      <path className="ink" d="M96 84 h92 a14 26 0 0 1 0 52 h-92 a14 26 0 0 1 0 -52 z" {...S} />
      <path className="ink" d="M96 84 a14 26 0 0 1 0 52 M132 84 v52 M160 84 v52" {...THIN} />
      <circle className="ink" cx={114} cy={110} r={5} {...S} />
      <circle className="ink" cx={146} cy={110} r={5} {...S} />
      <circle className="ink" cx={174} cy={110} r={5} {...S} />
      {/* node and docked capsule */}
      <rect className="ink" x={202} y={98} width={20} height={24} {...S} />
      <path className="ink" d="M222 102 l30 -10 v36 l-30 -10" {...S} />
      <path className="ink" d="M252 92 q12 18 0 36" {...S} />
      {/* propulsion stage */}
      <rect className="ink" x={48} y={94} width={34} height={32} {...S} />
      <path className="ink" d="M48 100 l-22 -12 v44 l22 -12" {...S} />
      <path className="ink" d="M82 104 h14 M82 116 h14" {...THIN} />
      {/* solar arrays */}
      <path className="ink" d="M140 84 v-22 M108 62 h64 v-34 h-64 z M140 136 v22 M108 158 h64 v34 h-64 z" {...S} />
      <path className="ink" d="M124 28 v34 M140 28 v34 M156 28 v34 M108 45 h64 M124 158 v34 M140 158 v34 M156 158 v34 M108 175 h64" {...THIN} />
      <path className="ink" d="M16 110 h290" {...DASH} />
      <Note x={146} y={98} x2={212} y2={70} text="HABITAT" />
      <Note x={240} y={110} x2={268} y2={150} text="DOCKED CAPSULE" />
      <Note x={36} y={110} x2={34} y2={64} text="PROPULSION" />
      <Note x={172} y={175} x2={226} y2={186} text="SOLAR ARRAY" />
    </>
  );
}

function Station() {
  return (
    <>
      {/* main truss */}
      <path className="ink" d="M20 106 h280 M20 114 h280" {...S} />
      <path className="ink" d="M40 106 l10 8 l10 -8 l10 8 l10 -8 l10 8 M220 106 l10 8 l10 -8 l10 8 l10 -8 l10 8" {...THIN} />
      {/* solar arrays */}
      {[28, 62, 232, 266].map((x) => (
        <g key={x}>
          <path className="ink" d={`M${x} 106 v-66 h26 v66 M${x} 114 v66 h26 v-66`} {...S} />
          <path className="ink" d={`M${x + 13} 40 v66 M${x + 13} 114 v66 M${x} 62 h26 M${x} 84 h26 M${x} 136 h26 M${x} 158 h26`} {...THIN} />
        </g>
      ))}
      {/* pressurized modules along the vertical axis */}
      <rect className="ink" x={146} y={52} width={28} height={50} rx={6} {...S} />
      <rect className="ink" x={146} y={118} width={28} height={56} rx={6} {...S} />
      <rect className="ink" x={110} y={128} width={36} height={22} rx={6} {...S} />
      <rect className="ink" x={174} y={128} width={36} height={22} rx={6} {...S} />
      <circle className="ink" cx={160} cy={110} r={11} {...S} />
      <path className="ink" d="M152 174 l-4 16 h24 l-4 -16" {...S} />
      {/* radiators */}
      <path className="ink" d="M118 106 v-30 h14 v30 M188 106 v-30 h14 v30" {...THIN} />
      <path className="ink" d="M160 30 v170" {...DASH} />
      <Note x={160} y={70} x2={206} y2={36} text="LAB MODULE" />
      <Note x={194} y={139} x2={218} y2={176} text="HABITAT" />
      <Note x={160} y={186} x2={110} y2={196} text="DOCKED VEHICLE" anchor="end" />
      <Note x={125} y={86} x2={104} y2={30} text="RADIATOR" anchor="end" />
    </>
  );
}

function Base() {
  return (
    <>
      {/* ground */}
      <path className="ink" d="M10 172 h300" {...S} />
      <path className="ink" d="M20 180 h24 M60 184 h40 M130 180 h18 M176 186 h44 M250 180 h36" {...THIN} />
      {/* habitat dome under regolith cover */}
      <path className="ink" d="M82 172 a62 58 0 0 1 124 0" {...S} />
      <path className="ink" d="M70 172 a74 70 0 0 1 148 0" {...DASH} />
      <path className="ink" d="M104 172 v-34 h80 v34 M144 138 v34 M104 152 h80" {...THIN} />
      <path className="ink" d="M144 114 v24" {...THIN} />
      {/* airlock and tunnel */}
      <path className="ink" d="M206 150 h26 v22 h-26" {...S} />
      <rect className="ink" x={232} y={144} width={22} height={28} {...S} />
      <path className="ink" d="M238 172 v-18 h10 v18" {...S} />
      {/* solar field and antenna */}
      <path className="ink" d="M24 172 v-18 M12 154 l24 -10 v10 l-24 10 z" {...S} />
      <path className="ink" d="M278 172 v-40 M278 132 l-12 -10 M278 132 l12 -10 M266 122 q12 -12 24 0" {...S} />
      {/* horizon body */}
      <circle className="ink" cx={262} cy={46} r={16} {...THIN} />
      <path className="ink" d="M250 40 q12 8 24 2" {...THIN} />
      <Note x={144} y={124} x2={176} y2={74} text="PRESSURIZED HABITAT" />
      <Note x={82} y={126} x2={40} y2={96} text="REGOLITH COVER" anchor="end" />
      <Note x={243} y={150} x2={246} y2={100} text="AIRLOCK" />
      <Note x={24} y={150} x2={46} y2={124} text="POWER" />
    </>
  );
}

function Rover() {
  return (
    <>
      <path className="ink" d="M10 178 h300" {...S} />
      {/* cabin */}
      <path className="ink" d="M70 144 v-46 q0 -18 18 -18 h112 q26 0 40 30 l8 34 z" {...S} />
      {/* windshield */}
      <path className="ink" d="M196 88 q22 2 34 26 h-34 z" {...S} />
      <rect className="ink" x={112} y={92} width={30} height={22} rx={3} {...S} />
      <rect className="ink" x={152} y={92} width={30} height={22} rx={3} {...S} />
      {/* suit ports at the rear */}
      <path className="ink" d="M70 98 h-16 v36 h16 M54 106 h-10 v20 h10" {...S} />
      <ellipse className="ink" cx={62} cy={116} rx={5} ry={9} {...THIN} />
      {/* chassis and wheels */}
      <path className="ink" d="M62 144 h192 v10 h-192 z" {...S} />
      {[88, 158, 228].map((x) => (
        <g key={x}>
          <circle className="ink" cx={x} cy={162} r={16} {...S} />
          <circle className="ink" cx={x} cy={162} r={5} {...S} />
          <path className="ink" d={`M${x} 146 v32 M${x - 16} 162 h32 M${x - 11} 151 l22 22 M${x + 11} 151 l-22 22`} {...THIN} />
        </g>
      ))}
      {/* antenna and radiator */}
      <path className="ink" d="M120 80 v-26 M110 54 q10 -14 20 0 z" {...S} />
      <path className="ink" d="M150 80 v-8 h40 v8" {...THIN} />
      <Note x={128} y={102} x2={96} y2={40} text="CREW CABIN" anchor="end" />
      <Note x={54} y={116} x2={24} y2={84} text="SUIT PORTS" anchor="end" />
      <Note x={214} y={102} x2={258} y2={68} text="COCKPIT" />
      <Note x={228} y={162} x2={284} y2={150} text="DRIVE" />
    </>
  );
}

const ART: Record<string, () => ReactNode> = { suit: Suit, capsule: Capsule, spacecraft: Spacecraft, station: Station, base: Base, rover: Rover };

export function EnvironmentDrawing({ id, className, notes = true }: { id: string; className?: string; notes?: boolean }) {
  const Art = ART[id] ?? Station;
  return (
    <svg viewBox={notes ? "-56 0 432 220" : "0 0 320 220"} className={`draw ${notes ? "" : "no-notes"} ${className ?? ""}`} role="img" aria-label={`Line drawing: ${id}`} key={id}>
      <Art />
    </svg>
  );
}
