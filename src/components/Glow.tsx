import React, { memo, ReactElement, useMemo, useEffect } from 'react';
import {
	Canvas,
	RadialGradient,
	Rect,
	runTiming,
	useValue,
	vec,
} from '@shopify/react-native-skia';

import useColors from '../hooks/colors';

/**
 * This component draws round gradint
 */

interface IGlow {
	color: string;
	size?: number;
	style?: object;
}

const Glow = memo(({ color, size = 600, style }: IGlow): ReactElement => {
	const opacity = useValue(0);
	const cstyle = useMemo(
		() => ({ width: size, height: size, ...style }),
		[size, style],
	);

	useEffect(() => {
		runTiming(opacity, 0.4, { duration: 300 });
	}, [opacity]);

	return (
		<Canvas style={cstyle}>
			<Rect x={0} y={0} width={size} height={size} opacity={opacity}>
				<RadialGradient
					c={vec(size / 2, size / 2)}
					r={size / 2}
					colors={[color, 'transparent']}
				/>
			</Rect>
		</Canvas>
	);
});

const GlowWrapper = ({ color, ...props }: IGlow): ReactElement => {
	const colors = useColors();
	const glowColor = colors[color] ?? color;

	return <Glow color={glowColor} {...props} />;
};

export default memo(GlowWrapper);
