import { createContext, useContext } from 'react';

export type ShellState = {
  /** Breite des Inhaltsbereichs neben der Seitenleiste (bzw. die ganze Fensterbreite ohne Seitenleiste). */
  contentWidth: number;
  /** `true`, wenn die Seitenleiste fest links steht (PC). Sonst gibt es ein Menü-Symbol. */
  sidebarDocked: boolean;
  /** Öffnet die Seitenleiste als Schublade (Handy, kleine Fenster). */
  openMenu: () => void;
};

export const ShellContext = createContext<ShellState | null>(null);

/** Zustand der App-Hülle. `null` außerhalb der Hülle (z. B. auf dem Sperrbildschirm). */
export function useShell(): ShellState | null {
  return useContext(ShellContext);
}
