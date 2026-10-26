import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShell } from '../../lib/shell';
import { useCanHover } from '../../lib/useLayout';
import { useColors } from '../../lib/theme';
import { themed } from '../../theme';
import { Icon } from '../Icon';

type Props = {
  /** Hintergrund, passend zum ersten Band der Seite. */
  color: string;
  gutter: number;
};

/**
 * Kopfzeile mit dem Menü-Symbol, ohne Seitentitel: die Seite spricht für sich.
 * Nur da, wenn die Seitenleiste nicht fest links steht (Handy, kleine Fenster).
 */
export function PageHeader({ color, gutter }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
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
    </View>
  );
}

const getStyles = themed((colors) => ({
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
}));
