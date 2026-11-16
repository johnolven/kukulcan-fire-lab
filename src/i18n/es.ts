// Spanish dictionary, merged from one file per area of the interface.
// Code generated with SI assistance (Claude Code).

import { EVIDENCE } from "./es/evidence";
import { SHELL } from "./es/shell";
import { SIM } from "./es/sim";
import { VOICE } from "./es/voice";

export const ES: Record<string, string> = { ...SHELL, ...VOICE, ...EVIDENCE, ...SIM };
