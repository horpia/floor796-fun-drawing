export class ColorsBar {
	/** @type {HTMLElement} */
	#container;

	/** @type {number[][]} */
	#colors = [];

	/** @type {number} */
	#currentColor = 0;

	/** @type {SVGRectElement} */
	#btnIndicator;

	/** @type {HTMLElement} */
	#popup;

	/**
	 * @param {HTMLElement} cont 
	 */
	constructor(cont) {
		this.#container = cont;
		this.#colors = ColorsBar.generateColors();
		this.#init();
		this.setColor(27);
	}

	static generateColors() {
		const colors = [];
		const hueSteps = 12;
		const hueStep = 360 / 12;

		for (let h = 0; h < hueSteps; h++) {
			const hue = h * hueStep;
			if (hue === 120) {
				continue;
			}

			colors.push(
				ColorsBar.#convHsvToRgb(hue, 0.2, 1),
				ColorsBar.#convHsvToRgb(hue, 0.4, 1),
				ColorsBar.#convHsvToRgb(hue, 0.6, 0.9),
				ColorsBar.#convHsvToRgb(hue, 0.8, 0.6),
				ColorsBar.#convHsvToRgb(hue, 0.8, 0.4),
			);
		}

		for (let v = 8; v >= 0; v--) {
			colors.push(ColorsBar.#convHsvToRgb(0, 0, v / 8));
		}

		return [...colors].reverse();
	}

	/**
	 * @return {number[][]}
	 */
	get colors() {
		return this.#colors;
	}

	get currentColorIndex() {
		return this.#currentColor;
	}

	setColor(idx) {
		this.#currentColor = idx;
		this.#btnIndicator.style.fill = 'rgb(' + this.#colors[this.#currentColor].join(', ') + ')';
		const selColor = this.#container.querySelector('.colors-bar > div.selected');
		if (selColor) {
			selColor.classList.remove('selected');
		}

		this.#container.querySelector(`.colors-bar > div[data-index="${idx}"]`).classList.add('selected');
	}

	showColorsPalette() {
		this.#popup.hidden = false;
	}

	closeColorsPalette() {
		this.#popup.hidden = true;
	}

	#init() {
		const btn = this.#container.querySelector('.button[data-role="color"]');
		this.#btnIndicator = btn.querySelector('rect:last-of-type');

		let colors = [];
		let i = this.#colors.length - 1;

		for (const [r, g, b] of [...this.#colors].slice(1).reverse()) {
			colors.push(`<div style="--color: rgb(${r} ${g} ${b})" data-index="${i--}"></div>`);
		}

		const popup = this.#container.querySelector('.colors-popup');
		this.#popup = popup;
		popup.onclick = (e) => {
			if (e.target === popup) {
				popup.hidden = true;
			}
		};

		const el = this.#container.querySelector('.colors-bar');
		el.innerHTML = colors.join('');
		el.onclick = /** @param {MouseEvent} e */(e) => {
			if (!e.target.hasAttribute('data-index')) {
				return;
			}

			this.setColor(parseInt(e.target.dataset.index, 10));
			popup.hidden = true;
		};

		btn.onclick = () => {
			popup.hidden = false;
		};
	}

	static #convHsvToRgb(h, s, v) {
		let l = v * (1 - s / 2);
		if (l < 0.0001 || l > 0.998) {
			s = 0;
		} else {
			s = (v - l) / Math.min(l, 1 - l);
		}

		h = Math.max(0, Math.min(360, h));
		l = Math.max(0, Math.min(1, l));
		s = Math.max(0, Math.min(1, s));
		if (s === 0) {
			return [Math.round(l * 255), Math.round(l * 255), Math.round(l * 255)];
		}

		let temp2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
		let temp1 = 2 * l - temp2;
		h /= 360;

		let rgb = [(h + 1 / 3) % 1, h, (h + 2 / 3) % 1],
			i = 0;

		for (; i < 3; ++i) {
			rgb[i] = rgb[i] < 1 / 6 ? temp1 + (temp2 - temp1) * 6 * rgb[i] : rgb[i] < 1 / 2 ? temp2 : rgb[i] < 2 / 3 ? temp1 + (temp2 - temp1) * 6 * (2 / 3 - rgb[i]) : temp1;
		}

		return [Math.round(rgb[0] * 255), Math.round(rgb[1] * 255), Math.round(rgb[2] * 255)];
	}

}
