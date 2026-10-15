import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ShellContext } from '../../lib/shell';
import { SIDEBAR_BREAKPOINT, SIDEBAR_WIDTH, colors } from '../../theme';
import { Sidebar } from './Sidebar';

type Props = {
  children: ReactNode;
  /** Zurück zum Sperrbildschirm. */
  onLock: () => void;
};

/** App-Hülle: am PC feste Seitenleiste links, am Handy eine Schublade über das Menü-Symbol. */
export function Shell({ children, onLock }: Props) {
  const { width } = useWindowDimensions();
  const docked = width >= SIDEBAR_BREAKPOINT;
  const [menuOpen, setMenuOpen] = useState(false);

  const value = useMemo(
    () => ({
      contentWidth: docked ? width - SIDEBAR_WIDTH : width,
      sidebarDocked: docked,
      openMenu: () => setMenuOpen(true),
    }),
    [docked, width],
  );

  return (
    <ShellContext.Provider value={value}>
      <View style={styles.row}>
        {docked && (
          <View style={styles.dock}>
            <Sidebar onLock={onLock} />
          </View>
        )}
        <View style={styles.main}>{children}</View>
      </View>
      {/* Wird das Fenster breit genug für die feste Leiste, verschwindet die Schublade von selbst. */}
      {!docked && (
        <Drawer open={menuOpen} onClose={() => setMenuOpen(false)}>
          <Sidebar onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} onLock={onLock} />
        </Drawer>
      )}
    </ShellContext.Provider>
  );
}

const DRAWER_WIDTH = 300;

function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const progress = useState(() => new Animated.Value(0))[0];
  const [mounted, setMounted] = useState(open);
  // Beim Öffnen sofort einhängen; ausgehängt wird erst, wenn die Schließ-Animation fertig ist.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    Animated.timing(progress, { toValue: open ? 1 : 0, duration: 240, useNativeDriver: false }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, progress]);

  // Escape schließt die Schublade im Browser.
  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_WIDTH, 0] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable style={styles.backdrop} onPress={onClose} aria-label="Menü schließen" />
      </Animated.View>
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]} aria-modal role="dialog">
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.footer,
  },
  dock: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.sidebarLine,
  },
  main: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    cursor: 'auto',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    maxWidth: '86%',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 4, height: 0 },
  },
});
