import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.box, checked && styles.boxChecked]}>
      {checked && <Tick />}
    </View>
  );
}

/** Weißes Häkchen ohne Icon-Library: zwei Ränder einer gedrehten Box. `scale` für größere Flächen. */
export function Tick({ scale = 1 }: { scale?: number }) {
  return (
    <View
      style={[
        styles.tick,
        scale !== 1 && {
          width: 6 * scale,
          height: 11 * scale,
          marginTop: -2 * scale,
          borderRightWidth: 2 * Math.sqrt(scale),
          borderBottomWidth: 2 * Math.sqrt(scale),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tick: {
    width: 6,
    height: 11,
    marginTop: -2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: '45deg' }],
  },
});
