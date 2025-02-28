import React, { memo, ReactElement } from 'react';
import { View, Image, StyleSheet, Share, Platform } from 'react-native';

import Button from '../../../components/Button';
import GlowingBackground from '../../../components/GlowingBackground';
import SafeAreaInsets from '../../../components/SafeAreaInsets';
import useColors from '../../../hooks/colors';
import { Display } from '../../../styles/components';
import SettingsView from './../SettingsView';

const imageSrc = require('../../../assets/illustrations/orange-pill.png');

const EasterEgg = (): ReactElement => {
	const { brand } = useColors();

	// TODO: add correct store IDs and test
	const appleAppID = '1634634088';
	const androidPackageName = 'to.synonym.bitkit';

	const appStoreUrl =
		Platform.OS === 'ios'
			? `https://apps.apple.com/us/app/bitkit/id${appleAppID}`
			: `https://play.google.com/store/apps/details?id=${androidPackageName}`;

	const onShare = async (): Promise<void> => {
		await Share.share({
			title: 'Bitkit',
			message: `Download Bitkit, Your Ultimate Bitcoin Toolkit. Handing you the keys to reshape your digital life. ${appStoreUrl}`,
		});
	};
	return (
		<GlowingBackground bottomRight={brand}>
			<SettingsView title="Orange Pilled" showBackNavigation={true} />
			<View style={styles.alignCenter}>
				<Image source={imageSrc} />
			</View>
			<View style={styles.intro}>
				<Display color="white" style={styles.text}>
					Who will you
				</Display>
				<Display color="brand" style={styles.text}>
					Orange-Pill?
				</Display>
			</View>
			<View style={styles.alignCenter}>
				<Button
					style={styles.button}
					text="Share Bitkit With A Friend"
					onPress={onShare}
				/>
			</View>
			<SafeAreaInsets type="bottom" />
		</GlowingBackground>
	);
};

const styles = StyleSheet.create({
	intro: {
		marginBottom: 40,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
	},
	text: {
		fontStyle: 'normal',
		fontWeight: '700',
		fontSize: 48,
		lineHeight: 48,
		marginLeft: 16,
		marginRight: 16,
		width: '100%',
		maxWidth: 281,
	},
	alignCenter: {
		alignItems: 'center',
	},
	button: {
		marginLeft: 16,
		marginRight: 16,
		marginBottom: 16,
		width: '100%',
		maxWidth: 343,
		height: 56,
	},
});

export default memo(EasterEgg);
