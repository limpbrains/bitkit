import bt, {
	IBuyChannelRequest,
	IBuyChannelResponse,
	IFinalizeChannelResponse,
	IGetInfoResponse,
	IGetOrderResponse,
	IService,
} from '@synonymdev/blocktank-client';
import { TAvailableNetworks } from '../networks';
import { err, ok, Result } from '@synonymdev/result';
import { getNodeId, refreshLdk } from '../lightning';
import { refreshOrder } from '../../store/actions/blocktank';
import { sleep } from '../helpers';
import { getStore } from '../../store/helpers';
import { showSuccessNotification } from '../notifications';
import { TGeoBlockResponse } from '../../store/types/blocktank';
import { setGeoBlock, updateUser } from '../../store/actions/user';
import { fiatToBitcoinUnit, getFiatDisplayValues } from '../exchange-rate';
import { getBalance } from '../wallet';
import { IDisplayValues, IFiatDisplayValues } from '../exchange-rate/types';

/**
 * Sets the selectedNetwork for Blocktank.
 * @param {TAvailableNetworks} selectedNetwork
 * @returns {void}
 */
export const setupBlocktank = (selectedNetwork: TAvailableNetworks): void => {
	if (selectedNetwork === 'bitcoinTestnet') {
		return;
	} else if (selectedNetwork === 'bitcoinRegtest') {
		updateUser({ isGeoBlocked: false });
		bt.setNetwork('regtest');
	} else {
		setGeoBlock().then();
		bt.setNetwork('mainnet');
	}
};

/**
 * @returns {Promise<IGetInfoResponse>}
 */
export const getBlocktankInfo = (): Promise<IGetInfoResponse> => {
	return bt.getInfo();
};

/**
 * @returns {Promise<Result<IService[]>>}
 */
export const getAvailableServices = async (): Promise<Result<IService[]>> => {
	try {
		// Get all node info and available services
		const info = await bt.getInfo();
		if (
			info?.services &&
			Array.isArray(info.services) &&
			info.services.length > 0
		) {
			return ok(info.services);
		}
		return err('Unable to provide services from Blocktank at this time.');
	} catch (e) {
		return err(e);
	}
};

/**
 * @param {IBuyChannelRequest} data
 * @returns {Promise<Result<IBuyChannelResponse>>}
 */
export const buyChannel = async (
	data: IBuyChannelRequest,
): Promise<Result<IBuyChannelResponse>> => {
	try {
		const buyRes = await bt.buyChannel(data);
		return ok(buyRes);
	} catch (e) {
		console.log(e);
		return err(e);
	}
};

/**
 * @param {string} orderId
 * @returns {Promise<Result<IGetOrderResponse>>}
 */
export const getOrder = async (
	orderId: string,
): Promise<Result<IGetOrderResponse>> => {
	try {
		const orderState = await bt.getOrder(orderId);
		return ok(orderState);
	} catch (e) {
		return err(e);
	}
};

/**
 * Returns the data of a provided orderId from storage.
 * @param {string} orderId
 * @returns {Promise<Result<IGetOrderResponse>>}
 */
export const getOrderFromStorage = async (
	orderId: string,
): Promise<Result<IGetOrderResponse>> => {
	try {
		const order = getStore().blocktank.orders.filter((o) => o._id === orderId);
		if (order?.length > 0) {
			return ok(order[0]);
		}
		return err('Order not found.');
	} catch (e) {
		return err(e);
	}
};

/**
 * Attempts to finalize a pending channel open with Blocktank for the provided orderId.
 * @param {string} orderId
 * @returns {Promise<Result<IFinalizeChannelResponse>>}
 */
export const finalizeChannel = async (
	orderId: string,
): Promise<Result<IFinalizeChannelResponse>> => {
	try {
		const nodeId = await getNodeId();
		if (nodeId.isErr()) {
			return err(nodeId.error.message);
		}
		//Attempt to sync and re-add peers prior to channel open.
		await refreshLdk({});

		const params = {
			order_id: orderId,
			node_uri: nodeId.value,
			private: true,
		};
		const finalizeChannelResponse = await bt.finalizeChannel(params);
		if (finalizeChannelResponse) {
			showSuccessNotification({
				title: 'Lightning Channel Finalized',
				message: 'Blocktank will open a channel shortly...',
			});
			return ok(finalizeChannelResponse);
		}
		return err('Unable to finalize the Blocktank channel.');
	} catch (e) {
		console.log(e);
		return err(e);
	}
};

/**
 * This method will watch and update any pending Blocktank orders.
 * @returns {void}
 */
export const watchPendingOrders = (): void => {
	const pendingOrders = getPendingOrders() ?? [];
	pendingOrders.forEach((order) => watchOrder(order._id));
};

/**
 * Return orders that are below the specified state and not expired.
 * @param pendingOrderState
 */
export const getPendingOrders = (
	pendingOrderState = 300,
): IGetOrderResponse[] => {
	const orders = getStore().blocktank.orders;
	return orders.filter(
		(order) =>
			order.state <= pendingOrderState &&
			order.order_expiry > new Date().getTime(),
	);
};

/**
 * Continuously checks a given order until it is finalized, the response errors out or the order expires.
 * @param {string} orderId
 * @param {number} [frequency]
 */
export const watchOrder = async (
	orderId: string,
	frequency = 15000,
): Promise<Result<string>> => {
	let orderComplete = false;
	let error: string = '';
	const orderData = await getOrderFromStorage(orderId);
	if (orderData.isErr()) {
		return err(orderData.error.message);
	}
	const expiry = orderData.value.order_expiry;
	while (!orderComplete && !error) {
		const res = await refreshOrder(orderId);
		if (res.isErr()) {
			error = res.error.message;
			break;
		}
		if (res.value.state >= 200) {
			orderComplete = true;
			break;
		}
		if (new Date().getTime() >= expiry) {
			error = 'Order has expired.';
			break;
		}
		await sleep(frequency);
	}
	return ok(`Watching order (${orderId}) until it expires at ${expiry}`);
};

/**
 * @param code
 * @returns {string}
 */
export const getStateMessage = (code: number): string => {
	switch (code) {
		case 0:
			return 'Awaiting payment';
		case 100:
			return 'Paid';
		case 150:
			return 'Payment refunded';
		case 200:
			return 'Queued for opening';
		case 300:
			return 'Channel opening';
		case 350:
			return 'Channel closing';
		case 400:
			return 'Given up';
		case 410:
			return 'Order expired';
		case 450:
			return 'Channel closed';
		case 500:
			return 'Channel open';
	}

	return `Unknown code: ${code}`;
};

export const isGeoBlocked = async (): Promise<boolean> => {
	try {
		const response = await fetch(
			'https://blocktank.synonym.to/api/v1/channel/geocheck',
		);
		const data: TGeoBlockResponse = await response.json();
		return !!data?.error;
	} catch {
		return true;
	}
};

/**
 * TODO: For Future Use
 * Returns Blocktank spending limits in sats, USD & the user's selectedCurrency.
 * @param selectedCurrency
 */
export const getSpendingLimits = ({
	selectedCurrency,
}: {
	selectedCurrency?: string;
}): {
	currentBalance: IDisplayValues;
	spendableBalanceSats: number;
	spendableBalanceFiat: number;
	usdSpendingLimitFiat: number;
	spendingLimitSats: number;
	selectedCurrencySpendingLimitFiat: number;
} => {
	if (!selectedCurrency) {
		selectedCurrency = getStore().settings.selectedCurrency;
	}
	const usdMax = 1000;
	const denominator = 1.2;

	const currentBalance = getBalance({ onchain: true });
	const spendableBalanceSats = Math.round(
		currentBalance.satoshis / denominator,
	);
	const spendableBalanceFiat = Math.round(
		currentBalance.fiatValue / denominator,
	);
	const usdSpendingLimitFiat =
		spendableBalanceFiat < usdMax ? spendableBalanceFiat : usdMax;
	const spendingLimitSats = fiatToBitcoinUnit({
		fiatValue: usdSpendingLimitFiat,
		bitcoinUnit: 'satoshi',
		currency: 'USD',
	});
	const selectedCurrencySpendingLimitFiat = getFiatDisplayValues({
		satoshis:
			spendableBalanceSats < spendingLimitSats
				? spendableBalanceSats
				: spendingLimitSats,
		bitcoinUnit: 'satoshi',
		currency: selectedCurrency,
	});
	return {
		currentBalance,
		spendableBalanceSats,
		spendableBalanceFiat,
		usdSpendingLimitFiat,
		spendingLimitSats,
		selectedCurrencySpendingLimitFiat:
			selectedCurrencySpendingLimitFiat.fiatValue,
	};
};

export const convertCurrency = ({
	amount,
	from,
	to,
}: {
	amount: number;
	from: string;
	to: string;
}): IFiatDisplayValues => {
	const sats = fiatToBitcoinUnit({
		fiatValue: amount,
		bitcoinUnit: 'satoshi',
		currency: from,
	});
	return getFiatDisplayValues({
		satoshis: sats,
		bitcoinUnit: 'satoshi',
		currency: to,
	});
};
