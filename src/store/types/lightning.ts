import { EPaymentType, IWalletItem } from './wallet';
import {
	TChannel,
	TCreatePaymentReq,
	TInvoice,
} from '@synonymdev/react-native-ldk';
import { TAvailableNetworks } from '../../utils/networks';

export type IInvoice = {
	[key: string]: TInvoice;
};

export type TCreateLightningInvoice = TCreatePaymentReq & {
	selectedNetwork?: TAvailableNetworks;
	selectedWallet?: string;
};

export type TLightningPayment = {
	invoice: TInvoice;
	type: EPaymentType;
};

export interface IDefaultLightningShape {
	nodeId: IWalletItem<string>;
	channels: IWalletItem<{ [key: string]: TChannel } | {}>;
	openChannelIds: IWalletItem<string[]>;
	info: IWalletItem<{}>;
	invoices: IWalletItem<TInvoice[]> | IWalletItem<[]>;
	payments: IWalletItem<{ [key: string]: TLightningPayment }> | IWalletItem<{}>;
	peers: IWalletItem<string[]>;
	claimableBalance: IWalletItem<number>;
}

export interface ILightning {
	version: TLightningNodeVersion;
	nodes: {
		[key: string]: IDefaultLightningShape;
	};
}

export type TLightningNodeVersion = {
	ldk: string;
	c_bindings: string;
};

export type TUseChannelBalance = {
	spendingTotal: number; // How many sats the user has reserved in the channel. (Outbound capacity + Punishment Reserve)
	spendingAvailable: number; // How much the user is able to spend from a channel. (Outbound capacity - Punishment Reserve)
	receivingTotal: number; // How many sats the counterparty has reserved in the channel. (Inbound capacity + Punishment Reserve)
	receivingAvailable: number; // How many sats the user is able to receive in a channel. (Inbound capacity - Punishment Reserve)
	capacity: number; // Total capacity of the channel. (spendingTotal + receivingTotal)
};
