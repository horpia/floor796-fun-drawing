import {AnimationTool} from "../animation-tool";
import {CURSOR_COLOR} from "../config";

export class AnimationToolLine extends AnimationTool {
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
		this.#drawLine(col, row);
	}

	handleMove(col, row, dx, dy) {
		this.#drawLine(col, row);
	}

	handleEnd(col, row, x, y) {
		this.#layer.commitTransaction();
		this.#canvas.commitObserver.commit();
	}

	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} x
	 * @param {number} y
	 * @param {number} col
	 * @param {number} row
	 * @param {number} pxSize
	 */
	renderCursor(ctx, x, y, col, row, pxSize) {
		ctx.strokeStyle = CURSOR_COLOR;
		ctx.lineWidth = 1;
		ctx.beginPath();
		const extraSize = (this.#sizeBar.size - 1) * pxSize;

		ctx.rect(
			x + col * pxSize - extraSize,
			y + row * pxSize - extraSize,
			pxSize + (extraSize * 2),
			pxSize + (extraSize * 2)
		);
		ctx.stroke();
	}

	#drawLine(col, row) {
		this.#layer.createBlankKeyframe(this.#frame);

		const [fromCol, fromRow] = this.#startPixelPos;
		const delta = Math.max(Math.abs(row - fromRow), Math.abs(col - fromCol));
		if (delta < 1) {
			this.#layer.putPixel(this.#frame, this.#colorsBar.currentColorIndex, col, row, this.#canvas.getSelection());
			this.#canvas.render();
			return;
		}

		const stepCol = (col - fromCol) / delta;
		const stepRow = (row - fromRow) / delta;
		for (let i = 0; i <= delta; i++) {
			this.#layer.putPixel(
				this.#frame,
				this.#colorsBar.currentColorIndex,
				fromCol + Math.round(stepCol * i),
				fromRow + Math.round(stepRow * i),
				this.#sizeBar.size,
				this.#canvas.getSelection()
			);
		}

		this.#canvas.render();
	}
}