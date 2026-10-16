import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShell } from '../../lib/shell';
import { useCanHover } from '../../lib/useLayout';
import { colors, fonts } from '../../theme';
import { Icon } from '../Icon';

type Props = {
  title: string;
  /** Hintergrund, passend zum ersten Band der Seite. */
  color: string;
  gutter: number;
};

/** Kopfzeile mit Menü-Symbol, nur wenn die Seitenleiste nicht fest links steht (Handy, kleine Fenster). */
export function PageHeader({ title, color, gutter }: Props) {
  const shell = useShell();
  const insets = useSafeAreaInsets();
  const canHover = useCanHover();
  const [hovered, setHovered] = useState(false);
  if (!shell || shell.sidebarDocked) return null;

  return (
    <View style={[styles.header, { backgroundColor: color, paddingTop: insets.top + 6, paddingHorizontal: gutter - 10 }]}>
      <Pressable
        onPress={shell.openMenu}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[styles.menu, canHover && hovered && styles.menuHovered]}
        role="button"
        aria-label="Menü öffnen"
      >
        <Icon name="menu" size={22} color={colors.ink} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 2,
  },
  menu: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    cursor: 'pointer',
  },
  menuHovered: {
    backgroundColor: colors.hover,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
});
