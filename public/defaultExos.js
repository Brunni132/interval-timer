function beepLast(seconds) {
	return (timeLeft, total) => {
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
		yield* sayAndHold('work', workTime, 'red-600', `Work (Round ${currentRound}/${totalRounds})`, beepLast(2));

		if (currentRound < totalRounds) {
			yield* sayAndHold('rest', restTime, 'green-600', `Rest (Round ${currentRound}/${totalRounds})`);
		}
	}
}

return [
	['2 sets, 2 legs, 8 reps, 7+3 secs', function*() {
		yield* sayAndHold('prepare', 7, 'sky-600', 'Prepare', beepLast(2));

		for (let set = 1; set <= 2; set++) {
			yield* oneLeg(8, 7, 3);

			yield* sayAndHold('second leg', 5, 'sky-600', 'Second leg', beepLast(2));

			yield* oneLeg(8, 7, 3);

			yield* sayAndHold('break', 120, 'purple-600', `Break ${set}/2`, beepLast(5));
		}
	}],
	['2 min break', function*() {
		yield* sayAndHold('break', 120, 'purple-600', 'Break', beepLast(5));
	}],
];
