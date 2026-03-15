// MEMO: not ideal to use floats for that (precision)
export type TimestampInSeconds = number
export type DurationInSeconds = number

export const formatDateFull = (date: Date) => date.toLocaleDateString('fr-FR')
export const formatTimeFull = (time: Date) => time.toLocaleTimeString('fr-FR')

export function timeInSeconds(): TimestampInSeconds {
	return new Date().getTime() / 1000
}

export function dateFromSeconds(timestamp: TimestampInSeconds) {
	return new Date(timestamp * 1000)
}

export function dateToIsoString(date: Date) {
	return Number.isNaN(date.getTime()) ? "(date invalide)" : date.toISOString()
}

export function formatFloat(val: number, digits: number) {
	return val.toLocaleString('fr-FR', {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
  }).replace(' ', '’')
}

export function formatInt(val: number, digits: number, digitGrouping = false) {
	return val.toLocaleString('fr-FR', {
	minimumIntegerDigits: digits,
	useGrouping: digitGrouping
  }).replace(' ', '’')
}

export function formatDurationShort(duration: DurationInSeconds) {
	return (duration >= 3600 ? (Math.floor(duration / 3600) + 'h ') : '') +
		`${formatInt(Math.floor(duration / 60) % 60, duration >= 3600 ? 2 : 1)}m` +
		(duration % 60 > 0 ? `${formatInt(duration % 60, 2)}s` : '')
}

export function formatDateShort(a: Date, showSeconds = false, showMillisec = false) {
	const year = a.getFullYear() % 100;
	const month = formatInt(a.getMonth() + 1, 2);
	const date = formatInt(a.getDate(), 2);
	const hour = formatInt(a.getHours(), 2)
	const min = formatInt(a.getMinutes(), 2)
	let result = date + '‑' + month + '‑' + year + ' '

	if (showSeconds) {
		result += hour + ':' + min + ':' + formatInt(a.getSeconds(), 2)
		if (showMillisec) result += "," + formatInt(a.getMilliseconds(), 3)
	}
	else {
		result += hour + 'h' + min
	}
	return result
}

export function formatTimeHMS(seconds: DurationInSeconds) {
	return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds / 60 % 60).toString().padStart(2, '0')}m ${Math.floor(seconds % 60).toString().padStart(2, '0')}s`
}

export function formatTimeHM(seconds: DurationInSeconds) {
	return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds / 60 % 60).toString().padStart(2, '0')}m`
}

type NotThenable<T> = T extends PromiseLike<any> ? never : T;

export function makeSingleTaskPlanner() {
	let currentTimer: number | undefined = undefined

	return {
		cancel() {
			if (currentTimer !== undefined) clearTimeout(currentTimer)
			currentTimer = undefined
		},
		planIn(delay: DurationInSeconds, callback: () => void) {
			this.cancel()
			currentTimer = setTimeout(() => {
				currentTimer = undefined
				callback()
			}, delay * 1000) as unknown as number
		},
	}
}

export function makePeriodicTaskPlanner() {
	let currentTimer: number | undefined = undefined
	let pending = false

	return {
		cancel() {
			if (currentTimer !== undefined) clearInterval(currentTimer)
			currentTimer = undefined
		},
		planEvery<R>(interval: DurationInSeconds, callback: () => R & NotThenable<R>, runNow: boolean) {
			this.cancel()
			currentTimer = setInterval(callback, interval * 1000) as unknown as number
			if (runNow) callback()
		},
		// Ensures that the async function has finished before calling again. Might therefore drop some iterations.
		planAsyncEvery(interval: DurationInSeconds, callback: () => Promise<void>, runNow: boolean) {
			function iteration() {
				if (pending) return

				pending = true
				callback()
					.then(() => pending = false)
					.catch(() => pending = false)
			}

			this.planEvery(interval, iteration, runNow)
		},
	}
}

export function sleep(delay: DurationInSeconds) {
	return new Promise(resolve => setTimeout(resolve, delay * 1000));
}

export function countSubstring(str: string, subStr: string) {
  if (!subStr) return 0; // avoid infinite loops with empty substring

  let count = 0;
  let pos = 0;

  while (true) {
	pos = str.indexOf(subStr, pos);
	if (pos === -1) break;
	count++;
	pos += subStr.length; // move past the found substring
  }

  return count;
}

export function isNumChar(char: string) {
	const code = char.charCodeAt(0)
	return code >= 48 && code <= 57
}

const kDateTimeRegex = /^(\d{1,2})-(\d{1,2})-(\d{2}) (\d{1,2})H(\d{2})$/

export function parseSdecDate(inputValue: string): Date | undefined {
	const match = inputValue.match(kDateTimeRegex)
	if (!match) return undefined

	const [ , dd, mm, yy, hh, min ] = match
	const day = parseInt(dd, 10);
	const month = parseInt(mm, 10) - 1; // JS months: 0–11
	const year = 2000 + parseInt(yy, 10); // interpret YY as 20YY
	const hours = parseInt(hh, 10);
	const minutes = parseInt(min, 10);

	const date = new Date(year, month, day, hours, minutes);
	// Validate that the date didn’t overflow
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day ||
		date.getHours() !== hours ||
		date.getMinutes() !== minutes
	) {
		return undefined
	}

	return date
}

export class RunningAverage {
	private _average = 0;
	private _count = 0;
	private _min = 0;
	private _max = 0;
	private _last = 0;
	private _first = 0;
	private readonly _resetThreshold: number
	private readonly _resetValue: number

	constructor(resetThreshold: number = 20000, resetValue: number = 10000) {
		this._first = 0
		this._last = 0
		this._resetThreshold = resetThreshold
		this._resetValue = resetValue
	}

	set(value: number): void {
		if (this._count == 0 || value < this._min) this._min = value
		if (this._count == 0 || value > this._max) this._max = value
		if (this._first == 0) this._first = this._average = value

		this._last = value
		this._count++
		this._average += (value - this._average) / this._count

		if (this._count >= this._resetThreshold) {
			this._count = this._resetValue
		}
	}

	get current(): number {
		return this._last
	}

	get first(): number {
		return this._first
	}

	get average(): number {
		return this._count > 0 ? this._average : this._last
	}

	get min(): number {
		return this._count > 0 ? this._min : this._last
	}

	get max(): number {
		return this._count > 0 ? this._max : this._last
	}

	get count(): number {
		return this._count
	}

	reset() {
		this._average = this._min = this._max = this._count = this._first = 0
	}
}

export const mapProperties = <T extends Record<string, any>, R>(
	obj: T,
	fn: (value: T[keyof T], key: keyof T) => R
) => Object.fromEntries(
	Object.entries(obj).map(([k, v]) => [k, fn(v as T[keyof T], k as keyof T)])
) as { [K in keyof T]: R }

export function makeObjectFromEntries<const T extends readonly (readonly [PropertyKey, unknown])[]>(entries: T) {
	return Object.fromEntries(entries) as {
		[K in T[number] as K[0]]: Extract<T[number], readonly [K[0], any]>[1]
	}
}


export function csvEscape(field: string | number): string {
  const s = String(field)
  const needsQuotes = s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')
  if (!needsQuotes) return s
  return `"${s.replace(/"/g, '""')}"`
}


export class CoroutineMutex {
	private locked = false
	private promise: Promise<void> | undefined

	async performLocked(cb: () => Promise<void>) {
		if (this.locked) {
			await this.promise
		}

		this.promise = (async () => {
			this.locked = true
			try {
				await cb()
			} finally {
				this.locked = false
			}
		})()
	}
}
