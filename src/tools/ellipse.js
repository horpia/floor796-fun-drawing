import {AnimationTool} from "../animation-tool";

export class AnimationToolEllipse extends AnimationTool {
	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {ColorsBar} */
	#colorsBar;

	/** @type {SizeBar} */
	#sizeBar;

	/** @type {Layer} */
	#layer;

	/** @type {number} */
	#frame;

	#startPixelPos = [0, 0];

	/**
	 * @param {AnimationCanvas} canvas
	 * @param {ColorsBar} colorsBar
	 * @param {SizeBar} sizeBar
	 */
	constructor(canvas, colorsBar, sizeBar) {
		super();
		this.#canvas = canvas;
		this.#colorsBar = colorsBar;
		this.#sizeBar = sizeBar;
	}

	handleStart(col, row, x, y) {
		this.#layer = this.#canvas.layers.currentLayer;
		this.#layer.startTransaction();
		this.#frame = this.#canvas.layers.currentFrame;
		this.#startPixelPos = [col, row];
		this.#drawEllipse(col, row);
	}

	handleMove(col, row, dx, dy) {
		this.#drawEllipse(col, row);
	}

	handleEnd(col, row, x, y) {
		this.#layer.commitTransaction();
		this.#canvas.commitObserver.commit();
	}

	#drawEllipse(col, row) {
		this.#layer.createBlankKeyframe(this.#frame);

		const [fromCol, fromRow] = this.#startPixelPos;

		const rx = Math.abs(col - fromCol);
		const ry = Math.abs(row - fromRow);

		const delta = Math.max(rx, ry);
		if (delta < 1) {
			this.#layer.putPixel(this.#frame, this.#colorsBar.currentColorIndex, col, row, this.#canvas.getSelection());
			this.#canvas.render();
			return;
		}

		const step = Math.PI / 2 / (Math.ceil(Math.hypot(rx, ry)) * 2);

		for (let a = 0, to = Math.PI * 2; a <= to; a += step) {
			const y = Math.sin(a) * ry;
			const x = Math.cos(a) * rx;
			this.#layer.putPixel(
				this.#frame,
				this.#colorsBar.currentColorIndex,
				fromCol + Math.round(x),
				fromRow + Math.round(y),
				this.#sizeBar.size,
				this.#canvas.getSelection()
			);
		}

		this.#canvas.render();
	}
}