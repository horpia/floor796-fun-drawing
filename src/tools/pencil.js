import {AnimationTool} from "../animation-tool";
import {CURSOR_COLOR} from "../config";

export class AnimationToolPencil extends AnimationTool {
	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {ColorsBar} */
	#colorsBar;

	/** @type {SizeBar} */
	#sizeBar;

	#lastPixelPos = [0, 0];

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
		this.#canvas.layers.currentLayer.startTransaction();
		this.#lastPixelPos = [col, row];
		this.#putPixel(col, row);
		this.#canvas.render();
	}

	handleMove(col, row, dx, dy) {
		const [fromCol, fromRow] = this.#lastPixelPos;
		this.#lastPixelPos = [col, row];

		const delta = Math.max(Math.abs(row - fromRow), Math.abs(col - fromCol));
		if (delta <= 1) {
			this.#putPixel(col, row);
			this.#canvas.render();
			return;
		}

		const stepCol = (col - fromCol) / delta;
		const stepRow = (row - fromRow) / delta;

		for (let i = 1; i <= delta; i++) {
			this.#putPixel(fromCol + Math.round(stepCol * i), fromRow + Math.round(stepRow * i));
		}

		this.#canvas.render();
	}

	handleEnd(col, row, x, y) {
		this.#canvas.layers.currentLayer.commitTransaction();
		this.#canvas.render();
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

	#putPixel(col, row) {
		this.#canvas.layers.currentLayer.putPixel(
			this.#canvas.layers.currentFrame,
			this.#colorsBar.currentColorIndex,
			col,
			row,
			this.#sizeBar.size,
			this.#canvas.getSelection()
		);
	}
}