import {AnimationTool} from "../animation-tool";

export class AnimationToolHand extends AnimationTool {
	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {number[]} */
	#startCanvasPos = [0, 0];

	/**
	 * @param {AnimationCanvas} canvas
	 */
	constructor(canvas) {
		super();
		this.#canvas = canvas;
	}

	handleStart(col, row, x, y) {
		this.#startCanvasPos = this.#canvas.getPosition();
	}

	handleMove(col, row, dx, dy) {
		const scale = this.#canvas.getScale();
		this.#canvas.setPosition(
			this.#startCanvasPos[0] + (dx / scale),
			this.#startCanvasPos[1] + (dy / scale)
		);
	}
}