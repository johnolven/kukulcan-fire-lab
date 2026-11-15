// Tiny browser event bus: components report which links of the system they just
// used, and the system map animates those links. Nothing here is simulated;
// a link lights up only when a real request travels it.
// Code generated with SI assistance (Claude Code).

export type LinkId =
  | "you-vapi"
  | "you-table"
  | "vapi-table"
  | "table-voicemcp"
  | "voicemcp-core"
  | "table-agents"
  | "agents-core"
  | "agents-claude"
  | "table-psi"
  | "clients-research"
  | "research-core"
  | "research-agents"
  | "research-psi";

const EVENT = "firelab:activity";

export function signal(...links: LinkId[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: links }));
}

export function onSignal(handler: (links: LinkId[]) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<LinkId[]>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
