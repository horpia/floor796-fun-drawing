import {AnimationTool} from "../animation-tool";

export class AnimationToolPickColor extends AnimationTool {
	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {ColorsBar} */
	#colorsBar;

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
		this.#pickColor(col, row);
	}

	handleMove(col, row, dx, dy) {
		this.#pickColor(col, row);
	}

	handleEnd(col, row, x, y) {
		this.#pickColor(col, row);
	}

	#pickColor(col, row) {
		let color = 0;
		for (const l of this.#canvas.layers.layers) {
			if (!l.isVisible) {
				continue;
			}
			
			color = l.getPixel(this.#canvas.layers.currentFrame, col, row);
			if (color !== 0) {
				break;
			}
		}

		if (color !== 0) {
			this.#colorsBar.setColor(color);
		}
	}
}