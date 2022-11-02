import React, { memo, ReactElement, useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';

import { View } from '../styles/components';
import Store from '../store/types';
import themes from '../styles/themes';

const DURATION = 500;

const Glow = memo(
	({
		top,
		color,
		fadeout,
		width,
		height,
	}: {
		top?: boolean;
		color: string;
		fadeout: boolean;
		width: number;
		height: number;
	}) => {
		return (<></>);
	},
);

/**
 * Draws radial gradients. When color changes, shows opacity animation
 */
const GlowingBackground = ({
	children,
	topLeft,
	bottomRight,
}: {
	children: ReactElement | ReactElement[];
	topLeft?: string;
	bottomRight?: string;
}): ReactElement => {
	const colors = useSelector(
		(state: Store) => themes[state.settings.theme].colors,
	);
	topLeft = topLeft ? colors[topLeft] || topLeft : colors.background;
	bottomRight = bottomRight ?? colors.background;
	const [topLeftItems, setTopLeftItems] = useState([{ color: topLeft, id: 0 }]);
	const [bottomRightItems, setBottomRightItems] = useState([
		{ color: bottomRight, id: 0 },
	]);

	const { height, width } = useWindowDimensions();

	useEffect(() => {
		setTopLeftItems((items) => {
			if (items[items.length - 1].color === topLeft) {
				return items;
			}
			const id = items[items.length - 1].id + 1;
			return [...items.splice(-4), { color: topLeft, id }];
		});
	}, [topLeft]);

	useEffect(() => {
		setBottomRightItems((items) => {
			if (items[items.length - 1].color === bottomRight) {
				return items;
			}
			const id = items[items.length - 1].id + 1;
			return [...items.splice(-4), { color: bottomRight, id }];
		});
	}, [bottomRight]);

	return (
		<View style={styles.container}>
			<View style={styles.overlay}>
			</View>
			{children}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	overlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
});

export default memo(GlowingBackground);
