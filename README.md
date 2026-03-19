# Fully programmable interval timer

Try it at http://mobile-dev.ch/products/interval-timer

It uses a DSL allowing you to write your own exercise. You need to return an array of `['exercise name', function]`.

The available API functions are `playBeep(frequency)` and `playSound('text')`.

There is also `yield* reps(numberOfSeconds, backgroundColor, label, onTick)`, which can be used to start a section.
The `onTick` argument is an optional JS function that takes the current remaining time and the total number of seconds
passed to the reps section.

The following example exposes 2 "exercises", one is a 1-minute break, and the other has 2 sets of 10 reps of
7-second work + 3-second rest:

```js
return [
	['2 rounds, 10 reps 7+3 secs', function*() {
		for (let round = 1; round <= 2; round++) {
			playSound('prepare')
			yield* reps(10, 'bg-blue-500', `Prepare (Round ${currentRound}/2)`)

			for (let set = 1; set <= 10; set++) {
				playSound('work')
				yield* reps(7, 'bg-red-500', `Work ${set}/10`)

				playSound('rest')
				yield* reps(3, 'bg-green-500', `Rest ${set}/10`)
			}
		}
	},
	['1 min break', function*() {
		playSound('break')
		yield* reps('break', 120, 'bg-purple-600', 'Break', beepLast(5))
	}],
];
```

# Notes :
* The voice samples have been generated using `2402 - robert-🇬🇧united kingdom male voice` on https://ttsmaker.com/

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
	 `npm install`
3. Run the app:
	 `npm run dev`

