export class SizeBar {
	/** @type {HTMLElement} */
	#container;

	/** @type {Map<number, HTMLButtonElement>} */
	#buttons = new Map();

	#currentSize = 1;

	/**
	 * @param {HTMLElement} cont 
	 */
	constructor(cont) {
		this.#container = cont;
		this.#container.querySelectorAll('.button[data-role="size"]').forEach(el => {
			const size = parseInt(el.dataset.size, 10);
			this.#buttons.set(size, el);
			el.addEventListener('click', () => this.setSize(size));
		});
		this.setSize(1);
	}

	get size() {
		return this.#currentSize;
	}

	setSize(size) {
		if (!this.#buttons.has(size)) {
			return;
		}

		this.#currentSize = size;

		for (const [btnSize, btn] of this.#buttons.entries()) {
			btn.classList.toggle('button_checked', btnSize === size);
		}
	}
}