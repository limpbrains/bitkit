import React, {
	ReactElement,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSelector } from 'react-redux';

import {
	AnimatedView,
	Caption13Up,
	Display,
	Headline,
	CoinsIcon,
	SavingsIcon,
	Text01S,
} from '../../styles/components';
import SafeAreaInsets from '../../components/SafeAreaInsets';
import GlowingBackground from '../../components/GlowingBackground';
import NavigationHeader from '../../components/NavigationHeader';
import Button from '../../components/Button';
import useColors from '../../hooks/colors';
import AmountToggle from '../../components/AmountToggle';
import FancySlider from '../../components/FancySlider';
import NumberPadLightning from './NumberPadLightning';
import type { LightningScreenProps } from '../../navigation/types';

import Store from '../../store/types';
import { useBalance } from '../../hooks/wallet';
import {
	resetOnChainTransaction,
	setupOnChainTransaction,
} from '../../store/actions/wallet';
import { startChannelPurchase } from '../../store/actions/blocktank';
import { showErrorNotification } from '../../utils/notifications';
import { fiatToBitcoinUnit } from '../../utils/exchange-rate';
import { convertCurrency } from '../../utils/blocktank';
import { useFocusEffect } from '@react-navigation/native';

export const Percentage = ({ value, type }): ReactElement => {
	return (
		<View style={styles.pRoot}>
			{type === 'spendings' ? (
				<CoinsIcon color="purple" height={26} width={26} />
			) : (
				<SavingsIcon color="orange" height={32} width={32} />
			)}

			<Headline lineHeight="40px" style={styles.pText}>
				{value}
				<Text01S>%</Text01S>
			</Headline>
		</View>
	);
};

const QuickSetup = ({
	navigation,
	route,
}: LightningScreenProps<'QuickSetup'>): ReactElement => {
	const colors = useColors();
	const [keybrd, setKeybrd] = useState(false);
	const [loading, setLoading] = useState(false);
	const [totalBalance, setTotalBalance] = useState(0);
	const [spendingAmount, setSpendingAmount] = useState(0);
	const currentBalance = useBalance({ onchain: true });
	const productId = useSelector(
		(state: Store) => state.blocktank?.serviceList[0]?.product_id ?? '',
	);
	const selectedNetwork = useSelector(
		(state: Store) => state.wallet.selectedNetwork,
	);
	const selectedWallet = useSelector(
		(state: Store) => state.wallet.selectedWallet,
	);
	const blocktankService = useSelector(
		(state: Store) => state.blocktank.serviceList[0],
	);
	const selectedCurrency = useSelector(
		(state: Store) => state.settings.selectedCurrency,
	);

	const headerTitle = useMemo(
		() => route.params?.headerTitle ?? 'Add Instant Payments',
		[route.params?.headerTitle],
	);

	const savingsAmount = totalBalance - spendingAmount;
	const spendingPercentage =
		totalBalance > 0 ? Math.round((spendingAmount / totalBalance) * 100) : 0;
	const savingsPercentage =
		totalBalance > 0 ? Math.round((savingsAmount / totalBalance) * 100) : 0;

	const handleChange = useCallback((v) => {
		setSpendingAmount(Math.round(v));
	}, []);

	const spendingLimit = useMemo(() => {
		const spendableBalance = Math.round(currentBalance.satoshis / 1.2);
		const convertedUnit = convertCurrency({
			amount: 999,
			from: 'USD',
			to: selectedCurrency,
		});
		const maxSpendingLimit =
			fiatToBitcoinUnit({
				fiatValue: convertedUnit.fiatValue,
				bitcoinUnit: 'satoshi',
			}) ?? 0;
		if (!maxSpendingLimit) {
			return spendableBalance;
		}
		return spendableBalance < maxSpendingLimit
			? spendableBalance
			: maxSpendingLimit;
	}, [currentBalance.satoshis, selectedCurrency]);

	useEffect(() => {
		setTotalBalance(spendingLimit);
	}, [
		blocktankService.max_chan_spending,
		currentBalance.satoshis,
		spendingLimit,
	]);

	useFocusEffect(
		useCallback(() => {
			resetOnChainTransaction({ selectedNetwork, selectedWallet });
			setupOnChainTransaction({
				selectedNetwork,
				selectedWallet,
				rbf: false,
			}).then();
		}, [selectedNetwork, selectedWallet]),
	);

	const onContinuePress = useCallback(async (): Promise<void> => {
		setLoading(true);
		const localBalance =
			Math.round(spendingAmount * 1.1) > blocktankService.min_channel_size
				? Math.round(spendingAmount * 1.1)
				: blocktankService.min_channel_size;
		const purchaseResponse = await startChannelPurchase({
			selectedNetwork,
			selectedWallet,
			productId,
			remoteBalance: spendingAmount,
			localBalance,
			channelExpiry: 12,
		});
		if (purchaseResponse.isErr()) {
			showErrorNotification({
				title: 'Channel Purchase Error',
				message: purchaseResponse.error.message,
			});
			setLoading(false);
			return;
		}
		setLoading(false);
		navigation.push('QuickConfirm', {
			spendingAmount,
			total: totalBalance,
			orderId: purchaseResponse.value,
		});
	}, [
		blocktankService.min_channel_size,
		navigation,
		productId,
		selectedNetwork,
		selectedWallet,
		spendingAmount,
		totalBalance,
	]);

	return (
		<GlowingBackground topLeft={colors.purple}>
			<SafeAreaInsets type="top" />
			<NavigationHeader
				title={headerTitle}
				onClosePress={(): void => {
					navigation.navigate('Tabs');
				}}
			/>
			<View style={styles.root}>
				<View>
					{keybrd ? (
						<Display color="purple">Spending{'\n'}Money.</Display>
					) : (
						<Display color="purple">Spending{'\n'}Balance.</Display>
					)}
					{keybrd ? (
						<Text01S color="gray1" style={styles.text}>
							Enter the amount of money you want to be able to spend instantly.
						</Text01S>
					) : (
						<Text01S color="gray1" style={styles.text}>
							Choose how much bitcoin you want to be able to spend instantly and
							how much you want to keep in savings.
						</Text01S>
					)}
				</View>

				{!keybrd && (
					<>
						<View style={styles.grow1} />
						<AnimatedView
							color="transparent"
							entering={FadeIn}
							exiting={FadeOut}>
							<View style={styles.row}>
								<Caption13Up color="purple">SPENDING</Caption13Up>
								<Caption13Up color="purple">SAVINGS</Caption13Up>
							</View>
							<View style={styles.sliderContainer}>
								<FancySlider
									minimumValue={0}
									maximumValue={totalBalance}
									value={spendingAmount}
									onValueChange={handleChange}
								/>
							</View>
							<View style={styles.row}>
								<Percentage value={spendingPercentage} type="spendings" />
								<Percentage value={savingsPercentage} type="savings" />
							</View>
						</AnimatedView>
						<View style={styles.grow2} />
					</>
				)}

				<View>
					<View style={styles.amountBig}>
						<View>
							{!keybrd && (
								<Caption13Up color="purple" style={styles.amountBigCaption}>
									SPENDING BALANCE
								</Caption13Up>
							)}
							<AmountToggle
								sats={spendingAmount}
								onPress={(): void => setKeybrd(true)}
							/>
						</View>
					</View>

					{!keybrd && (
						<AnimatedView
							color="transparent"
							entering={FadeIn}
							exiting={FadeOut}>
							<Button
								loading={loading}
								text="Continue"
								size="large"
								onPress={onContinuePress}
							/>
							<SafeAreaInsets type="bottom" />
						</AnimatedView>
					)}
				</View>

				{keybrd && (
					<NumberPadLightning
						sats={spendingAmount}
						onChange={setSpendingAmount}
						onMaxPress={(): void => {
							setSpendingAmount(totalBalance);
						}}
						onDone={(): void => {
							if (spendingAmount > totalBalance) {
								setSpendingAmount(totalBalance);
							}
							setKeybrd(false);
						}}
						style={styles.numberpad}
					/>
				)}
			</View>
		</GlowingBackground>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		justifyContent: 'space-between',
		marginTop: 8,
		marginBottom: 16,
		paddingHorizontal: 16,
	},
	text: {
		marginTop: 8,
		marginBottom: 8,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginVertical: 4,
	},
	sliderContainer: {
		marginTop: 24,
		marginBottom: 16,
	},
	amountBig: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 32,
	},
	amountBigCaption: {
		marginBottom: 4,
	},
	pRoot: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	pText: {
		marginLeft: 8,
		paddingTop: Platform.OS === 'android' ? 20 : 0,
	},
	numberpad: {
		marginHorizontal: -16,
	},
	grow1: {
		flexGrow: 1,
	},
	grow2: {
		flexGrow: 2,
	},
});

export default QuickSetup;
