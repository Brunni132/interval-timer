let wakeLock: WakeLockSentinel | null = null

export async function acquireWakeLock() {
	try {
		if ('wakeLock' in navigator) {
			wakeLock = await navigator.wakeLock.request('screen')

			// wakeLock.addEventListener('release', () => {
			// 	console.log('Wake lock released')
			// })
		}
	} catch (err) {
		console.error('Could not acquire wake lock:', err)
	}
}

export async function releaseWakeLock() {
	if (wakeLock) {
		await wakeLock.release()
		wakeLock = null
	}
}
