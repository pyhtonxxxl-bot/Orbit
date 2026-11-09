import { Text, View } from 'react-native';

import type { Advice } from '../../lib/health';
import { citation } from '../../lib/studies';
import { useColors } from '../../lib/theme';
import { fonts, themed } from '../../theme';

/** Hinweise mit Punkt: orange = passt nicht zu den Empfehlungen, grau = nur zur Info. Zahlen = Quellen. */
export function AdviceList({ items }: { items: Advice[] }) {
  const styles = getStyles(useColors());
  return (
    <View style={styles.list}>
      {items.map((item, i) => (
        <View key={i} style={styles.row}>
          <View style={[styles.dot, item.level === 'warn' && styles.dotWarn]} />
          <Text style={styles.text}>
            {item.text}
            {!!citation(item.sources) && <Text style={styles.sources}> {citation(item.sources)}</Text>}
          </Text>
        </View>
      ))}
    </View>
  );
}

const getStyles = themed((colors) => ({
  list: {
    marginTop: 14,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 7,
    height: 7,
    marginTop: 8,
    borderRadius: 4,
    backgroundColor: colors.inkFaint,
  },
  dotWarn: {
    backgroundColor: colors.accent,
  },
  text: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  sources: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.inkFaint,
  },
}));
