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
const DEFAULT_CHANNEL: Channel | null = null;

interface ChannelContextValue {
  /**
   * The visitor's stored default channel (anonymous: localStorage; a future
   * registered-user version would read/write User.default_channel instead —
   * this hook is the one place that swap would happen).
   *
   * When null: no coffee system is locked in (Nothing selected = "Show All").
   */
  defaultChannel: Channel | null;
  /** Silently sets or clears (null) the stored default — no confirmation, per spec. */
  setDefaultChannel: (channel: Channel | null) => void;
}

const ChannelContext = createContext<ChannelContextValue | null>(null);

function isChannel(value: string | null): value is Channel {
  return value === "cometeer" || value === "nespresso" || value === "instant";
}

function readStoredChannel(): Channel | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isChannel(stored) ? stored : null;
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
  // Fresh visitors start on null ("Show All"), then useSyncExternalStore
  // reconciles with whatever's actually stored in localStorage.
  const defaultChannel = useSyncExternalStore(
    subscribe,
    readStoredChannel,
    () => DEFAULT_CHANNEL
  );

  const setDefaultChannel = useCallback((channel: Channel | null) => {
    try {
      if (channel) {
        window.localStorage.setItem(STORAGE_KEY, channel);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
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
