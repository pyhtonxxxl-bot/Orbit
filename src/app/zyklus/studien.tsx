import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Band } from '../../components/health/Band';
import { PillButton } from '../../components/health/Form';
import { RecoveryCurve } from '../../components/health/RecoveryCurve';
import { PageHeader } from '../../components/shell/PageHeader';
import { useShell } from '../../lib/shell';
import { SECTIONS, SOURCES, citation, type Source } from '../../lib/studies';
import { useColors } from '../../lib/theme';
import { useHealth } from '../../lib/useHealth';
import { useCanHover, useLayout } from '../../lib/useLayout';
import { enterActivates } from '../../lib/web';
import { fonts, themed } from '../../theme';

/**
 * Warum der Health Zyklus so funktioniert: was Studien über feste Essenszeiten, Mengen, Erholung und die Tageszeit
 * fürs Training sagen. In eigenen Worten, mit Links zum Nachlesen. Unten „Verstanden“.
 */
export default function StudiesScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const canHover = useCanHover();
  const shell = useShell();
  const hasHeader = !!shell && !shell.sidebarDocked;
  const { health, loaded, confirmIntro } = useHealth();

  if (!loaded) return <View style={styles.root} />;

  const onConfirm = () => {
    confirmIntro();
    router.replace(health.profile ? '/zyklus' : '/zyklus/plan');
  };

  // Die Bänder laufen von hell nach dunkel wie die Wochentage.
  const band = (i: number) => colors.days[Math.min(colors.days.length - 1, i)];

  return (
    <View style={styles.root}>
      <PageHeader color={colors.days[0]} gutter={gutter} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={Platform.OS === 'web'}>
        <Band
          first
          title="HEALTH ZYKLUS"
          hint="Warum ein fester Rhythmus fürs Essen und Training? Hier steht, was Studien dazu zeigen, kurz und in eigenen Worten. Die Zahlen in Klammern führen zu den Quellen ganz unten."
          color={band(0)}
          wide={wide}
          gutter={gutter}
          topInset={hasHeader ? 0 : insets.top}
        />

        {SECTIONS.map((section, i) => (
          <Band key={section.title} title={section.title} hint={section.hint} color={band(i + 1)} wide={wide} gutter={gutter}>
            {/* Beim Training: die klassische Kurve als Bild. */}
            {section.curve && (
              <View style={styles.curve}>
                <RecoveryCurve recover={48} window={48} />
              </View>
            )}
            {section.points.map((point, j) => (
              <View key={j} style={styles.point}>
                <View style={styles.dot} />
                <Text style={styles.pointText}>
                  {point.text}
                  {!!citation(point.sources) && <Text style={styles.cite}> {citation(point.sources)}</Text>}
                </Text>
              </View>
            ))}
            {!!section.honest && (
              <View style={styles.honest}>
                <Text style={styles.honestLabel}>Ehrlich gesagt</Text>
                <Text style={styles.honestText}>
                  {section.honest.text}
                  {!!citation(section.honest.sources) && <Text style={styles.cite}> {citation(section.honest.sources)}</Text>}
                </Text>
              </View>
            )}
          </Band>
        ))}

        <Band
          title="QUELLEN"
          hint="Zum Nachlesen. Die Links führen zu PubMed, zum Verlag oder zur Fachgesellschaft."
          color={band(SECTIONS.length + 1)}
          wide={wide}
          gutter={gutter}
        >
          {SOURCES.map((source, i) => (
            <SourceRow key={source.id} n={i + 1} source={source} canHover={canHover} />
          ))}
        </Band>

        <Band
          title="VERSTANDEN?"
          hint="Orbit rechnet mit diesen Durchschnittswerten auf deinem Gerät. Das ist eine Orientierung, keine Diagnose und kein Ersatz für ärztlichen Rat."
          color={colors.footer}
          wide={wide}
          gutter={gutter}
          grow
        >
          <View style={styles.confirm}>
            <PillButton label={health.introSeen ? 'Zurück zum Zyklus' : 'Verstanden, weiter'} onPress={onConfirm} />
          </View>
        </Band>
      </ScrollView>
    </View>
  );
}

/** Eine Quelle: Nummer, Autoren und Jahr, Titel, Zeitschrift. Klick öffnet den Link. */
function SourceRow({ n, source, canHover }: { n: number; source: Source; canHover: boolean }) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [hovered, setHovered] = useState(false);
  const open = () => {
    Linking.openURL(source.url).catch(() => {});
  };
  return (
    <Pressable
      {...enterActivates(open)}
      onPress={open}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role="link"
      aria-label={`Quelle ${n}: ${source.authors} ${source.year}, ${source.title}. Öffnet ${source.url}`}
      style={({ pressed }) => [styles.source, canHover && hovered && styles.sourceHovered, pressed && styles.pressed]}
    >
      <Text style={styles.sourceNumber}>{n}</Text>
      <View style={styles.sourceText}>
        <Text style={styles.sourceTitle}>
          {source.authors} ({source.year}): {source.title}
        </Text>
        <Text style={styles.sourceMeta}>
          {source.kind} · {source.journal}
        </Text>
      </View>
      <Icon name="external" size={16} color={canHover && hovered ? colors.ink : colors.inkFaint} />
    </Pressable>
  );
}

const getStyles = themed((colors) => ({
  root: {
    flex: 1,
    backgroundColor: colors.footer,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  curve: {
    marginBottom: 14,
  },
  point: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    marginTop: 9,
    borderRadius: 3,
    backgroundColor: colors.ink,
  },
  pointText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 25,
    color: colors.ink,
  },
  cite: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.inkFaint,
  },
  honest: {
    marginTop: 14,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
  },
  honestLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  honestText: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    cursor: 'pointer',
  },
  sourceHovered: {
    backgroundColor: colors.hover,
  },
  pressed: {
    opacity: 0.6,
  },
  sourceNumber: {
    width: 22,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  sourceText: {
    flex: 1,
  },
  sourceTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
  },
  sourceMeta: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkMuted,
  },
  confirm: {
    marginTop: 4,
  },
}));
