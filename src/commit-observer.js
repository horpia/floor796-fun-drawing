export class CommitObserver {
	/** @type {function()[]} */
	#observers = [];
	#timer;
	#isMuted = false;

	/** @param {function()} func */
	observe(func) {
		this.#observers.push(func);
	}

	setMute(flag) {
		this.#isMuted = flag;
	}

	commit() {
		if (this.#isMuted) {
			return;
		}
		if (this.#timer > 0) {
			clearTimeout(this.#timer);
		}
		this.#timer = setTimeout(() => {
			if (!this.#isMuted) {
				this.#observers.forEach(f => f());
			}
		});
	}
}