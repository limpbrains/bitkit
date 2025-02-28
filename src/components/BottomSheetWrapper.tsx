/***********************************************************************************
 * This component wraps the @gorhom/bottom-sheet library
 * to more easily take advantage of it throughout the app.
 *
 * Implementation:
 * <BottomSheetWrapper view="viewName">
 *   <View>...</View>
 * </BottomSheetWrapper>
 *
 * Usage Throughout App:
 * toggleView({ view: 'viewName', data: { isOpen: true, snapPoint: 1 }});
 * toggleView({ view: 'viewName', data: { isOpen: false }});
 *
 * Check if a given view is open:
 * getStore().user.viewController['viewName'].isOpen;
 ***********************************************************************************/

import React, {
	memo,
	ReactElement,
	forwardRef,
	useImperativeHandle,
	useRef,
	useEffect,
	useCallback,
	useMemo,
} from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet, {
	useBottomSheetDynamicSnapPoints,
	BottomSheetView,
	BottomSheetBackdrop,
	BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import { useSelector } from 'react-redux';
import Store from '../store/types';
import { TViewController } from '../store/types/user';
import themes from '../styles/themes';
import { toggleView } from '../store/actions/user';
import BottomSheetGradient from './BottomSheetGradient';
import { IColors } from '../styles/colors';

export interface BottomSheetWrapperProps {
	children: ReactElement;
	view: TViewController;
	snapPoints: (string | number)[];
	backdrop?: boolean;
	backgroundStartColor?: keyof IColors;
	onOpen?: () => void;
	onClose?: () => void;
}

const BottomSheetWrapper = forwardRef(
	(
		{
			children,
			view,
			snapPoints,
			backdrop = true,
			backgroundStartColor = 'gray6',
			onOpen,
			onClose,
		}: BottomSheetWrapperProps,
		ref,
	): ReactElement => {
		const bottomSheetRef = useRef<BottomSheet>(null);
		const data = useSelector((state: Store) => state.user.viewController[view]);
		const settingsTheme = useSelector((state: Store) => state.settings.theme);
		const theme = useMemo(() => themes[settingsTheme], [settingsTheme]);
		const handleIndicatorStyle = useMemo(
			() => ({ backgroundColor: theme.colors.gray2 }),
			[theme.colors.gray2],
		);

		// https://github.com/gorhom/react-native-bottom-sheet/issues/770#issuecomment-1072113936
		// do not activate BottomSheet if swipe horizontally, this allows using Swiper inside of it
		const activeOffsetX = useMemo(() => [-999, 999], []);
		const activeOffsetY = useMemo(() => [-5, 5], []);

		useEffect(() => {
			if (data.isOpen) {
				bottomSheetRef.current?.snapToIndex(data.snapPoint ?? -1);
			} else {
				bottomSheetRef.current?.close();
			}
		}, [data.isOpen, data.snapPoint]);

		useImperativeHandle(ref, () => ({
			snapToIndex(index: number = 0): void {
				bottomSheetRef.current?.snapToIndex(index);
			},
			expand(): void {
				bottomSheetRef.current?.snapToIndex(1);
			},
			close(): void {
				bottomSheetRef.current?.close();
			},
		}));

		const initialSnapPoints = useMemo(() => ['60%', '95%'], []);
		const { animatedHandleHeight, animatedContentHeight, handleContentLayout } =
			useBottomSheetDynamicSnapPoints(initialSnapPoints);

		const _onOpen = useCallback(() => {
			onOpen?.();
		}, [onOpen]);

		const _onClose = useCallback(() => {
			if (view) {
				toggleView({
					view,
					data: { isOpen: false, id: data.id },
				});
			}
			onClose?.();
		}, [view, onClose, data.id]);

		// callbacks
		const handleSheetChanges = useCallback(
			(index: number) => {
				if (index === -1) {
					_onClose();
				} else if (index >= 0) {
					_onOpen();
				}
			},
			[_onClose, _onOpen],
		);

		const renderBackdrop = useCallback(
			(props) => {
				if (!backdrop) {
					return null;
				}
				return (
					<BottomSheetBackdrop
						{...props}
						disappearsOnIndex={-1}
						appearsOnIndex={0}
					/>
				);
			},
			[backdrop],
		);

		const backgroundComponent = useCallback(
			({ style, ...props }: BottomSheetBackgroundProps) => (
				<BottomSheetGradient
					animatedContentHeight={animatedContentHeight}
					startColor={backgroundStartColor}
					style={style}
					{...props}
				/>
			),
			[animatedContentHeight, backgroundStartColor],
		);

		// Determine initial snapPoint index based on provided data.
		let index = useMemo((): number => {
			return data.snapPoint && data.snapPoint < 2 ? data.snapPoint : -1;
		}, [data.snapPoint]);

		return (
			<BottomSheet
				backgroundComponent={backgroundComponent}
				handleIndicatorStyle={handleIndicatorStyle}
				handleStyle={styles.handle}
				animateOnMount
				enablePanDownToClose
				keyboardBlurBehavior="restore"
				ref={bottomSheetRef}
				index={index}
				onChange={handleSheetChanges}
				backdropComponent={renderBackdrop}
				handleHeight={animatedHandleHeight}
				snapPoints={snapPoints}
				activeOffsetX={activeOffsetX}
				activeOffsetY={activeOffsetY}>
				<BottomSheetView
					style={styles.container}
					onLayout={handleContentLayout}>
					{children}
				</BottomSheetView>
			</BottomSheet>
		);
	},
);

const styles = StyleSheet.create({
	container: {
		borderTopLeftRadius: 32,
		borderTopRightRadius: 32,
		height: '100%',
		position: 'relative',
	},
	handle: {
		alignSelf: 'center',
		height: 32,
		width: 32,
		// marginBottom: 12,
	},
});

export default memo(BottomSheetWrapper);
