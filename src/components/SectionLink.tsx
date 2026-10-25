import { useState } from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import { enterActivates } from '../lib/web';
import { useColors } from '../lib/theme';
import { fonts, themed } from '../theme';
import { Icon } from './Icon';

type Props = {
  label: string;
  canHover: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Kleiner Link mit Pfeil im Kopf eines Bands, z. B. „Woche →“ auf der Startseite. */
export function SectionLink({ label, canHover, onPress, style }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      {...enterActivates(onPress)}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role="link"
      aria-label={label}
      hitSlop={6}
      style={({ pressed }) => [styles.link, canHover && hovered && styles.hovered, pressed && styles.pressed, style]}
    >
      <Text style={[styles.label, canHover && hovered && styles.labelHovered]} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
      <Icon name="arrow" size={16} color={canHover && hovered ? colors.ink : colors.inkMuted} />
    </Pressable>
  );
}

const getStyles = themed((colors) => ({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: -10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    cursor: 'pointer',
  },
  hovered: {
    backgroundColor: colors.hover,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    letterSpacing: 0.3,
    color: colors.inkMuted,
  },
  labelHovered: {
    color: colors.ink,
  },
}));
