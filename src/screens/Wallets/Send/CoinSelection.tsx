import React, { ReactElement, memo, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import {
	Caption13Up,
	Subtitle,
	Switch,
	Text01M,
	Text02M,
	View as ThemedView,
} from '../../../styles/components';
import BottomSheetNavigationHeader from '../../../components/BottomSheetNavigationHeader';
import Button from '../../../components/Button';
import Tag from '../../../components/Tag';
import Store from '../../../store/types';
import { useTransactionDetails } from '../../../hooks/transaction';
import useColors from '../../../hooks/colors';
import useDisplayValues from '../../../hooks/displayValues';
import {
	getTotalFee,
	getTransactionInputValue,
	getTransactionOutputValue,
} from '../../../utils/wallet/transactions';
import { addTxInput, removeTxInput } from '../../../store/actions/wallet';
import { IUtxo } from '../../../store/types/wallet';
import type { SendScreenProps } from '../../../navigation/types';

/**
 * Some UTXO's may contain the same tx_hash.
 * So we include the tx_pos to ensure we can quickly distinguish.
 * @param {IUtxo} utxo
 * @return string
 */
const getUtxoKey = (utxo: IUtxo): string => `${utxo.tx_hash}${utxo.tx_pos}`;

const preferences = {
	small: "Small: Use smallest UTXO's first.",
	large: "Large: Use largest UTXO's first.",
	consolidate: "Consolidate: Combine all UTXO's.",
};

const UtxoRow = ({ item, isEnabled, onPress }): ReactElement => {
	const displayValue = useDisplayValues(item.value);
	const { gray4 } = useColors();
	const tags = useSelector((store: Store) => store.metadata.tags[item.tx_hash]);

	return (
		<View style={[styles.coinRoot, { borderBottomColor: gray4 }]}>
			<View>
				<Text01M>{displayValue.bitcoinFormatted}</Text01M>
				<Text02M color="gray">
					{displayValue.fiatSymbol} {displayValue.fiatFormatted}
				</Text02M>
			</View>

			{tags && (
				<ScrollView
					horizontal={true}
					centerContent={true}
					style={styles.coinTagsScroll}>
					{tags.map((t) => (
						<Tag style={styles.tag} key={t} value={t} />
					))}
				</ScrollView>
			)}

			<Switch value={isEnabled} onValueChange={onPress} />
		</View>
	);
};

const CoinSelection = ({
	navigation,
}: SendScreenProps<'CoinSelection'>): ReactElement => {
	const insets = useSafeAreaInsets();
	const { gray4 } = useColors();

	const buttonContainerStyles = useMemo(
		() => ({
			...styles.buttonContainer,
			paddingBottom: insets.bottom + 16,
		}),
		[insets.bottom],
	);
	const selectedWallet = useSelector(
		(store: Store) => store.wallet.selectedWallet,
	);
	const selectedNetwork = useSelector(
		(store: Store) => store.wallet.selectedNetwork,
	);

	const transaction = useTransactionDetails();
	const utxos: IUtxo[] =
		useSelector(
			(state: Store) =>
				state.wallet.wallets[selectedWallet].utxos[selectedNetwork],
		) ?? [];

	const coinSelectPreference = useSelector(
		(state: Store) => state.settings.coinSelectPreference,
	);

	const preference = useMemo(
		() => preferences[coinSelectPreference],
		[coinSelectPreference],
	);

	const inputs = useMemo(() => transaction.inputs ?? [], [transaction.inputs]);

	const [autoSelectionEnabled, setAutoSelectionEnabled] = useState(
		inputs?.length === utxos?.length,
	);

	const txInputValue = useMemo(
		() => getTransactionInputValue({ selectedNetwork, selectedWallet }),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[selectedWallet, selectedNetwork, transaction.inputs],
	);
	const txInputDV = useDisplayValues(txInputValue);
	const inputKeys = useMemo(
		() => inputs.map((input) => getUtxoKey(input)),
		[inputs],
	);

	const txOutputValue = useMemo(() => {
		const amount = getTransactionOutputValue({
			selectedWallet,
			selectedNetwork,
		});
		const fee = getTotalFee({
			satsPerByte: transaction.satsPerByte,
			message: transaction.message,
			selectedWallet,
			selectedNetwork,
		});
		return fee + amount;
	}, [selectedNetwork, selectedWallet, transaction]);
	const txOutputDV = useDisplayValues(txOutputValue);

	const onAutoSelectionPress = (): void => {
		if (autoSelectionEnabled) {
			return setAutoSelectionEnabled(false);
		}

		// If disabled, iterate over all utxos and re-add them to inputs if previously removed.
		utxos.forEach((utxo) => {
			const key = getUtxoKey(utxo);
			const isEnabled = inputKeys.includes(key);
			if (!isEnabled) {
				addTxInput({ input: utxo, selectedWallet, selectedNetwork });
			}
		});
		setAutoSelectionEnabled(true);
	};

	return (
		<ThemedView color="onSurface" style={styles.container}>
			<BottomSheetNavigationHeader title="Coin Selection" />
			<View style={styles.content}>
				<BottomSheetScrollView style={styles.scroll}>
					<View style={[styles.coinRoot, { borderBottomColor: gray4 }]}>
						<View style={styles.coinAmount}>
							<Text01M>Auto</Text01M>
							<Text02M color="gray">{preference}</Text02M>
						</View>
						<Switch
							value={autoSelectionEnabled}
							onValueChange={onAutoSelectionPress}
						/>
					</View>

					{utxos.map((item) => {
						const key = getUtxoKey(item);
						const isEnabled = inputKeys.includes(key);
						const onPress = (): void => {
							if (isEnabled) {
								removeTxInput({ input: item, selectedWallet, selectedNetwork });
							} else {
								addTxInput({ input: item, selectedWallet, selectedNetwork });
							}
							if (autoSelectionEnabled) {
								setAutoSelectionEnabled(false);
							}
						};

						return (
							<UtxoRow
								key={getUtxoKey(item)}
								item={item}
								isEnabled={isEnabled}
								onPress={onPress}
							/>
						);
					})}
				</BottomSheetScrollView>

				<View style={styles.total}>
					<View
						style={[
							styles.totalRow,
							styles.totalBorder,
							{ borderBottomColor: gray4 },
						]}>
						<Caption13Up color="gray1">TOTAL REQUIRED</Caption13Up>
						<Subtitle>{txOutputDV.bitcoinFormatted}</Subtitle>
					</View>
					<View style={styles.totalRow}>
						<Caption13Up color="gray1">TOTAL SELECTED</Caption13Up>
						<Subtitle color="green">{txInputDV.bitcoinFormatted}</Subtitle>
					</View>
				</View>

				<View style={buttonContainerStyles}>
					<Button
						size="large"
						text="Continue"
						disabled={txInputValue < txOutputValue}
						onPress={(): void => navigation.navigate('ReviewAndSend')}
					/>
				</View>
			</View>
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
	scroll: {
		flex: 1,
	},
	coinRoot: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		height: 72,
		borderBottomWidth: 1,
	},
	coinAmount: {},
	coinTagsScroll: {
		marginHorizontal: 8,
		flexDirection: 'row',
		overflow: 'hidden',
	},
	tag: {
		marginHorizontal: 4,
	},
	total: {
		marginVertical: 16,
	},
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
	},
	totalBorder: {
		borderBottomWidth: 1,
	},
	buttonContainer: {
		marginTop: 'auto',
	},
});

export default memo(CoinSelection);
