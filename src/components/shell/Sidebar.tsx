import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCanHover } from '../../lib/useLayout';
import { colors, fonts } from '../../theme';
import { Icon, type IconName } from '../Icon';

type Item = { label: string; icon: IconName; href?: '/' | '/woche'; soon?: boolean };

// Startseite zuerst, dann die Werkzeuge. Was „bald“ ist, steht schon da, ist aber noch nicht klickbar.
const MAIN: Item[] = [{ label: 'Startseite', icon: 'home', href: '/' }];
const TOOLS: Item[] = [
  { label: 'Woche', icon: 'week', href: '/woche' },
  { label: 'Training', icon: 'training', soon: true },
  { label: 'Ernährung', icon: 'food', soon: true },
];

type Props = {
  /** Nach einem Klick, z. B. um die Schublade am Handy zu schließen. */
  onNavigate?: () => void;
  onLock: () => void;
  onClose?: () => void;
};

export function Sidebar({ onNavigate, onLock, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const canHover = useCanHover();

  const go = (href: string) => {
    onNavigate?.();
    if (href !== pathname) router.navigate(href as '/' | '/woche');
  };

  return (
    <View style={[styles.sidebar, { paddingTop: 28 + insets.top, paddingBottom: 20 + insets.bottom }]} role="navigation">
      <View style={styles.brandRow}>
        <Text style={styles.brand}>ORBIT</Text>
        {onClose && (
          <Pressable onPress={onClose} style={styles.closeButton} role="button" aria-label="Menü schließen">
            <Icon name="close" size={20} color={colors.control} />
          </Pressable>
        )}
      </View>

      <View style={styles.group}>
        {MAIN.map((item) => (
          <NavItem key={item.label} item={item} active={item.href === pathname} canHover={canHover} onPress={go} />
        ))}
      </View>

      <Text style={styles.section}>Werkzeuge</Text>
      <View style={styles.group}>
        {TOOLS.map((item) => (
          <NavItem key={item.label} item={item} active={item.href === pathname} canHover={canHover} onPress={go} />
        ))}
      </View>

      <View style={styles.spacer} />
      <NavItem item={{ label: 'Sperren', icon: 'lock' }} active={false} canHover={canHover} onPress={onLock} />
    </View>
  );
}

function NavItem({
  item,
  active,
  canHover,
  onPress,
}: {
  item: Item;
  active: boolean;
  canHover: boolean;
  onPress: (href: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const disabled = item.soon;
  return (
    <Pressable
      onPress={() => onPress(item.href ?? '')}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={disabled}
      role={item.href ? 'link' : 'button'}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled}
      aria-label={disabled ? `${item.label}, kommt bald` : item.label}
      style={[
        styles.item,
        active && styles.itemActive,
        canHover && hovered && !active && !disabled && styles.itemHovered,
        disabled && styles.itemDisabled,
      ]}
    >
      <Icon name={item.icon} size={19} color={active ? colors.ink : colors.control} />
      <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{item.label}</Text>
      {disabled && <Text style={styles.soon}>bald</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    paddingHorizontal: 14,
    backgroundColor: colors.sidebar,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 28,
  },
  brand: {
    fontFamily: fonts.heavy,
    fontSize: 24,
    letterSpacing: 1.5,
    color: colors.ink,
  },
  closeButton: {
    width: 40,
    height: 40,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    cursor: 'pointer',
  },
  group: {
    gap: 2,
  },
  section: {
    marginTop: 26,
    marginBottom: 8,
    paddingHorizontal: 10,
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 42,
    paddingHorizontal: 10,
    borderRadius: 10,
    cursor: 'pointer',
  },
  itemActive: {
    backgroundColor: colors.active,
  },
  itemHovered: {
    backgroundColor: colors.hover,
  },
  itemDisabled: {
    opacity: 0.55,
    cursor: 'auto',
  },
  itemLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.inkMuted,
  },
  itemLabelActive: {
    fontFamily: fonts.semibold,
    color: colors.ink,
  },
  soon: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.inkFaint,
  },
  spacer: {
    flex: 1,
  },
});
