"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Channel } from "./types";

const STORAGE_KEY = "stickymilk_default_channel";
const DEFAULT_CHANNEL: Channel = "cometeer";

interface ChannelContextValue {
  /**
   * The visitor's stored default channel (anonymous: localStorage; a future
   * registered-user version would read/write User.default_channel instead —
   * this hook is the one place that swap would happen).
   */
  defaultChannel: Channel;
  /** Silently overwrites the stored default — no confirmation, per spec. */
  setDefaultChannel: (channel: Channel) => void;
}

const ChannelContext = createContext<ChannelContextValue | null>(null);

function isChannel(value: string | null): value is Channel {
  return value === "cometeer" || value === "nespresso" || value === "instant";
}

function readStoredChannel(): Channel {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isChannel(stored) ? stored : DEFAULT_CHANNEL;
  } catch {
    return DEFAULT_CHANNEL;
  }
}

function subscribe(onStoreChange: () => void) {
  // Picks up changes made from another tab; same-tab writes call
  // onStoreChange manually in setDefaultChannel below.
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function ChannelProvider({ children }: { children: ReactNode }) {
  // No onboarding question — everyone starts on Cometeer on the server and
  // on first client render, then useSyncExternalStore reconciles with
  // whatever's actually in localStorage without an effect-driven setState.
  const defaultChannel = useSyncExternalStore(
    subscribe,
    readStoredChannel,
    () => DEFAULT_CHANNEL
  );

  const setDefaultChannel = useCallback((channel: Channel) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, channel);
    } catch {
      // best-effort only
    }
    // storage events don't fire in the tab that made the change, so nudge
    // any listeners in this tab directly.
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);

  return (
    <ChannelContext.Provider value={{ defaultChannel, setDefaultChannel }}>
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannel() {
  const ctx = useContext(ChannelContext);
  if (!ctx) throw new Error("useChannel must be used within a ChannelProvider");
  return ctx;
}
