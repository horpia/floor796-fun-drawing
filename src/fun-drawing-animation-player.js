import {PX_COLS, PX_ROWS} from "./config";
import {ColorsBar} from "./colors-bar";
import {AnimationFile} from "./animation-file";

globalThis.FunDrawingAnimationPlayer = class FunDrawingAnimationPlayer {
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

	/** @type {number} */
	#lastRenderedFrame = -1;

	constructor() {
		this.#palette = ColorsBar.generateColors();
		this.#canvas = document.createElement('canvas');
		this.#canvas.width = PX_COLS;
		this.#canvas.height = PX_ROWS;
		this.#ctx = this.#canvas.getContext('2d');
		this.#imageData = new ImageData(PX_COLS, PX_ROWS);
	}

	get canvas() {
		return this.#canvas;
	}

	/**
	 * @param {Uint8ClampedArray} byteArray
	 * @returns {boolean}
	 */
	load(byteArray) {
		this.#frames = [];

		try {
			const state = new AnimationFile().unpackState(byteArray);
			this.#frames = state.layers.layers[0].frames;
		} catch (e) {
			return false;
		}

		return true;
	}

	renderFrame(frame) {
		if (this.#frames.length === 0) {
			return;
		}

		if (this.#lastRenderedFrame === frame) {
			return;
		}

		this.#lastRenderedFrame = frame;

		if (this.#frames[frame]) {
			this.#fillImageData(this.#frames[frame]);
		} else if (frame === 0) {
			this.#ctx.clearRect(0, 0, PX_COLS, PX_ROWS);
			return;
		}

		this.#ctx.putImageData(this.#imageData, 0, 0);
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