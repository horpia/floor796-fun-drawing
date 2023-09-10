import {AnimationTool} from "../animation-tool";
import {PX_COLS, PX_ROWS} from "../config";

export class AnimationToolFill extends AnimationTool {
	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {ColorsBar} */
	#colorsBar = null;

	/**
	 * @param {AnimationCanvas} canvas
	 * @param {ColorsBar} colorsBar
	 */
	constructor(canvas, colorsBar) {
		super();
		this.#canvas = canvas;
		this.#colorsBar = colorsBar;
	}

	handleStart(col, row, x, y) {
		if (col < 0 || row < 0 || col >= PX_COLS || row >= PX_ROWS) {
			return;
		}

		const pixels = this.#canvas.layers.currentLayer.getPixels(this.#canvas.layers.currentFrame, true);
		if (pixels === null) {
			return;
		}

		const newColor = this.#colorsBar.currentColorIndex;
		const targetColor = pixels[row][col];
		if (targetColor === newColor) {
			return;
		}

		this.#canvas.layers.currentLayer.startTransaction();

		const selection = this.#canvas.getSelection();
		if (selection !== null) {
			for (let r = selection[1]; r < selection[3]; r++) {
				for (let c = selection[0]; c < selection[2]; c++) {
					pixels[r][c] = newColor;
				}
			}

			this.#canvas.layers.currentLayer.commitTransaction();
			this.#canvas.render();
			this.#canvas.commitObserver.commit();
			return;
		}

		const directions = [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0],
		];

		const stack = new Array(10000);
		pixels[row][col] = newColor;
		stack[0] = [row, col];
		let i = 1;

		while (i > 0) {
			const [r, c] = stack[--i];

			for (const [dx, dy] of directions) {
				const c2 = c + dx;
				if (c2 < 0 || c2 >= PX_COLS) {
					continue;
				}

				const r2 = r + dy;
				if (r2 < 0 || r2 >= PX_ROWS) {
					continue;
				}

				if (pixels[r2][c2] === targetColor) {
					pixels[r2][c2] = newColor;
					stack[i++] = [r2, c2];
				}
			}
		}

		this.#canvas.layers.currentLayer.commitTransaction();
		this.#canvas.render();
		this.#canvas.commitObserver.commit();
	}
}