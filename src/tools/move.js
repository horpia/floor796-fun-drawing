import {AnimationTool} from "../animation-tool";
import {PX_COLS, PX_ROWS} from "../config";

export class AnimationToolMove extends AnimationTool {
	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {Layer} */
	#layer;

	#startPixelPos = [0, 0];

	#offset = [0, 0];

	#selectionOffset = [0, 0];

	/**
	 * @param {AnimationCanvas} canvas
	 */
	constructor(canvas) {
		super();
		this.#canvas = canvas;
	}

	handleStart(col, row, x, y) {
		const sel = this.#canvas.getSelection();
		const selOffset = this.#canvas.getSelectionOffset();

		if (sel
			&& (
				col < sel[0] - selOffset[0]
				|| row < sel[1] - selOffset[1]
				|| col >= sel[2] - selOffset[0]
				|| row >= sel[3] - selOffset[1]
			)) {
			// drop selection
			this.#canvas.setSelection(0, 0, 0, 0);
			this.#canvas.layers.commitTransactions();
		}

		this.#startPixelPos = [col, row];
		this.#layer = this.#canvas.layers.currentLayer;
		this.#offset = this.#layer.getTransactionOffset();
		this.#selectionOffset = this.#canvas.getSelectionOffset();

		if (!this.#layer.hasTransaction()) {
			const sel = this.#canvas.getSelection() || [0, 0, PX_COLS, PX_ROWS];
			this.#layer.startTransactionFromSelection(this.#canvas.layers.currentFrame, sel);
			this.#canvas.render();
		}
	}

	handleMove(col, row, dx, dy) {
		const [fromCol, fromRow] = this.#startPixelPos;
		this.#layer.translateTransaction(this.#offset[0] + fromCol - col, this.#offset[1] + fromRow - row);
		this.#canvas.translateSelection(
			this.#selectionOffset[0] + fromCol - col,
			this.#selectionOffset[1] + fromRow - row
		);
		this.#canvas.render();
	}

	unload() {
		if (this.#layer && this.#layer.hasTransaction()) {
			this.#canvas.layers.commitTransactions();
			this.#canvas.commitObserver.commit();
		}
	}
}