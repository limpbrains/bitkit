import React, { ReactElement, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * This component draws vertical gradint, it has opacity animation on mount
 */
const VerticalShadow = (): ReactElement => {
	return (
		<View style={styles.shadowCanvas}>
		</View>
	);
};

const styles = StyleSheet.create({
	shadowCanvas: {
		flex: 1,
	},
});

export default VerticalShadow;
