import React, { memo, ReactElement, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';

import {
	Subtitle,
	View as ThemedView,
	TouchableOpacity,
	Caption13Up,
} from '../../../styles/components';
import NavigationHeader from '../../../components/NavigationHeader';
import SafeAreaInsets from '../../../components/SafeAreaInsets';
import { getNodeId } from '../../../utils/lightning';
import { showSuccessNotification } from '../../../utils/notifications';
import Store from '../../../store/types';

const LightningNodeInfo = (): ReactElement => {
	const [nodeId, setNodeId] = useState('');
	const [error, setError] = useState('');
	const selectedNetwork = useSelector(
		(state: Store) => state.wallet.selectedNetwork,
	);

	useEffect(() => {
		(async (): Promise<void> => {
			const response = await getNodeId();
			if (response.isOk()) {
				setNodeId(response.value);
			} else {
				console.log('Error getting NodeId', response.error.message);
				setError('Bitkit failed to initialize the Lightning node.');
			}
		})();
	}, [selectedNetwork]);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaInsets type="top" />
			<NavigationHeader title="Lightning Node Info" displayBackButton />

			<View style={styles.content}>
				{!error && (
					<TouchableOpacity
						onPress={(): void => {
							Clipboard.setString(nodeId);
							showSuccessNotification({
								title: 'Copied to Clipboard',
								message: 'Successfully copied LDK Node ID to clipboard.',
							});
						}}>
						<Caption13Up style={styles.label} color="gray1">
							LDK Node ID
						</Caption13Up>
						<Subtitle>{nodeId}</Subtitle>
					</TouchableOpacity>
				)}

				{!!error && (
					<>
						<View>
							<Caption13Up style={styles.label} color="gray1">
								LDK Node ID
							</Caption13Up>
							<Subtitle color="red">disconnected</Subtitle>
						</View>
						<View style={styles.error}>
							<Subtitle>{error}</Subtitle>
						</View>
					</>
				)}
			</View>

			<SafeAreaInsets type="bottom" />
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
		paddingHorizontal: 16,
	},
	label: {
		marginBottom: 8,
	},
	error: {
		marginTop: 32,
	},
});

export default memo(LightningNodeInfo);
