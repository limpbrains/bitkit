import React, {
	ReactElement,
	memo,
	useState,
	useMemo,
	useCallback,
} from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';

import {
	AnimatedView,
	Caption13Up,
	ChevronRight,
	DownArrow,
	Text01M,
	UpArrow,
	RefreshControl,
	View as ThemedView,
	TextInput,
} from '../../../styles/components';
import SafeAreaInsets from '../../../components/SafeAreaInsets';
import Button from '../../../components/Button';
import NavigationHeader from '../../../components/NavigationHeader';
import LightningChannel from '../../../components/LightningChannel';
import Money from '../../../components/Money';
import useColors from '../../../hooks/colors';
import {
	addPeer,
	getNodeId,
	payLightningInvoice,
	rebroadcastAllKnownTransactions,
	refreshLdk,
	setupLdk,
} from '../../../utils/lightning';
import { TChannel } from '@synonymdev/react-native-ldk';
import { useSelector } from 'react-redux';
import Store from '../../../store/types';
import Clipboard from '@react-native-clipboard/clipboard';
import {
	useLightningChannelName,
	useLightningBalance,
} from '../../../hooks/lightning';
import {
	showErrorNotification,
	showSuccessNotification,
} from '../../../utils/notifications';
import {
	createLightningInvoice,
	savePeer,
} from '../../../store/actions/lightning';
import { ETransactionDefaults } from '../../../store/types/wallet';
import { useBalance } from '../../../hooks/wallet';

const Channel = memo(
	({
		channelId,
		disabled,
		onPress,
	}: {
		channelId: string;
		disabled: boolean;
		onPress: () => void;
	}): ReactElement => {
		const name = useLightningChannelName(channelId);
		return (
			<TouchableOpacity onPress={onPress} style={styles.nRoot}>
				<View style={styles.nTitle}>
					<Text01M
						style={styles.nName}
						numberOfLines={1}
						ellipsizeMode="middle">
						{name}
					</Text01M>
					<ChevronRight color="gray1" />
				</View>
				<LightningChannel channelId={channelId} disabled={disabled} />
			</TouchableOpacity>
		);
	},
);

const ChannelList = memo(
	({
		channelIds,
		allChannels,
		onChannelPress,
	}: {
		allChannels: { [key: string]: TChannel };
		channelIds: string[];
		onChannelPress: Function;
	}): ReactElement => {
		return (
			<>
				{channelIds.map((channelId) => {
					const channel = allChannels[channelId];
					return (
						<Channel
							key={channelId}
							channelId={channelId}
							disabled={!channel.is_usable}
							onPress={(): void => onChannelPress(channelId)}
						/>
					);
				})}
			</>
		);
	},
);

const Channels = ({ navigation }): ReactElement => {
	const [closed, setClosed] = useState<boolean>(false);
	const [payingInvoice, setPayingInvoice] = useState<boolean>(false);
	const [refreshingLdk, setRefreshingLdk] = useState<boolean>(false);
	const [restartingLdk, setRestartingLdk] = useState<boolean>(false);
	const [rebroadcastingLdk, setRebroadcastingLdk] = useState(false);
	const [peer, setPeer] = useState<string>('');

	const colors = useColors();
	const balance = useBalance({ onchain: true });

	const selectedWallet = useSelector(
		(state: Store) => state.wallet.selectedWallet,
	);
	const selectedNetwork = useSelector(
		(state: Store) => state.wallet.selectedNetwork,
	);
	const channels = useSelector(
		(state: Store) =>
			state.lightning?.nodes[selectedWallet]?.channels[selectedNetwork] ?? {},
	);
	const openChannelIds = useSelector(
		(state: Store) =>
			state.lightning?.nodes[selectedWallet]?.openChannelIds[selectedNetwork] ??
			[],
	);
	const enableDevOptions = useSelector(
		(state: Store) => state.settings.enableDevOptions,
	);

	const { localBalance, remoteBalance } = useLightningBalance(false);

	const openChannels = useMemo(() => {
		return openChannelIds.filter((channelId) => {
			const channel = channels[channelId];
			return channel?.is_channel_ready;
		});
	}, [channels, openChannelIds]);

	const pendingChannels = useMemo(() => {
		return openChannelIds.filter((channelId) => {
			const channel = channels[channelId];
			return !channel?.is_channel_ready;
		});
	}, [channels, openChannelIds]);

	const closedChannels = useMemo(() => {
		const allChannelKeys = Object.keys(channels);
		return allChannelKeys.filter((key) => {
			return !openChannelIds.includes(key);
		});
	}, [channels, openChannelIds]);

	const handleAdd = useCallback((): void => {
		navigation.navigate('LightningRoot', {
			screen: 'Introduction',
		});

		// TODO: Update this view once we enable creating channels with nodes other than Blocktank.
		//navigation.navigate('LightningAddConnection');

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onChannelPress = useCallback((channelId) => {
		navigation.navigate('ChannelDetails', { channelId });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const createInvoice = async (amountSats = 100): Promise<void> => {
		const createPaymentRequest = await createLightningInvoice({
			amountSats,
			description: '',
			expiryDeltaSeconds: 99999,
			selectedNetwork,
			selectedWallet,
		});
		if (createPaymentRequest.isErr()) {
			showErrorNotification({
				title: 'Failed to Create Invoice',
				message: createPaymentRequest.error.message,
			});
			return;
		}
		const { to_str } = createPaymentRequest.value;
		console.log(to_str);
		Clipboard.setString(to_str);
		showSuccessNotification({
			title: 'Copied Invoice to Clipboard',
			message: to_str,
		});
	};

	const onRefreshLdk = useCallback(async (): Promise<void> => {
		setRefreshingLdk(true);
		await refreshLdk({ selectedWallet, selectedNetwork });
		setRefreshingLdk(false);
	}, [selectedNetwork, selectedWallet]);

	const addConnectionIsDisabled = useMemo(() => {
		return balance.satoshis <= ETransactionDefaults.recommendedBaseFee;
	}, [balance.satoshis]);

	const onAddPeer = useCallback(async () => {
		if (!peer) {
			// Attempt to grab and set peer string from clipboard.
			const clipboardStr = await Clipboard.getString();
			setPeer(clipboardStr);
			return;
		}
		const addPeerRes = await addPeer({
			peer,
			timeout: 5000,
		});
		if (addPeerRes.isErr()) {
			showErrorNotification({
				title: 'Unable to add lightning peer',
				message: addPeerRes.error.message,
			});
			return;
		}
		const savePeerRes = savePeer({ selectedWallet, selectedNetwork, peer });
		if (savePeerRes.isErr()) {
			showErrorNotification({
				title: 'Unable to save lightning peer',
				message: savePeerRes.error.message,
			});
			return;
		}
		showSuccessNotification({
			title: savePeerRes.value,
			message: 'Lightning peer added & saved',
		});
	}, [peer, selectedNetwork, selectedWallet]);

	return (
		<ThemedView style={styles.root}>
			<SafeAreaInsets type="top" />
			<NavigationHeader
				title="Lightning Connections"
				onAddPress={addConnectionIsDisabled ? undefined : handleAdd}
			/>
			<ScrollView
				contentContainerStyle={styles.content}
				refreshControl={
					<RefreshControl refreshing={refreshingLdk} onRefresh={onRefreshLdk} />
				}>
				<View style={styles.balances}>
					<View style={styles.balance}>
						<Caption13Up color="gray1">Spending balance</Caption13Up>
						<View style={styles.row}>
							<UpArrow color="purple" width={22} height={22} />
							<Money
								sats={localBalance}
								color="purple"
								size="title"
								unit="satoshi"
							/>
						</View>
					</View>
					<View style={styles.balance}>
						<Caption13Up color="gray1">Receiving capacity</Caption13Up>
						<View style={styles.row}>
							<DownArrow color="white" width={22} height={22} />
							<Money
								sats={remoteBalance}
								color="white"
								size="title"
								unit="satoshi"
							/>
						</View>
					</View>
				</View>

				{pendingChannels.length > 0 && (
					<>
						<Caption13Up color="gray1" style={styles.sectionTitle}>
							PENDING CONNECTIONS
						</Caption13Up>
						<ChannelList
							allChannels={channels}
							channelIds={pendingChannels}
							onChannelPress={onChannelPress}
						/>
					</>
				)}

				<Caption13Up color="gray1" style={styles.sectionTitle}>
					OPEN CONNECTIONS
				</Caption13Up>
				<ChannelList
					allChannels={channels}
					channelIds={openChannels}
					onChannelPress={onChannelPress}
				/>

				{closed && (
					<AnimatedView entering={FadeIn} exiting={FadeOut}>
						<Caption13Up color="gray1" style={styles.sectionTitle}>
							Closed connections
						</Caption13Up>
						<ChannelList
							allChannels={channels}
							channelIds={closedChannels}
							onChannelPress={onChannelPress}
						/>
					</AnimatedView>
				)}

				<View style={styles.buttons}>
					{enableDevOptions && (
						<>
							<Caption13Up color="gray1" style={styles.sectionTitle}>
								Dev Options
							</Caption13Up>
							<TextInput
								selectionColor={'orange'}
								autoCapitalize="none"
								autoCompleteType="off"
								autoCorrect={false}
								autoFocus={false}
								style={styles.textInput}
								value={peer}
								placeholder={'publicKey@ip:port'}
								multiline={true}
								onChangeText={(txt: string): void => {
									setPeer(txt);
								}}
								blurOnSubmit
								returnKeyType="done"
							/>
							<Button
								style={styles.button}
								text={
									peer
										? 'Add Lightning Peer'
										: 'Paste Lightning Peer From Clipboard'
								}
								onPress={onAddPeer}
							/>
							<Button
								style={styles.button}
								text={'Refresh LDK'}
								loading={refreshingLdk}
								onPress={onRefreshLdk}
							/>
							<Button
								style={styles.button}
								text={'Restart LDK'}
								loading={restartingLdk}
								onPress={async (): Promise<void> => {
									setRestartingLdk(true);
									await setupLdk({ selectedWallet, selectedNetwork });
									setRestartingLdk(false);
								}}
							/>
							<Button
								style={styles.button}
								text={'Rebroadcast LDK TXS'}
								loading={rebroadcastingLdk}
								onPress={async (): Promise<void> => {
									setRebroadcastingLdk(true);
									await rebroadcastAllKnownTransactions();
									setRebroadcastingLdk(false);
								}}
							/>
							<Button
								style={styles.button}
								text={'Get Node ID'}
								onPress={async (): Promise<void> => {
									const nodeId = await getNodeId();
									if (nodeId.isErr()) {
										console.log(nodeId.error.message);
										return;
									}
									console.log(nodeId.value);
									Clipboard.setString(nodeId.value);
									showSuccessNotification({
										title: 'Copied Node ID to Clipboard',
										message: nodeId.value,
									});
								}}
							/>

							{openChannelIds.length > 0 && (
								<>
									{remoteBalance > 100 && (
										<Button
											text={'Create Invoice: 100 sats'}
											onPress={async (): Promise<void> => {
												createInvoice(100).then();
											}}
										/>
									)}
									{remoteBalance > 5000 && (
										<Button
											text={'Create Invoice: 5000 sats'}
											onPress={async (): Promise<void> => {
												createInvoice(5000).then();
											}}
										/>
									)}
									{localBalance > 0 && (
										<>
											<Button
												text={'Pay Invoice From Clipboard'}
												loading={payingInvoice}
												onPress={async (): Promise<void> => {
													setPayingInvoice(true);
													const invoice = await Clipboard.getString();
													if (!invoice) {
														showErrorNotification({
															title: 'No Invoice Detected',
															message:
																'Unable to retrieve anything from the clipboard.',
														});
													}
													const response = await payLightningInvoice(invoice);
													if (response.isErr()) {
														showErrorNotification({
															title: 'Invoice Payment Failed',
															message: response.error.message,
														});
														setPayingInvoice(false);
														return;
													}
													await Promise.all([
														refreshLdk({ selectedWallet, selectedNetwork }),
													]);
													setPayingInvoice(false);
													showSuccessNotification({
														title: 'Invoice Payment Success',
														message: `Fee: ${response.value.fee_paid_sat} sats`,
													});
												}}
											/>
										</>
									)}
								</>
							)}
						</>
					)}

					{!closed && closedChannels.length > 0 && (
						<Button
							style={styles.button}
							text="Show Closed Connections"
							textStyle={{ color: colors.white8 }}
							size="large"
							variant="transparent"
							onPress={(): void => setClosed((c) => !c)}
						/>
					)}
					<Button
						style={styles.button}
						text="Add New Connection"
						size="large"
						disabled={addConnectionIsDisabled}
						onPress={handleAdd}
					/>
				</View>
			</ScrollView>
			<SafeAreaInsets type="bottom" />
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		justifyContent: 'space-between',
	},
	content: {
		paddingHorizontal: 16,
		flexGrow: 1,
	},
	balances: {
		flexDirection: 'row',
	},
	balance: {
		flex: 1,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255, 255, 255, 0.1)',
	},
	row: {
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'center',
	},
	buttons: {
		flex: 1,
		justifyContent: 'flex-end',
		marginBottom: 16,
	},
	button: {
		marginTop: 8,
	},
	sectionTitle: {
		marginTop: 16,
	},
	nRoot: {
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255, 255, 255, 0.1)',
	},
	nTitle: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 16,
		marginBottom: 8,
	},
	nName: {
		marginRight: 8,
	},
	textInput: {
		width: '100%',
		minHeight: 50,
		borderRadius: 10,
		padding: 10,
		textAlign: 'left',
		alignItems: 'center',
		justifyContent: 'center',
		fontWeight: 'bold',
		fontSize: 16,
		marginTop: 8,
	},
});

export default memo(Channels);
