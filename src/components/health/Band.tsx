import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { heading } from '../../lib/web';
import { useColors } from '../../lib/theme';
import { COMPACT_MAX_WIDTH, CONTENT_MAX_WIDTH, fonts, space, themed } from '../../theme';

type Props = {
  color: string;
  title: string;
  /** Kleiner Text unter der Überschrift. */
  hint?: string;
  wide: boolean;
  gutter: number;
  /** Erstes Band der Seite: große Überschrift, oben Platz für die Statusleiste. */
  first?: boolean;
  topInset?: number;
  /** Letztes Band: füllt den Rest des Bildschirms. */
  grow?: boolean;
  /** Steht unter der Überschrift (am PC links, am Handy direkt darunter). */
  side?: ReactNode;
  children?: ReactNode;
};

/**
 * Ein Band wie in den Einstellungen: am PC links Überschrift und Hinweis, rechts der Inhalt,
 * am Handy alles untereinander.
 */
export function Band({ color, title, hint, wide, gutter, first = false, topInset = 0, grow = false, side, children }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const rowY = wide ? space.rowYWide : space.rowY;
  return (
    <View
      style={[
        grow && styles.grow,
        {
          backgroundColor: color,
          paddingTop: (first ? (wide ? 40 : rowY) : rowY + 6) + topInset,
          paddingBottom: first ? (wide ? 36 : rowY) : rowY + 6,
          paddingHorizontal: gutter,
        },
      ]}
    >
      <View style={[styles.inner, wide ? styles.innerWide : styles.innerCompact]}>
        <View style={wide ? styles.side : undefined}>
          <Text
            {...heading(first ? 1 : 2)}
            style={first ? [styles.heading, wide && styles.headingWide] : [styles.section, wide && styles.sectionWide]}
            maxFontSizeMultiplier={1.3}
          >
            {title}
          </Text>
          {!!hint && <Text style={styles.hint}>{hint}</Text>}
          {side}
        </View>
        {children !== undefined && <View style={wide ? styles.bodyWide : styles.bodyCompact}>{children}</View>}
      </View>
    </View>
  );
}

const getStyles = themed((colors) => ({
  grow: {
    flexGrow: 1,
  },
  inner: {
    width: '100%',
  },
  innerCompact: {
    maxWidth: COMPACT_MAX_WIDTH,
  },
  innerWide: {
    flexDirection: 'row',
    alignSelf: 'center',
    maxWidth: CONTENT_MAX_WIDTH,
    gap: 48,
  },
  side: {
    flexBasis: '43%',
    maxWidth: 460,
  },
  bodyWide: {
    flex: 1,
    maxWidth: 620,
  },
  bodyCompact: {
    marginTop: 18,
  },
  heading: {
    fontFamily: fonts.heavy,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  headingWide: {
    fontSize: 48,
    lineHeight: 54,
  },
  section: {
    fontFamily: fonts.heavy,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  sectionWide: {
    fontSize: 34,
    lineHeight: 40,
  },
  hint: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.inkMuted,
  },
}));
