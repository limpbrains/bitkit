import React, { ReactElement, memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { TouchableOpacity, Text02M, XIcon } from '../styles/components';

interface ITag {
	value: string;
	style?: {};
	onPress?: Function;
	onClose?: Function;
}
const Tag = ({ value, style, onPress, onClose }: ITag): ReactElement => {
	const tagStyle = useMemo(
		() => StyleSheet.compose(styles.root, style),
		[style],
	);

	return (
		<TouchableOpacity color="transparent" style={tagStyle} onPress={onPress}>
			<Text02M style={styles.text}>{value}</Text02M>
			{onClose && (
				<TouchableOpacity
					color="transparent"
					onPress={onClose}
					style={styles.close}>
					<XIcon color="gray1" width={16} />
				</TouchableOpacity>
			)}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	root: {
		height: 32,
		borderWidth: 1,
		borderRadius: 8,
		borderColor: 'rgba(255, 255, 255, 0.16)',
		flexDirection: 'row',
		alignItems: 'center',
	},
	close: {
		marginLeft: -12,
		paddingLeft: 12,
		paddingRight: 15,
		alignSelf: 'stretch',
		justifyContent: 'center',
	},
	text: {
		marginHorizontal: 12,
	},
});

export default memo(Tag);
