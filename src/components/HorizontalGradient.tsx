import React, { ReactElement, useState, useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

type HorizontalGradientProps = {
	color: string;
	style?: StyleProp<ViewStyle>;
};

/**
 * This component draws a horizontal linear gradient, it has opacity animation on mount
 */
const HorizontalGradient = ({
	color,
	style,
}: HorizontalGradientProps): ReactElement => {
	const [layout, setLayout] = useState({ width: 1, height: 1 });

	return (
		<View style={style}>
		</View>
	);
};

export default HorizontalGradient;
