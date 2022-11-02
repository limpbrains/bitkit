import React, { memo, ReactElement, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import b4a from 'b4a';

import { View, Text01M, Caption13M, ChartLineIcon } from '../styles/components';
import useColors from '../hooks/colors';
import { BaseFeedWidget } from './FeedWidget';
import { IWidget } from '../store/types/widgets';
import { useFeedWidget } from '../hooks/widgets';

const BitfinexWidget = ({
	url,
	widget,
}: {
	url: string;
	widget: IWidget;
}): ReactElement => {
	const { value, drive } = useFeedWidget({ url, feed: widget.feed });
	const [pastValues, setPastValues] = useState<number[]>([]);

	const period: '24h' | '7d' | '30d' = '24h';

	useEffect(() => {
		let unmounted = false;

		if (!drive) {
			return;
		}
		drive
			.get(widget.feed.field.files[period])
			.then((buf: Uint8Array) => {
				const string = buf && b4a.toString(buf);
				const values = JSON.parse(string).map(Number);
				!unmounted && values && setPastValues(values);
			})
			.catch(noop);

		return function cleanup() {
			unmounted = true;
		};
	}, [drive, widget.feed.field.files, period]);

	const change = useMemo(() => {
		if (!pastValues || pastValues.length < 2) {
			return { color: 'green', formatted: '+0%' };
		}
		const _change = pastValues[pastValues.length - 1] / pastValues[0] - 1;

		const sign = _change >= 0 ? '+' : '';
		const color = _change >= 0 ? 'green' : 'red';

		return {
			color,
			formatted: sign + (_change * 100).toFixed(2) + '%',
		};
	}, [pastValues]);

	return (
		<BaseFeedWidget
			url={url}
			name="Bitcoin Price"
			label={widget.feed.field.name}
			icon={<ChartLineIcon width={32} height={32} />}
			middle={<></>}
			right={
				<View style={styles.numbers}>
					<Text01M numberOfLines={1} styles={styles.price}>
						{value}
					</Text01M>
					<Caption13M color={change.color} styles={styles.change}>
						{change.formatted}
					</Caption13M>
				</View>
			}
		/>
	);
};

const styles = StyleSheet.create({
	chart: {
		flex: 1,
		minHeight: 40, // static width + height is really important to avoid rerenders of chart
	},
	numbers: {
		alignItems: 'flex-end',
	},
	price: {
		lineHeight: 22,
	},
	change: {
		lineHeight: 18,
	},
	canvas: {
		flex: 1,
	},
});

export default memo(BitfinexWidget);

function noop(): void {}
