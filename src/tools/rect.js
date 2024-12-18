import {AnimationTool} from "../animation-tool";
import {AnimationToolMove} from "./move";

export class AnimationToolRect extends AnimationTool {
	/** @type {AnimationCanvas} */
	#canvas;

	#startPixelPos = [0, 0];

	/** @type {HTMLElement} */
	#container;

	/** @type {AnimationToolMove|null} */
	#moveTool = null;

	/**
	 * @param {AnimationCanvas} canvas
	 */
	constructor(cont, canvas) {
		super();
		this.#canvas = canvas;
		this.#container = cont.querySelector('.canvas-container');
	}

	handleStart(col, row, x, y) {
		if (this.#isInsideSelection(col, row)) {
			this.#moveTool = new AnimationToolMove(this.#canvas);
			this.#moveTool.handleStart(col, row, x, y);
			return;
		}

		if (this.#canvas.getSelection() !== null) {
			this.#canvas.commitObserver.commit();
		}

		this.#canvas.layers.commitTransactions();

		this.#startPixelPos = [col, row];
		this.#canvas.setSelection(0, 0, 0, 0);
	}

	handleMove(col, row, dx, dy) {
		if (this.#moveTool) {
			this.#moveTool.handleMove(col, row, dx, dy);
			return;
		}

		const [fromCol, fromRow] = this.#startPixelPos;
		this.#canvas.setSelection(fromCol, fromRow, col, row);
	}

	handleEnd(col, row, x, y) {
		if (this.#moveTool) {
			this.#moveTool.handleEnd(col, row, x, y);
		}

		this.#moveTool = null;
		this.#canvas.applySelectionTranslate();
	}

	renderCursor(ctx, x, y, col, row, pxSize) {
		if (this.#isInsideSelection(col, row)) {
			this.#container.classList.add('cursor-move');
		} else {
			this.#container.classList.remove('cursor-move');
		}
	}

	#isInsideSelection(col, row) {
		const sel = this.#canvas.getSelection();
		return sel && col >= sel[0] && row >= sel[1] && col < sel[2] && row < sel[3];
	}

	unload() {
		this.#container.classList.remove('cursor-move');
	}
}