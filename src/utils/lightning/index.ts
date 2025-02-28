import { err, ok, Result } from '@synonymdev/result';
import lm, {
	DefaultTransactionDataShape,
	EEventTypes,
	ENetworks,
	TAccount,
	TAccountBackup,
	TChannel,
	TChannelManagerPayment,
	TChannelManagerPaymentSent,
	TCloseChannelReq,
	THeader,
	TInvoice,
	TPaymentReq,
	TTransactionData,
	TTransactionPosition,
} from '@synonymdev/react-native-ldk';
import ldk from '@synonymdev/react-native-ldk/dist/ldk';
import {
	getBlockHashFromHeight,
	getBlockHeader,
	getBlockHex,
	getScriptPubKeyHistory,
	getTransactionMerkle,
	getTransactions,
} from '../wallet/electrum';
import {
	getBalance,
	getMnemonicPhrase,
	getReceiveAddress,
	getSelectedNetwork,
	getSelectedWallet,
} from '../wallet';
import Keychain from 'react-native-keychain';
import { TAvailableNetworks } from '../networks';
import { getStore } from '../../store/helpers';
import * as bitcoin from 'bitcoinjs-lib';
import { header as defaultHeader } from '../../store/shapes/wallet';
import {
	addLightningPayment,
	updateClaimableBalance,
	updateLightningChannels,
	updateLightningNodeId,
	updateLightningNodeVersion,
} from '../../store/actions/lightning';
import { promiseTimeout, reduceValue, sleep } from '../helpers';
import { broadcastTransaction } from '../wallet/transactions';
import RNFS from 'react-native-fs';
import { EmitterSubscription } from 'react-native';
import { EActivityTypes, IActivityItem } from '../../store/types/activity';
import { addActivityItem } from '../../store/actions/activity';
import {
	EPaymentType,
	ETransactionDefaults,
	IWalletItem,
} from '../../store/types/wallet';
import { toggleView } from '../../store/actions/user';
import { updateSlashPayConfig } from '../slashtags';
import { sdk } from '../../components/SlashtagsProvider';
import { showSuccessNotification } from '../notifications';

export const DEFAULT_LIGHTNING_PEERS: IWalletItem<string[]> = {
	bitcoin: [
		'03cde60a6323f7122d5178255766e38114b4722ede08f7c9e0c5df9b912cc201d6@34.65.85.39:9745',
		'033d8656219478701227199cbd6f670335c8d408a92ae88b962c49d4dc0e83e025@34.65.85.39:9735',
		'035e4ff418fc8b5554c5d9eea66396c227bd429a3251c8cbc711002ba215bfc226@170.75.163.209:9735',
		'03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f@3.33.236.230:9735',
		'038fe1bd966b5cb0545963490c631eaa1924e2c4c0ea4e7dcb5d4582a1e7f2f1a5@144.76.24.71:9735',
	],
	bitcoinRegtest: [],
	bitcoinTestnet: [],
};

let paymentSubscription: EmitterSubscription | undefined;
let onChannelSubscription: EmitterSubscription | undefined;
/**
 * Wipes LDK data from storage
 * @returns {Promise<Result<string>>}
 */
export const wipeLdkStorage = async ({
	selectedWallet,
	selectedNetwork,
}: {
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): Promise<Result<string>> => {
	if (!selectedWallet) {
		selectedWallet = getSelectedWallet();
	}
	if (!selectedNetwork) {
		selectedNetwork = getSelectedNetwork();
	}

	await ldk.reset();
	const path = `${RNFS.DocumentDirectoryPath}/ldk/${lm.account.name}`;

	try {
		await RNFS.unlink(path);
	} catch (e) {
		return err(e);
	}

	return ok(`${selectedNetwork}'s LDK directory wiped for ${selectedWallet}`);
};

const LDK_ACCOUNT_SUFFIX = 'ldkaccount';

export const setLdkStoragePath = (): Promise<Result<string>> =>
	lm.setBaseStoragePath(`${RNFS.DocumentDirectoryPath}/ldk/`);

/**
 * Used to spin-up LDK services.
 * In order, this method:
 * 1. Fetches and sets the genesis hash.
 * 2. Retrieves and sets the seed from storage.
 * 3. Starts ldk with the necessary params.
 * 5. Syncs LDK.
 */
export const setupLdk = async ({
	selectedWallet,
	selectedNetwork,
	shouldRefreshLdk = true,
}: {
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
	shouldRefreshLdk?: boolean;
}): Promise<Result<string>> => {
	try {
		if (!selectedWallet) {
			selectedWallet = getSelectedWallet();
		}
		if (!selectedNetwork) {
			selectedNetwork = getSelectedNetwork();
		}
		await ldk.reset();
		const genesisHash = await getBlockHashFromHeight({
			height: 0,
		});
		if (genesisHash.isErr()) {
			return err(genesisHash.error.message);
		}
		const account = await getAccount({ selectedWallet });
		if (account.isErr()) {
			return err(account.error.message);
		}
		let network: ENetworks;
		switch (selectedNetwork) {
			case 'bitcoin':
				network = ENetworks.mainnet;
				break;
			case 'bitcoinTestnet':
				network = ENetworks.testnet;
				break;
			default:
				network = ENetworks.regtest;
				break;
		}
		const getAddress = async (): Promise<string> => {
			const res = getReceiveAddress({ selectedNetwork, selectedWallet });
			if (res.isOk()) {
				return res.value;
			}
			return '';
		};

		const _broadcastTransaction = async (rawTx: string): Promise<string> => {
			const res = await broadcastTransaction({
				rawTx,
				selectedNetwork,
				selectedWallet,
				subscribeToOutputAddress: false,
			});
			if (res.isErr()) {
				return '';
			}
			return res.value;
		};
		const storageRes = await setLdkStoragePath();
		if (storageRes.isErr()) {
			return err(storageRes.error);
		}
		const lmStart = await lm.start({
			getBestBlock,
			genesisHash: genesisHash.value,
			account: account.value,
			getAddress,
			getScriptPubKeyHistory,
			broadcastTransaction: _broadcastTransaction,
			getTransactionData,
			getTransactionPosition,
			network,
			feeRate: ETransactionDefaults.recommendedBaseFee,
		});

		if (lmStart.isErr()) {
			return err(lmStart.error.message);
		}

		await ldk.updateFees({
			highPriority: 1250,
			normal: 1250,
			background: 1250,
		});

		const nodeIdRes = await ldk.nodeId();
		if (nodeIdRes.isErr()) {
			return err(nodeIdRes.error.message);
		}

		await Promise.all([
			await updateLightningNodeId({
				nodeId: nodeIdRes.value,
				selectedNetwork,
				selectedWallet,
			}),
			updateLightningNodeVersion(),
		]);
		if (shouldRefreshLdk) {
			await refreshLdk({ selectedWallet, selectedNetwork });
		}

		subscribeToLightningPayments({
			selectedWallet,
			selectedNetwork,
		});

		return ok(nodeIdRes.value);
	} catch (e) {
		return err(e.toString());
	}
};

/**
 * Retrieves any pending/unpaid invoices from the invoices array via payment hash.
 * @param {string} paymentHash
 * @param {string} [selectedWallet]
 * @param {TAvailableNetworks} [selectedNetwork]
 */
export const getPendingInvoice = ({
	paymentHash,
	selectedWallet,
	selectedNetwork,
}: {
	paymentHash: string;
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): Result<TInvoice> => {
	try {
		if (!selectedWallet) {
			selectedWallet = getSelectedWallet();
		}
		if (!selectedNetwork) {
			selectedNetwork = getSelectedNetwork();
		}
		const invoices =
			getStore().lightning.nodes[selectedWallet].invoices[selectedNetwork];
		const invoice = invoices.filter((inv) => inv.payment_hash === paymentHash);
		if (invoice.length > 0) {
			return ok(invoice[0]);
		}
		return err('Unable to find any pending invoices.');
	} catch (e) {
		return err(e);
	}
};

export const handleLightningPaymentSubscription = async ({
	payment,
	selectedWallet,
	selectedNetwork,
}: {
	payment: TChannelManagerPayment;
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): Promise<void> => {
	if (!selectedWallet) {
		selectedWallet = getSelectedWallet();
	}
	if (!selectedNetwork) {
		selectedNetwork = getSelectedNetwork();
	}
	console.log('Receiving Lightning Payment...', payment);
	const invoice = getPendingInvoice({
		paymentHash: payment.payment_hash,
		selectedNetwork,
		selectedWallet,
	});
	if (invoice.isOk()) {
		const value = payment.amount_sat;
		let activityItem: IActivityItem = {
			id: invoice.value.payment_hash,
			message: invoice?.value.description ?? '',
			address: invoice.value.to_str,
			activityType: EActivityTypes.lightning,
			txType: EPaymentType.received,
			value,
			confirmed: true,
			fee: 0,
			timestamp: new Date().getTime(),
		};
		addActivityItem(activityItem);
		await addLightningPayment({
			invoice: invoice.value,
			selectedWallet,
			selectedNetwork,
		});
		toggleView({
			view: 'newTxPrompt',
			data: {
				isOpen: true,
				txid: invoice.value.payment_hash,
			},
		});
		await refreshLdk({ selectedWallet, selectedNetwork });
		updateSlashPayConfig(sdk);
	}
};

/**
 * Subscribes to incoming lightning payments.
 * @param {string} [selectedWallet]
 * @param {TAvailableNetworks} [selectedNetwork]
 */
export const subscribeToLightningPayments = ({
	selectedWallet,
	selectedNetwork,
}: {
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): void => {
	if (!selectedWallet) {
		selectedWallet = getSelectedWallet();
	}
	if (!selectedNetwork) {
		selectedNetwork = getSelectedNetwork();
	}
	if (!paymentSubscription) {
		paymentSubscription = ldk.onEvent(
			EEventTypes.channel_manager_payment_claimed,
			(res: TChannelManagerPayment) => {
				handleLightningPaymentSubscription({
					payment: res,
					selectedNetwork,
					selectedWallet,
				}).then();
			},
		);
	}
	if (!onChannelSubscription) {
		onChannelSubscription = ldk.onEvent(EEventTypes.new_channel, () => {
			showSuccessNotification({
				title: 'Lightning Channel Opened',
				message: 'Congrats! A new lightning channel was successfully opened.',
			});
			refreshLdk({ selectedWallet, selectedNetwork }).then();
		});
	}
};

export const unsubscribeFromLightningSubscriptions = (): void => {
	paymentSubscription && paymentSubscription.remove();
	onChannelSubscription && onChannelSubscription.remove();
};

export const resetLdk = (): void => {
	ldk.reset();
};

/**
 * This method syncs LDK, re-adds peers & updates lightning channels.
 * @param {string} [selectedWallet]
 * @param {TAvailableNetworks} [selectedNetwork]
 * @returns {Promise<Result<string>>}
 */
export const refreshLdk = async ({
	selectedWallet,
	selectedNetwork,
}: {
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): Promise<Result<string>> => {
	try {
		if (!selectedWallet) {
			selectedWallet = getSelectedWallet();
		}
		if (!selectedNetwork) {
			selectedNetwork = getSelectedNetwork();
		}

		const nodeIdRes = await promiseTimeout<Result<string>>(2000, getNodeId());
		if (nodeIdRes.isErr()) {
			// Attempt to reset LDK.
			const setupResponse = await setupLdk({
				selectedNetwork,
				selectedWallet,
				shouldRefreshLdk: false,
			});
			if (setupResponse.isErr()) {
				return err(setupResponse.error.message);
			}
			keepLdkSynced({ selectedNetwork }).then();
		}
		const syncRes = await lm.syncLdk();
		if (syncRes.isErr()) {
			return err(syncRes.error.message);
		}
		await updateLightningChannels({ selectedWallet, selectedNetwork });
		await updateClaimableBalance({ selectedNetwork, selectedWallet });
		await addPeers({ selectedNetwork, selectedWallet });
		return ok('');
	} catch (e) {
		console.log(e);
		return err(e);
	}
};

/**
 * Use Keychain to save LDK name & seed to secure storage.
 * @param {string} name
 * @param {string} seed
 */
export const setAccount = async ({
	name,
	seed,
}: TAccount): Promise<boolean> => {
	try {
		if (!name) {
			name = getSelectedWallet();
			name = `${name}${LDK_ACCOUNT_SUFFIX}`;
		}
		const account: TAccount = {
			name,
			seed,
		};
		const setRes = await Keychain.setGenericPassword(
			name,
			JSON.stringify(account),
			{
				service: name,
			},
		);
		if (!setRes || setRes?.service !== name || setRes?.storage !== 'keychain') {
			return false;
		}
		return true;
	} catch {
		return false;
	}
};

/**
 * Retrieve LDK account info from storage.
 * @param {string} [selectedWallet]
 * @param {TAvailableNetworks} [selectedNetwork]
 */
export const getAccount = async ({
	selectedWallet,
	selectedNetwork,
}: {
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): Promise<Result<TAccount>> => {
	if (!selectedWallet) {
		selectedWallet = getSelectedWallet();
	}
	if (!selectedNetwork) {
		selectedNetwork = getSelectedNetwork();
	}
	const mnemonicPhrase = await getMnemonicPhrase(selectedWallet);
	if (mnemonicPhrase.isErr()) {
		return err(mnemonicPhrase.error.message);
	}
	const name = `${selectedWallet}${selectedNetwork}${LDK_ACCOUNT_SUFFIX}`;
	try {
		let result = await Keychain.getGenericPassword({ service: name });
		if (result && result?.password) {
			// Return existing account.
			return ok(JSON.parse(result?.password));
		} else {
			const defaultAccount = _getDefaultAccount(name, mnemonicPhrase.value);
			// Setup default account.
			const setAccountResponse = await setAccount(defaultAccount);
			if (setAccountResponse) {
				return ok(defaultAccount);
			} else {
				return err('Unable to set LDK account.');
			}
		}
	} catch (e) {
		console.log(e);
		const defaultAccount = _getDefaultAccount(name, mnemonicPhrase.value);
		return ok(defaultAccount);
	}
};
const _getDefaultAccount = (name, mnemonic): TAccount => {
	// @ts-ignore
	const ldkSeed = bitcoin.crypto.sha256(mnemonic).toString('hex');
	return {
		name,
		seed: ldkSeed,
	};
};

/**
 * Exports complete backup string for current LDK account.
 * @param account
 * @returns {Promise<Result<TAccountBackup>>}
 */
export const exportBackup = async (
	account?: TAccount,
): Promise<Result<TAccountBackup>> => {
	if (!account) {
		const res = await getAccount({});
		if (res.isErr()) {
			return err(res.error);
		}

		account = res.value;
	}
	return await lm.backupAccount({
		account,
	});
};

/**
 * Returns last known header information from storage.
 * @returns {Promise<THeader>}
 */
export const getBestBlock = async (
	selectedNetwork?: TAvailableNetworks,
): Promise<THeader> => {
	if (!selectedNetwork) {
		selectedNetwork = getSelectedNetwork();
	}
	try {
		const header = getStore().wallet?.header[selectedNetwork];
		return header?.hash ? header : defaultHeader;
	} catch (e) {
		console.log(e);
		return defaultHeader;
	}
};

/**
 * Returns the transaction header, height and hex (transaction) for a given txid.
 * @param {string} txId
 * @returns {Promise<TTransactionData>}
 */
export const getTransactionData = async (
	txId: string = '',
): Promise<TTransactionData> => {
	let transactionData = DefaultTransactionDataShape;
	try {
		const data = [{ tx_hash: txId }];
		const response = await getTransactions({
			txHashes: data,
		});

		if (response.isErr()) {
			return transactionData;
		}
		const {
			confirmations,
			hex: hex_encoded_tx,
			vout,
		} = response.value.data[0].result;
		const header = getBlockHeader({});
		const currentHeight = header.height;
		let confirmedHeight = 0;
		if (confirmations) {
			confirmedHeight = currentHeight - confirmations + 1;
		}
		const hexEncodedHeader = await getBlockHex({
			height: confirmedHeight,
		});
		if (hexEncodedHeader.isErr()) {
			return transactionData;
		}
		const voutData = vout.map(({ n, value, scriptPubKey: { hex } }) => {
			return { n, hex, value };
		});
		return {
			header: hexEncodedHeader.value,
			height: confirmedHeight,
			transaction: hex_encoded_tx,
			vout: voutData,
		};
	} catch {
		return transactionData;
	}
};

/**
 * Returns the position/index of the provided tx_hash within a block.
 * @param {string} tx_hash
 * @param {number} height
 * @param {TAvailableNetworks} [selectedNetwork]
 * @returns {Promise<number>}
 */
export const getTransactionPosition = async ({
	tx_hash,
	height,
	selectedNetwork,
}: {
	tx_hash: string;
	height: number;
	selectedNetwork?: TAvailableNetworks;
}): Promise<TTransactionPosition> => {
	const response = await getTransactionMerkle({
		tx_hash,
		height,
		selectedNetwork,
	});
	// @ts-ignore
	if (response.error || isNaN(response.data?.pos) || response.data?.pos < 0) {
		return -1;
	}
	// @ts-ignore
	return response.data.pos;
};

/**
 * Returns the current LDK node id.
 * @returns {Promise<Result<string>>}
 */
export const getNodeId = async (): Promise<Result<string>> => {
	try {
		return await ldk.nodeId();
	} catch (e) {
		return err(e);
	}
};

/**
 * Returns the current LDK node id.
 * @param {string} [selectedWallet]
 * @param {TAvailableNetworks} [selectedNetwork]
 * @returns {Promise<Result<string>>}
 */
export const getNodeIdFromStorage = ({
	selectedWallet,
	selectedNetwork,
}: {
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): string => {
	try {
		if (!selectedWallet) {
			selectedWallet = getSelectedWallet();
		}
		if (!selectedNetwork) {
			selectedNetwork = getSelectedNetwork();
		}
		return (
			getStore().lightning.nodes[selectedWallet].nodeId[selectedNetwork] ?? ''
		);
	} catch (e) {
		return '';
	}
};

/**
 * Parses a lightning uri.
 * @param {string} str
 * @returns {{ publicKey: string; ip: string; port: number; }}
 */
export const parseUri = (
	str: string,
): Result<{
	publicKey: string;
	ip: string;
	port: number;
}> => {
	const uri = str.split('@');
	const publicKey = uri[0];
	if (uri.length !== 2) {
		return err('Invalid URI.');
	}
	const parsed = uri[1].split(':');
	if (parsed.length < 2) {
		return err('Invalid URI.');
	}
	const ip = parsed[0];
	const port = Number(parsed[1]);
	return ok({
		publicKey,
		ip,
		port,
	});
};

/**
 * Prompt LDK to add a specified peer.
 * @param {string} peer
 * @param {number} [timeout]
 */
export const addPeer = async ({
	peer,
	timeout = 5000,
}: {
	peer: string;
	timeout?: number;
}): Promise<Result<string>> => {
	const parsedUri = parseUri(peer);
	if (parsedUri.isErr()) {
		return err(parsedUri.error.message);
	}
	return await lm.addPeer({
		pubKey: parsedUri.value.publicKey,
		address: parsedUri.value.ip,
		port: parsedUri.value.port,
		timeout,
	});
};

/**
 * Returns previously saved lightning peers from storage. (Excludes Blocktank and other default lightning peers.)
 * @param {string} [selectedWallet]
 * @param {TAvailableNetworks} [selectedNetwork]
 */
export const getCustomLightningPeers = ({
	selectedWallet,
	selectedNetwork,
}: {
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): string[] => {
	if (!selectedWallet) {
		selectedWallet = getSelectedWallet();
	}
	if (!selectedNetwork) {
		selectedNetwork = getSelectedNetwork();
	}
	const peers = getStore().lightning.nodes[selectedWallet]?.peers;
	if (peers && selectedNetwork in peers) {
		return peers[selectedNetwork];
	}
	return [];
};

/**
 * Adds blocktank, default, and all custom lightning peers.
 * @returns {Promise<Result<string[]>>}
 */
export const addPeers = async ({
	selectedWallet,
	selectedNetwork,
}: {
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): Promise<Result<string[]>> => {
	try {
		const nodeUris = getStore().blocktank?.info?.node_info?.uris;
		if (!nodeUris) {
			return err('No peers available to add.');
		}
		if (!selectedWallet) {
			selectedWallet = getSelectedWallet();
		}
		if (!selectedNetwork) {
			selectedNetwork = getSelectedNetwork();
		}
		const blocktankLightningPeers = nodeUris;
		const defaultLightningPeers = DEFAULT_LIGHTNING_PEERS[selectedNetwork];
		const customLightningPeers = getCustomLightningPeers({
			selectedNetwork,
			selectedWallet,
		});
		const peers = [
			...defaultLightningPeers,
			...blocktankLightningPeers,
			...customLightningPeers,
		];
		const addPeerRes = await Promise.all(
			peers.map(async (peer) => {
				const addPeerResponse = await addPeer({
					peer,
					timeout: 5000,
				});
				if (addPeerResponse.isErr()) {
					console.log(addPeerResponse.error.message);
					return addPeerResponse.error.message;
				}
				return addPeerResponse.value;
			}),
		);
		return ok(addPeerRes);
	} catch (e) {
		console.log(e);
		return err(e);
	}
};

/**
 * Returns an array of pending and open channels
 * @returns Promise<Result<TChannel[]>>
 */
export const getLightningChannels = ldk.listChannels;

/**
 * Returns an array of unconfirmed/pending lightning channels from either storage or directly from the LDK node.
 * @param {boolean} [fromStorage]
 * @param {string} [selectedWallet]
 * @param {TAvailableNetworks} [selectedNetwork]
 * @returns {Promise<Result<TChannel[]>>}
 */
export const getPendingChannels = async ({
	fromStorage = false,
	selectedWallet,
	selectedNetwork,
}: {
	fromStorage?: boolean;
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): Promise<Result<TChannel[]>> => {
	let channels;
	if (fromStorage) {
		if (!selectedWallet) {
			selectedWallet = getSelectedWallet();
		}
		if (!selectedNetwork) {
			selectedNetwork = getSelectedNetwork();
		}
		channels =
			getStore().lightning.nodes[selectedWallet].channels[selectedNetwork];
	} else {
		channels = await getLightningChannels();
		if (channels.isErr()) {
			return err(channels.error.message);
		}
	}
	const pendingChannels = channels.value.filter(
		(channel) => !channel?.is_channel_ready,
	);
	return ok(pendingChannels);
};

/**
 * Returns an array of confirmed/open lightning channels from either storage or LDK directly..
 * @returns {Promise<Result<TChannel[]>>}
 */
export const getOpenChannels = async ({
	fromStorage = false,
	selectedWallet,
	selectedNetwork,
}: {
	fromStorage?: boolean;
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): Promise<Result<TChannel[]>> => {
	let channels: TChannel[];
	if (fromStorage) {
		if (!selectedWallet) {
			selectedWallet = getSelectedWallet();
		}
		if (!selectedNetwork) {
			selectedNetwork = getSelectedNetwork();
		}
		channels = Object.values(
			getStore().lightning.nodes[selectedWallet].channels[selectedNetwork],
		);
	} else {
		const getChannelsResponse = await getLightningChannels();
		if (getChannelsResponse.isErr()) {
			return err(getChannelsResponse.error.message);
		}
		channels = getChannelsResponse.value;
	}
	const openChannels = Object.values(channels).filter(
		(channel) => channel?.is_channel_ready,
	);
	return ok(openChannels);
};

/**
 * Returns LDK and c-bindings version.
 * @returns {Promise<Result<{ c_bindings: string; ldk: string }>}
 */
export const getNodeVersion = ldk.version;

/**
 * Attempts to close a channel given its channelId and counterPartyNodeId.
 * @param {string} channelId
 * @param {string} counterPartyNodeId
 * @param {boolean} [force]
 */
export const closeChannel = async ({
	channelId,
	counterPartyNodeId,
	force = false,
}: TCloseChannelReq): Promise<Result<string>> => {
	try {
		// Ensure we're fully up-to-date.
		await refreshLdk({});
		return await ldk.closeChannel({ channelId, counterPartyNodeId, force });
	} catch (e) {
		console.log(e);
		return err(e);
	}
};

/**
 * Attempts to create a bolt11 invoice.
 * @param {TCreatePaymentReq}
 * @returns {Promise<Result<TInvoice>>}
 */
export const createPaymentRequest = ldk.createPaymentRequest;

/**
 * Attempts to pay a bolt11 invoice.
 * @param {string} invoice
 * @param {number} [sats]
 * @returns {Promise<Result<string>>}
 */
export const payLightningInvoice = async (
	invoice: string,
	sats?: number,
): Promise<Result<TChannelManagerPaymentSent>> => {
	try {
		const addPeersResponse = await addPeers({});
		if (addPeersResponse.isErr()) {
			return err(addPeersResponse.error.message);
		}
		const decodedInvoice = await decodeLightningInvoice({
			paymentRequest: invoice,
		});
		if (decodedInvoice.isErr()) {
			return err(decodedInvoice.error.message);
		}

		const payResponse = await lm.payWithTimeout({
			paymentRequest: invoice,
			amountSats: sats ?? 0,
			timeout: 30000,
		});
		if (payResponse.isErr()) {
			return err(payResponse.error.message);
		}
		const addLightningPaymentResponse = addLightningPayment({
			invoice: decodedInvoice.value,
		});
		if (addLightningPaymentResponse.isErr()) {
			return err(addLightningPaymentResponse.error.message);
		}
		let value = decodedInvoice.value.amount_satoshis ?? 0;
		if (sats) {
			value = sats;
		}
		let activityItem: IActivityItem = {
			id: decodedInvoice.value.payment_hash,
			message: decodedInvoice?.value.description ?? '',
			address: invoice,
			activityType: EActivityTypes.lightning,
			txType: EPaymentType.sent,
			value: -value,
			confirmed: true,
			fee: payResponse.value.fee_paid_sat,
			timestamp: new Date().getTime(),
		};
		addActivityItem(activityItem);
		refreshLdk({}).then();
		return ok(payResponse.value);
	} catch (e) {
		console.log(e);
		return err(e);
	}
};

export const decodeLightningInvoice = ({
	paymentRequest = '',
}: TPaymentReq): Promise<Result<TInvoice>> => {
	paymentRequest = paymentRequest.replace('lightning:', '').trim();
	return ldk.decode({ paymentRequest });
};

/**
 * Attempts to keep LDK in sync every 2-minutes.
 * @param {number} frequency
 * @param {string} [selectedWallet]
 * @param {TAvailableNetworks} [selectedNetwork]
 */
export const keepLdkSynced = async ({
	frequency = 120000,
	selectedWallet,
	selectedNetwork,
}: {
	frequency?: number;
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): Promise<void> => {
	if (!selectedWallet) {
		selectedWallet = getSelectedWallet();
	}
	if (!selectedNetwork) {
		selectedNetwork = getSelectedNetwork();
	}

	let error: string = '';
	while (!error) {
		const syncRes = await refreshLdk({ selectedNetwork, selectedWallet });
		if (!syncRes) {
			error = 'Unable to refresh LDK.';
			break;
		}
		await sleep(frequency);
	}
};

/**
 * Returns whether the user has any open lightning channels.
 * @param {string} [selectedWallet]
 * @param {TAvailableNetworks} [selectedNetwork]
 * @returns {boolean}
 */
export const hasOpenLightningChannels = ({
	selectedWallet,
	selectedNetwork,
}: {
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): boolean => {
	if (!selectedWallet) {
		selectedWallet = getSelectedWallet();
	}
	if (!selectedNetwork) {
		selectedNetwork = getSelectedNetwork();
	}
	const availableChannels =
		getStore().lightning.nodes[selectedWallet].openChannelIds[selectedNetwork];
	return availableChannels.length > 0;
};

export const rebroadcastAllKnownTransactions = async (): Promise<any> => {
	return await lm.rebroadcastAllKnownTransactions();
};

/**
 * Returns total reserve balance for all open lightning channels.
 * @param {string} [selectedWallet]
 * @param {TAvailableNetworks} [selectedNetwork]
 * @returns {Promise<number>}
 */
export const getLightningReserveBalance = async ({
	selectedWallet,
	selectedNetwork,
}: {
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): Promise<number> => {
	if (!selectedWallet) {
		selectedWallet = getSelectedWallet();
	}
	if (!selectedNetwork) {
		selectedNetwork = getSelectedNetwork();
	}
	const node = getStore().lightning.nodes[selectedWallet];
	const openChannelIds = node.openChannelIds[selectedNetwork];
	const channels = node.channels[selectedNetwork];
	const openChannels = Object.values(channels).filter((channel) =>
		openChannelIds.includes(channel.channel_id),
	);
	const reserveBalances = reduceValue({
		arr: openChannels,
		value: 'unspendable_punishment_reserve',
	});
	if (reserveBalances.isErr()) {
		return 0;
	}
	return reserveBalances.value;
};

/**
 * Returns the claimable balance for all lightning channels.
 * @param {boolean} [ignoreOpenChannels]
 * @param {string} [selectedWallet]
 * @param {TAvailableNetworks} [selectedNetwork]
 * @returns {Promise<number>}
 */
export const getClaimableBalance = async ({
	ignoreOpenChannels = true,
	selectedWallet,
	selectedNetwork,
}: {
	ignoreOpenChannels?: boolean;
	selectedWallet?: string;
	selectedNetwork?: TAvailableNetworks;
}): Promise<number> => {
	if (!selectedWallet) {
		selectedWallet = getSelectedWallet();
	}
	if (!selectedNetwork) {
		selectedNetwork = getSelectedNetwork();
	}
	const lightningBalance = getBalance({
		lightning: true,
		selectedWallet,
		selectedNetwork,
		subtractReserveBalance: false,
	});
	const claimableBalanceRes = await ldk.claimableBalances(ignoreOpenChannels);
	if (claimableBalanceRes.isErr()) {
		return 0;
	}
	const claimableBalance = reduceValue({
		arr: claimableBalanceRes.value,
		value: 'claimable_amount_satoshis',
	});
	if (claimableBalance.isErr()) {
		return 0;
	}
	return Math.abs(lightningBalance.satoshis - claimableBalance.value);
};
