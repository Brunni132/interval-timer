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

function* oneLeg(totalRounds, workTime, restTime) {
	for (let currentRound = 1; currentRound <= totalRounds; currentRound += 1) {
		yield* sayAndHold('work', workTime, 'red-700', `Work ${currentRound}/${totalRounds}`, beepLast(2));

		if (currentRound < totalRounds) {
			if ([6, 8, 10, 12, 14, 16, 18, 20].includes(currentRound)) {
				say(`${currentRound} rep`);
			}
			else {
				say('rest');
			}
			yield* hold(restTime, 'green-600', `Rest ${currentRound + 1}/${totalRounds}`);
		}
	}
}

function* routine(text, options) {
	const { skipBreak, reps, secondLeg } = {
		skipBreak: false, reps: 8, secondLeg: true, ...options
	}

	yield* sayAndHold('prepare', 7, 'sky-400', `Prepare ${text}`, beepLast(2));
	step()

	yield* oneLeg(reps, 7, 3);
	step()

	if (secondLeg) {
		yield* sayAndHold('second leg', 5, 'sky-400', 'Second leg', beepLast(2));
		step()

		yield* oneLeg(reps, 7, 3);
		step()
	}

	if (!skipBreak) {
		yield* sayAndHold('break', 90, 'purple-600', `Break ${text}`, beepLast(3));
		step()
	}
}

return [
	['∞ sets, 2 legs, 8 reps, 7+3 secs', function* () {
		for (let set = 1; set <= 100; set++) {
			yield* routine(`#${set}`);
		}
	}],
	['∞ sets, 2 legs, 10 reps, 7+3 secs', function* () {
		for (let set = 1; set <= 100; set++) {
			yield* routine(`#${set}`, { reps: 10 });
		}
	}],
	['∞ sets, 2x8 reps, 7+3 secs', function* () {
		for (let set = 1; set <= 100; set++) {
			yield* routine(`#${set}`, { reps: 16, secondLeg: false });
		}
	}],
	['∞ sets, 2x10 reps, 7+3 secs', function* () {
		for (let set = 1; set <= 100; set++) {
			yield* routine(`#${set}`, { reps: 20, secondLeg: false });
		}
	}],
	['30 sec plank', function* () {
		for (let set = 1; set <= 100; set++) {
			yield* sayAndHold('prepare', 7, 'sky-400', `Prepare #${set}`, beepLast(2));
			step();

			yield* sayAndHold('work', 30, 'red-700', `Work #${set}`, beepLast(2));
			step();

			yield* sayAndHold('rest', 30, 'green-600', `Rest #${set}`);
			step();
		}
	}],
	['2 sets, 2 legs, 8 reps, 7+3 secs', function* () {
		for (let set = 1; set <= 2; set++) {
			yield* routine(`${set}/2`, { skipBreak: set === 2 });
		}
	}],
	['1 min 30 break', function* () {
		yield* sayAndHold('break', 90, 'purple-600', 'Break', beepLast(5));
	}],
];
