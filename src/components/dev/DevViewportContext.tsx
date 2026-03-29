// ⚠️ TEMPORARY DEV COMPONENT - DELETE BEFORE PRODUCTION ⚠️

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

interface ViewportPreset {
  width: number;
  height: number;
  label: string;
}

const VIEWPORT_PRESETS: Record<ViewportMode, ViewportPreset | null> = {
  desktop: null,
  tablet: { width: 768, height: 1024, label: '768 × 1024' },
  mobile: { width: 390, height: 844, label: '390 × 844' },
};

interface DevViewportContextValue {
  mode: ViewportMode;
  setMode: (mode: ViewportMode) => void;
  preset: ViewportPreset | null;
}

const DevViewportContext = createContext<DevViewportContextValue>({
  mode: 'desktop',
  setMode: () => {},
  preset: null,
});

export function useDevViewport() {
  return useContext(DevViewportContext);
}

export function DevViewportProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ViewportMode>('desktop');

  const setMode = useCallback((m: ViewportMode) => setModeState(m), []);

  return (
    <DevViewportContext.Provider value={{ mode, setMode, preset: VIEWPORT_PRESETS[mode] }}>
      {children}
    </DevViewportContext.Provider>
  );
}

export function DevViewportWrapper({ children }: { children: React.ReactNode }) {
  const { mode, preset } = useDevViewport();

  if (mode === 'desktop' || !preset) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-neutral-900/80 z-[9998]">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <span className="uppercase tracking-wider">{mode}</span>
          <span className="text-neutral-600">—</span>
          <span>{preset.label}</span>
        </div>
        <div
          className="relative bg-background overflow-auto custom-scrollbar rounded-xl border-2 border-neutral-700 shadow-2xl"
          style={{
            width: preset.width,
            height: preset.height,
            maxHeight: 'calc(100vh - 80px)',
            maxWidth: 'calc(100vw - 40px)',
          }}
        >
          <div className="min-h-full" style={{ width: preset.width }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
