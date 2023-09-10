import {CURSOR_COLOR} from "./config";

export class AnimationTool {
	/**
	 * @param {number} col
	 * @param {number} row
	 * @param {number} x
	 * @param {number} y
	 */
	handleStart(col, row, x, y) {
	}

	/**
	 * @param {number} col
	 * @param {number} row
	 * @param {number} dx
	 * @param {number} dy
	 */
	handleMove(col, row, dx, dy) {
	}

	/**
	 * @param {number} col
	 * @param {number} row
	 * @param {number} x
	 * @param {number} y
	 */
	handleEnd(col, row, x, y) {
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
		ctx.rect(
			x + col * pxSize,
			y + row * pxSize,
			pxSize,
			pxSize
		);
		ctx.stroke();
	}

	unload() {
		
	}
}