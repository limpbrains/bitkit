import b4a from 'b4a';
import { SlashFeedJSON } from '../../store/types/widgets';

export enum SUPPORTED_FEED_TYPES {
	PRICE_FEED = 'exchange.price_history',
	HEADLINES_FEED = 'news.headlines',
	BLOCKS_FEED = 'bitcoin.stats',
}

/**
 * Decode field value according to the feed type, and field name.
 * For unknown types or fields, it will decode using utf-8
 * and limit to 35 character (feel free to change or remove that limit in the future)
 */
export const decodeWidgetFieldValue = (
	type: string,
	field: SlashFeedJSON['field'][0],
	buf: Uint8Array,
): any => {
	switch (type) {
		case SUPPORTED_FEED_TYPES.PRICE_FEED:
			let value: number;

			try {
				value = buf && JSON.parse(b4a.toString(buf));

				const currency = field.quote;

				return new Intl.NumberFormat('en-US', {
					style: 'currency',
					currency:
						currency === 'EUT' ? 'EUR' : currency === 'UST' ? 'USD' : currency,
				})
					.formatToParts(value)
					.reduce(
						(prev, part) =>
							['currency', 'integer', 'group'].includes(part.type)
								? prev + part.value
								: prev,
						'',
					);
			} catch (error) {
				return error.message;
			}

		case SUPPORTED_FEED_TYPES.BLOCKS_FEED:
			const json = buf && JSON.parse(b4a.toString(buf));

			if (field.name === 'Last Block') {
				const format = new Intl.NumberFormat('en-US').format;
				// TODO: use a better formatter
				const formatDate = (date: Date): string => date.toLocaleString();

				return {
					height: json.height ? format(json.height) : '',
					transacionCount: json.transactionCount
						? format(json.transactionCount) + ' txs'
						: '',
					size: json.size ? format(json.size) + 'Kb' : '',
					time: json.timestamp && formatDate(new Date(json.timestamp * 1000)),
				};
			}

			return json;

		default:
			return buf && b4a.toString(buf).slice(0, 35);
	}
};
