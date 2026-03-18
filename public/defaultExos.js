function beepLast(seconds) {
	return (timeLeft, total) => {
		// if (timeLeft >= 1 && timeLeft <= seconds) playBeep(440);
		if (timeLeft >= 1 && timeLeft <= seconds) playSound(String(timeLeft));
	};
}

function* sayAndReps(soundName, seconds, bgCol, label, onTick) {
	playSound(soundName)
	yield* reps(seconds, bgCol, label, onTick)
}

function *oneLeg(totalRounds, workTime, restTime) {
	for (let currentRound = 1; currentRound <= totalRounds; currentRound += 1) {
		yield* sayAndReps('work', workTime, 'bg-red-500', `Work (Round ${currentRound}/${totalRounds})`, beepLast(2));

		if (currentRound < totalRounds) {
			yield* sayAndReps('rest', restTime, 'bg-green-500', `Rest (Round ${currentRound}/${totalRounds})`);
		}
	}
}

return [
	['1 set, 2 legs, 8 reps, 7+3 secs', function*() {
		yield* sayAndReps('prepare', 7, 'bg-sky-400', 'Prepare', beepLast(2));

		yield* oneLeg(8, 7, 3);

		yield* sayAndReps('second leg', 5, 'bg-sky-400', 'Second leg', beepLast(2));

		yield* oneLeg(8, 7, 3);

		yield* sayAndReps('break', 120, 'bg-purple-600', 'Break', beepLast(5));
	}],
	['2 min break', function*() {
		yield* sayAndReps('break', 120, 'bg-purple-600', 'Break', beepLast(5));
	}],
];
