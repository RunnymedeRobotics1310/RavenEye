import { createContext, useContext, useState, useMemo } from "react";
import type { ReactNode } from "react";

export type TrackNavigation = {
  navigate: (to: string) => void;
  goBack: () => void;
  resetTo: (to: string) => void;
  hasHistory: boolean;
};

type TrackNavContextValue = {
  nav: TrackNavigation;
  activeScreen: string;
};

const TrackNavContext = createContext<TrackNavContextValue | null>(null);

export function TrackNavProvider({ children }: { children: ReactNode }) {
  const [screenStack, setScreenStack] = useState<string[]>(["home"]);
  const activeScreen = screenStack[screenStack.length - 1];

  const nav: TrackNavigation = useMemo(() => ({
    navigate(to: string) {
      setScreenStack((prev) => [...prev, to]);
    },
    goBack() {
      setScreenStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    },
    resetTo(to: string) {
      setScreenStack([to]);
    },
    hasHistory: screenStack.length > 1,
  }), [screenStack.length]);

  return (
    <TrackNavContext value={{ nav, activeScreen }}>
      {children}
    </TrackNavContext>
  );
}

export function useTrackNav(): TrackNavigation {
  const ctx = useContext(TrackNavContext);
  if (!ctx) throw new Error("useTrackNav must be used within TrackNavProvider");
  return ctx.nav;
}

export function useActiveScreen(): string {
  const ctx = useContext(TrackNavContext);
  if (!ctx) throw new Error("useActiveScreen must be used within TrackNavProvider");
  return ctx.activeScreen;
}
