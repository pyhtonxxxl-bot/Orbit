import { usePathname } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, BackHandler, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ShellContext } from '../../lib/shell';
import { focusFirst, setInert } from '../../lib/web';
import { useColors } from '../../lib/theme';
import { SIDEBAR_BREAKPOINT, SIDEBAR_WIDTH, themed } from '../../theme';
import { Sidebar } from './Sidebar';

type Props = {
  children: ReactNode;
  /** Zurück zum Sperrbildschirm. */
  onLock: () => void;
};

/** App-Hülle: am PC feste Seitenleiste links, am Handy eine Schublade über das Menü-Symbol. */
export function Shell({ children, onLock }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const docked = width >= SIDEBAR_BREAKPOINT;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const mainRef = useRef<View>(null);

  // Schublade schließen, sobald sich die Seite ändert (auch per Zurück-Taste) oder die Leiste fest wird.
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    if (menuOpen) setMenuOpen(false);
  }
  if (docked && menuOpen) setMenuOpen(false);

  // Hinter der offenen Schublade ist die Seite für Tastatur und Screenreader gesperrt.
  useEffect(() => {
    setInert(mainRef.current, menuOpen);
  }, [menuOpen]);

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
        <View
          ref={mainRef}
          style={styles.main}
          importantForAccessibility={menuOpen ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={menuOpen}
        >
          {children}
        </View>
      </View>
      {!docked && (
        <Drawer open={menuOpen} onClose={() => setMenuOpen(false)}>
          <Sidebar
            onNavigate={() => setMenuOpen(false)}
            onClose={() => setMenuOpen(false)}
            onLock={() => {
              setMenuOpen(false);
              onLock();
            }}
          />
        </Drawer>
      )}
    </ShellContext.Provider>
  );
}

const DRAWER_WIDTH = 300;

function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [progress] = useState(() => new Animated.Value(0));
  const [mounted, setMounted] = useState(open);
  const panelRef = useRef<View>(null);
  const returnFocusRef = useRef<{ focus?: () => void } | null>(null);
  const onCloseRef = useRef(onClose);

  // Beim Öffnen sofort einhängen; ausgehängt wird erst, wenn die Schließ-Animation fertig ist.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    Animated.timing(progress, { toValue: open ? 1 : 0, duration: 240, useNativeDriver: false }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, progress]);

  // Fokus in die Schublade und beim Schließen zurück zum Menü-Symbol.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (open) {
      returnFocusRef.current = document.activeElement as { focus?: () => void } | null;
      const id = setTimeout(() => focusFirst(panelRef.current), 0);
      return () => clearTimeout(id);
    }
    returnFocusRef.current?.focus?.();
    returnFocusRef.current = null;
  }, [open]);

  // Escape (Browser) und die Zurück-Taste (Android) schließen die Schublade.
  useEffect(() => {
    if (!open) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCloseRef.current();
      return true;
    });
    return () => sub.remove();
  }, [open]);

  // Nach links wischen schließt die Schublade, wie man es vom Handy kennt.
  // Der Handler liest die Ref erst beim Wischen, nicht beim Rendern.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx < -12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60 || g.vx < -0.5) onCloseRef.current();
      },
    }),
  );

  if (!mounted) return null;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_WIDTH, 0] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable style={styles.backdrop} onPress={onClose} accessible={false} tabIndex={-1} />
      </Animated.View>
      <Animated.View
        ref={panelRef}
        style={[styles.drawer, { transform: [{ translateX }] }]}
        role="dialog"
        aria-modal
        aria-label="Menü"
        accessibilityViewIsModal
        {...pan.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const getStyles = themed((colors) => ({
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
}));
