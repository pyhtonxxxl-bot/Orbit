import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors } from '../theme';

export type IconName = 'home' | 'week' | 'training' | 'food' | 'menu' | 'close' | 'arrow' | 'lock';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/** Schlichte Linien-Icons (24er Raster), passend zur dünnen Barlow-Optik. */
export function Icon({ name, size = 20, color = colors.ink, strokeWidth = 1.75 }: Props) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  // Rein dekorativ: die Beschriftung steht immer daneben, Screenreader überspringen das Icon.
  return (
    <View aria-hidden style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {name === 'home' && (
          <>
            <Path d="M3.5 10.5 12 3.5l8.5 7" {...stroke} />
            <Path d="M5.5 9v11h4.5v-6h4v6h4.5V9" {...stroke} />
          </>
        )}
        {name === 'week' && (
          <>
            <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} {...stroke} />
            <Path d="M3.5 10h17M8 3v4M16 3v4" {...stroke} />
          </>
        )}
        {name === 'training' && <Path d="M6.5 7.5v9M3.5 10v4M17.5 7.5v9M20.5 10v4M6.5 12h11" {...stroke} />}
        {name === 'food' && (
          <>
            <Path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z" {...stroke} />
            <Path d="M9.5 3.5c-1 1.4 1 2.6 0 4.5M14 3.5c-1 1.4 1 2.6 0 4.5" {...stroke} />
          </>
        )}
        {name === 'menu' && <Path d="M4 7h16M4 12h16M4 17h10" {...stroke} />}
        {name === 'close' && <Path d="M6 6l12 12M18 6 6 18" {...stroke} />}
        {name === 'arrow' && <Path d="M5 12h14M13 6l6 6-6 6" {...stroke} />}
        {name === 'lock' && (
          <>
            <Rect x={5} y={10.5} width={14} height={10} rx={2.5} {...stroke} />
            <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...stroke} />
          </>
        )}
      </Svg>
    </View>
  );
}
