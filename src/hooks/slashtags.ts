import { useEffect, useMemo, useState } from 'react';
import { SDK, SlashURL } from '@synonymdev/slashtags-sdk';

import { useSlashtags, useSlashtagsSDK } from '../components/SlashtagsProvider';
import { BasicProfile, IRemote } from '../store/types/slashtags';
import {
	closeDriveSession,
	decodeJSON,
	getSelectedSlashtag,
} from '../utils/slashtags';
import { useSelector } from 'react-redux';
import Store from '../store/types';
import { cacheProfile } from '../store/actions/slashtags';

export type Slashtag = ReturnType<SDK['slashtag']>;

/**
 * Returns the currently selected Slashtag
 */
export const useSelectedSlashtag = (): {
	url: string;
	slashtag: Slashtag;
} & IRemote => {
	const sdk = useSlashtagsSDK();
	const slashtag = getSelectedSlashtag(sdk);

	return { url: slashtag?.url, slashtag };
};

/**
 * Watches the public profile of a local or remote slashtag by its url.
 * Overrides name property if it is saved as a contact record!
 */
export const useProfile = (
	url: string,
): { resolving: boolean; profile: BasicProfile } => {
	const profile = useSelector((state: Store) => {
		return state.slashtags.profiles?.[url]?.profile || {};
	});
	const [resolving, setResolving] = useState(true);

	const contactRecord = useSlashtags().contacts[url];
	const withContactRecord = useMemo(() => {
		return contactRecord?.name
			? { ...profile, name: contactRecord.name }
			: profile;
	}, [profile, contactRecord]);

	const sdk = useSlashtagsSDK();

	useEffect(() => {
		let unmounted = false;
		if (sdk.closed) {
			console.debug('useProfile: SKIP sdk is closed');
			return;
		}

		const drive = sdk.drive(SlashURL.parse(url).key);

		drive
			.ready()
			.then(() => {
				// Resolve immediatly
				resolve().finally(() => {
					!unmounted && setResolving(false);
				});
				// Watch update
				drive.core.on('append', resolve);
			})
			.catch(onError);

		async function resolve(): Promise<void> {
			const version = await drive.files
				.get('/profile.json')
				.then((node: any) => node && node.seq);

			const _profile = await drive
				.get('/profile.json')
				.then(decodeJSON)
				.catch(noop);

			cacheProfile(url, drive.files.feed.fork, version, _profile);
		}

		return function cleanup(): void {
			unmounted = true;
			drive.core.removeAllListeners();
			closeDriveSession(drive);

			// It so happens that hypercore creates a new session for every hypercore replicated
			// on a stream (connection), and it wants to close that session once the stream is closed
			// memory leak warning is expected.
			// Uncomment following code to watch number of close listeners on replication streams
			// console.debug("close listeners",[...sdk.swarm._allConnections._byPublicKey.values()].map((s) => s.listenerCount('close')));
		};
	}, [url, sdk]);

	return {
		resolving,
		profile: withContactRecord,
	};
};

function onError(error: Error): void {
	console.debug('Error opening drive in useProfile', error.message);
}

function noop(): void {}
