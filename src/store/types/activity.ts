import { EPaymentType } from './wallet';

export enum EActivityTypes {
	lightning = 'lightning',
	onChain = 'onChain',
	tether = 'tether',
	//TODO add all other activity types as we support them
}

export interface IActivityItem {
	id: string;
	value: number;
	fee?: number; //If receiving we might not know the fee
	message: string;
	address?: string;
	activityType: EActivityTypes;
	txType: EPaymentType;
	confirmed: boolean;
	timestamp: number;
}

export interface IActivityItemFormatted extends IActivityItem {
	formattedDate: string;
}

export interface IActivity {
	items: IActivityItem[];
	//TODO set TAvailableNetworks
}
