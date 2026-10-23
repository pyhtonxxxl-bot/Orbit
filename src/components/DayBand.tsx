import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate, formatTime } from '../lib/date';
import { heading } from '../lib/web';
import { COMPACT_MAX_WIDTH, CONTENT_MAX_WIDTH, colors, fonts, space } from '../theme';

type Props = {
  /** Wochentag, für Bedienhilfen. */
  label: string;
  /** Überschrift, falls sie anders lauten soll als der Tag (Startseite: „Todos“). */
  title?: string;
  /** Kleiner Zusatz im Kopf, z. B. ein Link zur ganzen Woche. */
  accessory?: ReactNode;
  /** Ersetzt Datum und Uhrzeit neben der Überschrift (Startseite: „1 von 3 erledigt“). */
  subtitle?: string;
  /** Oranger Punkt für heute. Auf der Startseite aus, dort ist alles „heute“. */
  todayDot?: boolean;
  date: Date;
  now: Date;
  color: string;
  isToday: boolean;
  /** Aufgeklappt zeigt das Band seinen Inhalt. Am Handy wie am PC ist immer höchstens ein Tag offen. */
  expanded: boolean;
  /** PC-Layout: Tag und Datum links, Inhalt rechts. */
  wide: boolean;
  /** Teilt sich übrige Höhe mit den anderen Bändern (Standard). Auf der Startseite aus. */
  fill?: boolean;
  gutter: number;
  topInset?: number;
  /** Erledigt/gesamt, steht zugeklappt im Kopf. */
  count?: { done: number; total: number };
  /** Antippen klappt den Tag auf/zu. Ohne Handler bleibt der Kopf ein fester Titel, z. B. auf der Startseite. */
  onPressHeader?: () => void;
  children: ReactNode;
};

/** Ein Tagesband im Stapel: Kopf mit Tag und Datum, darunter (Handy) bzw. daneben (PC) der Inhalt. */
export function DayBand({
  label,
  title = label,
  accessory,
  subtitle,
  todayDot = true,
  date,
  now,
  color,
  isToday,
  expanded,
  wide,
  fill = true,
  gutter,
  topInset = 0,
  count,
  onPressHeader,
  children,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const rowY = wide ? space.rowYWide : space.rowY;
  const total = count?.total ?? 0;
  const ariaLabel = `${label}, ${formatDate(date)}${isToday ? ', heute' : ''}${
    total ? `, ${count?.done} von ${total} erledigt` : ''
  }`;

  const dateText = (
    <Text style={[styles.date, wide && styles.dateWide]}>
      {subtitle ?? `${formatDate(date)}${isToday ? ` – ${formatTime(now)}` : ''}`}
    </Text>
  );
  const countText = !expanded && total > 0 && (
    <Text style={styles.count}>
      {count?.done}/{total}
    </Text>
  );

  // PC: Datum neben dem Tag, damit die ganze Woche auf einen Bildschirm passt.
  if (wide) {
    const headLine = (
      <View style={styles.headerLineWide}>
        {isToday && todayDot && <View style={styles.todayDot} />}
        <Text
          {...(onPressHeader ? {} : heading(2))}
          style={[styles.day, styles.dayWide]}
          maxFontSizeMultiplier={1.3}
        >
          {title.toUpperCase()}
        </Text>
        {dateText}
      </View>
    );

    // Zugeklappt ist das ganze Band ein Knopf, der den Tag aufklappt.
    if (!expanded && onPressHeader) {
      return (
        <Pressable
          onPress={onPressHeader}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          role="button"
          aria-expanded={false}
          aria-label={ariaLabel}
          style={[
            fill && styles.row,
            styles.bandWideCollapsed,
            { backgroundColor: color, paddingVertical: rowY, paddingHorizontal: gutter },
          ]}
        >
          {hovered && <View style={styles.hoverOverlay} />}
          <View style={[styles.innerWide, styles.innerWideCollapsed]}>
            <View style={styles.side}>{headLine}</View>
            <View style={styles.bodyWideCollapsed}>{countText}</View>
          </View>
        </Pressable>
      );
    }

    return (
      <View style={[fill && styles.row, { backgroundColor: color, paddingVertical: rowY, paddingHorizontal: gutter }]}>
        <View style={styles.innerWide}>
          <View style={styles.side}>
            {onPressHeader ? (
              <Pressable
                onPress={onPressHeader}
                role="button"
                aria-expanded
                aria-label={ariaLabel}
                style={styles.headerWide}
              >
                {headLine}
              </Pressable>
            ) : (
              headLine
            )}
            {accessory && <View style={styles.accessoryWide}>{accessory}</View>}
          </View>
          <View style={styles.bodyWide}>{children}</View>
        </View>
      </View>
    );
  }

  const headerStyle = [
    styles.compactHeader,
    !expanded && styles.compactHeaderCollapsed,
    { paddingTop: rowY + topInset, paddingBottom: expanded ? 0 : rowY, paddingHorizontal: gutter },
  ];
  const headerContent = (
    <View style={styles.compactInner}>
      <View style={styles.headerLine}>
        {/* Als Überschrift nur, wenn der Kopf kein Knopf ist (Knöpfe dürfen keine Überschriften enthalten). */}
        <Text
          {...(onPressHeader ? {} : heading(2))}
          style={styles.day}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.3}
        >
          {title.toUpperCase()}
        </Text>
        {countText}
        {accessory}
      </View>
      {(expanded || isToday) && dateText}
    </View>
  );

  // Handy: das ganze Band ist antippbar und klappt den Tag auf oder zu.
  return (
    <View style={[fill && styles.row, { backgroundColor: color }]}>
      {onPressHeader ? (
        <Pressable onPress={onPressHeader} role="button" aria-expanded={expanded} aria-label={ariaLabel} style={headerStyle}>
          {headerContent}
        </Pressable>
      ) : (
        <View style={[headerStyle, styles.staticHeader]}>{headerContent}</View>
      )}

      {expanded && (
        // Eigene (wirkungslose) Tippfläche: sonst ordnen Touch-Browser ein Tippen knapp über dem
        // nächsten Band diesem zu und klappen ungewollt den nächsten Tag auf.
        <Pressable
          accessible={false}
          focusable={false}
          tabIndex={-1}
          style={[styles.compactBody, { paddingHorizontal: gutter, paddingBottom: rowY }]}
        >
          <View style={[styles.compactInner, styles.body]}>{children}</View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Die Bänder teilen sich übrige Höhe, damit der Stapel immer den ganzen Bildschirm füllt.
  row: {
    flexGrow: 1,
  },
  compactHeader: {
    cursor: 'pointer',
  },
  staticHeader: {
    cursor: 'auto',
  },
  // Zugeklappt füllt die Tippfläche das ganze Band, der Inhalt sitzt mittig.
  compactHeaderCollapsed: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  compactBody: {
    cursor: 'auto',
  },
  compactInner: {
    width: '100%',
    maxWidth: COMPACT_MAX_WIDTH,
  },
  innerWide: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    gap: 48,
  },
  innerWideCollapsed: {
    alignItems: 'baseline',
  },
  bandWideCollapsed: {
    justifyContent: 'center',
    cursor: 'pointer',
  },
  // Hover hellt auf statt abzudunkeln, sonst kippt die Hell-dunkel-Treppe.
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.hoverBand,
  },
  headerWide: {
    alignSelf: 'flex-start',
    cursor: 'pointer',
  },
  // 43 %: „DONNERSTAG“ und Datum passen bei 1280 px mit Seitenleiste noch in eine Zeile.
  side: {
    flexBasis: '43%',
    maxWidth: 460,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  accessoryWide: {
    marginTop: 6,
    alignItems: 'flex-start',
  },
  headerLineWide: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 16,
  },
  // Kleiner oranger Punkt im Seitenrand markiert heute.
  todayDot: {
    position: 'absolute',
    left: -20,
    top: 19,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  day: {
    flexShrink: 1,
    fontFamily: fonts.heavy,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  dayWide: {
    fontSize: 38,
    lineHeight: 44,
  },
  count: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    letterSpacing: 1,
    color: colors.inkFaint,
  },
  date: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.inkMuted,
  },
  dateWide: {
    marginTop: 0,
  },
  body: {
    marginTop: 18,
  },
  // Erste Zeile steht auf derselben Grundlinie wie Tagesname und Datum.
  bodyWide: {
    flex: 1,
    marginTop: 10,
    maxWidth: 620,
  },
  bodyWideCollapsed: {
    flex: 1,
    maxWidth: 620,
  },
});
