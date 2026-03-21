function beepLast(seconds) {
	return timeLeft => {
		// if (timeLeft >= 1 && timeLeft <= seconds) beep(440);
		if (timeLeft >= 1 && timeLeft <= seconds) say(String(timeLeft));
	};
}

function* sayAndHold(soundName, seconds, bgCol, label, onTick) {
	say(soundName)
	yield* hold(seconds, bgCol, label, onTick)
}

function *oneLeg(totalRounds, workTime, restTime) {
	for (let currentRound = 1; currentRound <= totalRounds; currentRound += 1) {
		yield* sayAndHold('work', workTime, 'red-700', `Work (Round ${currentRound}/${totalRounds})`, beepLast(2));

		if (currentRound < totalRounds) {
			yield* sayAndHold('rest', restTime, 'green-600', `Rest (Round ${currentRound}/${totalRounds})`);
		}
	}
}

function* routine(text, skipBreak) {
	yield* sayAndHold('prepare', 7, 'sky-400', `Prepare ${text}`, beepLast(2));

	yield* oneLeg(8, 7, 3);

	yield* sayAndHold('second leg', 5, 'sky-400', 'Second leg', beepLast(2));

	yield* oneLeg(8, 7, 3);

	if (!skipBreak) {
		yield* sayAndHold('break', 90, 'purple-600', `Break ${text}`, beepLast(3));
	}
}

return [
	['∞ sets, 2 legs, 8 reps, 7+3 secs', function*() {
		for (let set = 1; set <= 100; set++) {
			yield* routine(`#${set}`);
		}
	}],
	['2 sets, 2 legs, 8 reps, 7+3 secs', function*() {
		for (let set = 1; set <= 2; set++) {
			yield* routine(`${set}/2`, set === 2);
		}
	}],
	['1 min 30 break', function*() {
		yield* sayAndHold('break', 90, 'purple-600', 'Break', beepLast(5));
	}],
];
