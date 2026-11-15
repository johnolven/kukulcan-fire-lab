"use client";
// React bindings for the control registry.
// Code generated with SI assistance (Claude Code).

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { CONTROLS, controls, type ActionId, type ControlId, type ControlValue } from "./controls";

/** Read and write one control. The component re-renders only when this control changes. */
export function useControl<T extends ControlValue>(id: ControlId): [T, (value: T) => void] {
  const subscribe = useCallback((l: () => void) => controls.subscribe(id, l), [id]);
  const value = useSyncExternalStore(subscribe, () => controls.get<T>(id), () => CONTROLS[id].initial as T);
  const set = useCallback((v: T) => void controls.set(id, v), [id]);
  return [value, set];
}

/** Run a handler when an action is pressed by the user, the voice or the chat. */
export function useControlAction(id: ActionId, handler: () => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => controls.onPress(id, () => ref.current()), [id]);
}
