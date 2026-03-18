export async function fetchExos() {
	const savedConfig = localStorage.getItem('exos')
	if (savedConfig) return savedConfig

	const base = new URL('.', window.location.href).pathname
	const response = await fetch(`${base}defaultExos.js`)
	if (!response.ok) throw new Error(`Failed to load ${base}assets/exos.js`);

	return await response.text()
}

export function updateExos(code: string) {
	localStorage.setItem('exos', code)
}
