import React, { memo, ReactElement, useMemo } from 'react';
import { StyleSheet, Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text01S } from '../../../styles/components';
import BottomSheetWrapper from '../../../components/BottomSheetWrapper';
import Glow from '../../../components/Glow';
import Button from '../../../components/Button';
import { toggleView } from '../../../store/actions/user';
import { wipeApp } from '../../../store/actions/settings';
import {
	useBottomSheetBackPress,
	useSnapPoints,
} from '../../../hooks/bottomSheet';
import BottomSheetNavigationHeader from '../../../components/BottomSheetNavigationHeader';

const imageSrc = require('../../../assets/illustrations/restore.png');

const ForgotPIN = (): ReactElement => {
	const snapPoints = useSnapPoints('large');
	const insets = useSafeAreaInsets();
	const buttonContainerStyles = useMemo(
		() => ({
			...styles.buttonContainer,
			paddingBottom: insets.bottom + 16,
		}),
		[insets.bottom],
	);

	useBottomSheetBackPress('forgotPIN');

	const handlePress = (): void => {
		wipeApp({});
		toggleView({
			view: 'forgotPIN',
			data: { isOpen: false },
		});
	};

	return (
		<BottomSheetWrapper
			view="forgotPIN"
			snapPoints={snapPoints}
			backdrop={true}>
			<View style={styles.container}>
				<BottomSheetNavigationHeader
					title="Forgot PIN?"
					displayBackButton={false}
				/>
				<Text01S color="white5">
					Forgot your PIN? Reset and recover your Bitkit wallet with your
					recovery phrase. Set a new PIN after completing recovery.
				</Text01S>
				<View style={styles.imageContainer} pointerEvents="none">
					<Glow color="brand" style={styles.glow} />
					<Image style={styles.image} resizeMode="contain" source={imageSrc} />
				</View>
				<View style={buttonContainerStyles}>
					<Button
						style={styles.button}
						size="large"
						text="Reset (Requires Recovery Phrase)"
						onPress={handlePress}
					/>
				</View>
			</View>
		</BottomSheetWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		paddingHorizontal: 32,
	},
	imageContainer: {
		flex: 1,
		position: 'relative',
		alignItems: 'center',
		justifyContent: 'center',
	},
	image: {
		width: 192,
		height: 192,
	},
	glow: {
		position: 'absolute',
	},
	buttonContainer: {
		marginTop: 'auto',
		flexDirection: 'row',
		justifyContent: 'center',
	},
	button: {
		flex: 1,
	},
});

export default memo(ForgotPIN);
