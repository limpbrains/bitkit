import React, { memo, ReactElement, useMemo, useEffect } from 'react';

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
	return (
		<>
		</>
	);
});

const GlowWrapper = ({ color, ...props }: IGlow): ReactElement => {
	const colors = useColors();
	const glowColor = colors[color] ?? color;

	return <Glow color={glowColor} {...props} />;
};

export default memo(GlowWrapper);
