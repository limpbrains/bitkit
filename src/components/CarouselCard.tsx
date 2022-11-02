import React, { memo, ReactElement, useMemo } from 'react';
import { LayoutAnimation, StyleSheet, Image, View } from 'react-native';

import { Caption13M, Pressable, Text01M, XIcon } from '../styles/components';
import Card from './Card';
import BitcoinLogo from '../assets/bitcoin-logo.svg';
import { dismissTodo } from '../store/actions/todos';
import useColors from '../hooks/colors';

const CarouselCard = ({
	id = '',
	title = '',
	description = '',
	onPress = (): null => null,
}: {
	id: string;
	title: string;
	description: string;
	onPress?: Function;
}): ReactElement => {
	const colors = useColors();
	LayoutAnimation.easeInEaseOut();

	const inverted = id === 'lightningSettingUp';

	const containerStyle = useMemo(
		() => [
			styles.container,
			inverted && {
				borderColor: colors.purple,
				borderWidth: 1,
			},
		],
		[inverted, colors.purple],
	);

	let icon;
	let color;
	switch (id) {
		case 'lightning':
		case 'lightningSettingUp':
			icon = (
				<Image
					resizeMode="contain"
					style={styles.image}
					source={require('../assets/illustrations/lightning.png')}
				/>
			);
			color = 'purple';
			break;
		case 'pin':
			icon = (
				<Image
					resizeMode="contain"
					style={styles.image}
					source={require('../assets/illustrations/shield.png')}
				/>
			);
			color = 'green';
			break;
		case 'backupSeedPhrase':
			icon = (
				<Image
					resizeMode="contain"
					style={styles.image}
					source={require('../assets/illustrations/safe.png')}
				/>
			);
			color = 'blue';
			break;
		case 'slashtagsProfile':
			icon = (
				<Image
					resizeMode="contain"
					style={styles.image}
					source={require('../assets/illustrations/crown-no-margins.png')}
				/>
			);
			color = 'brand';
			break;
		case 'buyBitcoin':
			icon = (
				<Image
					resizeMode="contain"
					style={styles.image}
					source={require('../assets/illustrations/b-emboss.png')}
				/>
			);
			color = 'orange';
			break;
		default:
			// TODO: Swap out BitcoinLogo with the relevant image based on the provided id.
			icon = (
				<BitcoinLogo viewBox="0 0 70 70" height="32.54px" width="45.52px" />
			);
			color = 'brand';
	}

	color = colors[color] ?? color;

	return (
		<Card style={containerStyle}>
			<Pressable onPress={onPress} color="transparent" style={styles.pressable}>
				<View style={styles.iconContainer}>{icon}</View>
				<View>
					<Text01M>{title}</Text01M>
					<Caption13M color="lightGray">{description}</Caption13M>
				</View>
			</Pressable>
			{id !== 'lightningSettingUp' && (
				<Pressable
					color="transparent"
					style={styles.dismiss}
					onPress={(): any => dismissTodo(id)}>
					<XIcon width={16} height={16} color="gray1" />
				</Pressable>
			)}
		</Card>
	);
};

const styles = StyleSheet.create({
	container: {
		width: 160,
		height: 160,
		borderRadius: 16,
		paddingHorizontal: 16,
		overflow: 'hidden',
	},
	pressable: {
		flex: 1,
	},
	iconContainer: {
		flex: 1,
		justifyContent: 'center',
	},
	dismiss: {
		position: 'absolute',
		top: 3,
		right: 3,
		padding: 16,
	},
	image: {
		height: 80,
		width: 80,
	},
	canvas: {
		width: 160,
		height: 160,
		position: 'absolute',
	},
});

export default memo(CarouselCard);
