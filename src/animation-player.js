import {FRAME_DURATION, FRAMES, PX_COLS, PX_ROWS} from "./config";

export class AnimationPlayer {
	/** @type {HTMLCanvasElement} */
	#canvas;

	/** @type {CanvasRenderingContext2D} */
	#ctx;

	/** @type {ImageData} */
	#imageData;

	/** @type {(number[][]|null)[]} */
	#frames = [];

	/** @type {number[][]} */
	#palette = [];

	/** @type {number}  */
	#currentFrame = 0;

	#requestedAnimationFrame;

	#renderTimer;

	/** @type {function()|null} */
	#renderCallback = null;

	/**
	 * @param {number[][]} palette
	 */
	constructor(palette) {
		this.#palette = palette;
		this.#canvas = document.createElement('canvas');
		this.#canvas.width = PX_COLS;
		this.#canvas.height = PX_ROWS;
		this.#ctx = this.#canvas.getContext('2d');
		this.#imageData = new ImageData(PX_COLS, PX_ROWS);
	}

	get canvas() {
		return this.#canvas;
	}

	destroy() {
		this.stop();
		if (this.#canvas.parentElement) {
			this.#canvas.remove();
		}

		this.#canvas = null;
		this.#ctx = null;
		this.#imageData = null;
		this.#palette = null;
	}

	isDestroyed() {
		return this.#imageData === null;
	}

	stop() {
		this.#currentFrame = 0;

		if (this.#requestedAnimationFrame) {
			cancelAnimationFrame(this.#requestedAnimationFrame);
		}

		if (this.#renderTimer > 0) {
			clearInterval(this.#renderTimer);
		}
	}

	/**
	 * @param {(number[][]|null)[]} frames
	 * @param {function()} [callback]
	 */
	play(frames, callback = null) {
		if (!this.#imageData) {
			console.log('[FT] Instance was already destroyed');
			return;
		}

		this.#frames = frames;
		this.#renderCallback = callback;

		this.stop();

		this.#renderTimer = setInterval(this.#render.bind(this), FRAME_DURATION);
		this.#render();
	}

	#render() {
		if (!this.#imageData) {
			this.stop();
			return;
		}

		if (this.#requestedAnimationFrame) {
			cancelAnimationFrame(this.#requestedAnimationFrame);
		}

		const frameToRender = this.#currentFrame;

		this.#requestedAnimationFrame = requestAnimationFrame(() => {
			if (this.#frames[frameToRender]) {
				this.#fillImageData(this.#frames[frameToRender]);
			} else if (frameToRender === 0) {
				this.#ctx.clearRect(0, 0, PX_COLS, PX_ROWS);
				this.#renderCallback && this.#renderCallback();
				return;
			}

			this.#ctx.putImageData(this.#imageData, 0, 0);
			this.#renderCallback && this.#renderCallback();
		});

		this.#currentFrame = (this.#currentFrame + 1) % FRAMES;
	}

	/**
	 * @param {number[][]} frmData
	 */
	#fillImageData(frmData) {
		const rgba = this.#imageData.data;
		let i = 0;

		for (let r = 0; r < PX_ROWS; r++) {
			const row = frmData[r];

			for (let c = 0; c < PX_COLS; c++) {
				if (row[c] === 0) {
					rgba[i++] = 70;
					rgba[i++] = 70;
					rgba[i++] = 70;
					rgba[i++] = 255;
					continue;
				}

				const [r, g, b] = this.#palette[row[c]];
				rgba[i++] = r;
				rgba[i++] = g;
				rgba[i++] = b;
				rgba[i++] = 255;
			}
		}
	}
}