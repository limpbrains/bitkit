import React, { memo, ReactElement } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { View as ThemedView } from '../styles/components';
import colors, { IColors } from '../styles/colors';

const Gradient = ({
	startColor,
	endColor,
}: {
	startColor: keyof IColors;
	endColor: keyof IColors;
}): ReactElement => {
	return (
		<></>
	);
};

const GradientView = ({
	startColor = 'gray6',
	endColor = 'black',
	style,
	children,
}: {
	startColor?: keyof IColors;
	endColor?: keyof IColors;
	style?: StyleProp<ViewStyle>;
	children?: JSX.Element | JSX.Element[];
}): ReactElement => {
	return (
		<ThemedView style={style}>
			{children}
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	canvas: {
		position: 'absolute',
		height: '100%',
		width: '100%',
	},
});

export default memo(GradientView);
