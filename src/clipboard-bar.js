import {PX_COLS, PX_ROWS} from "./config";

export class ClipboardBar {
	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {ToolBar} */
	#toolBar;

	/** @type {number[][]|null} */
	#buffer = null;

	#wholeFrame = false;

	/**
	 * @param {AnimationCanvas} canvas
	 * @param {ToolBar} toolBar
	 */
	constructor(canvas, toolBar) {
		this.#canvas = canvas;
		this.#toolBar = toolBar;

		document.querySelector('.button[data-role="copy"]').onclick = () => this.copy();
		document.querySelector('.button[data-role="cut"]').onclick = () => this.cut();
		document.querySelector('.button[data-role="paste"]').onclick = () => this.paste();
	}

	copy(erase = false) {
		let sel = this.#canvas.getSelection();
		const pixels = this.#canvas.layers.currentLayer.getPixels(this.#canvas.layers.currentFrame);
		if (!pixels) {
			alert(
				floor796.detectUserLanguage() === 'ru'
				? 'Копировать можно только из ключевого кадра. Текущий кадр не ключевой'
				: 'You can only copy from a keyframe. The current frame is not a key'
			);
			return false;
		}

		if (!sel) {
			sel = [0, 0, PX_COLS, PX_ROWS];
			this.#wholeFrame = true;
		} else {
			this.#wholeFrame = false;
		}

		this.#buffer = new Array(PX_ROWS).fill(null).map(_ => new Array(PX_COLS).fill(0));

		if (erase) {
			this.#canvas.layers.currentLayer.startTransaction();
		}

		for (let r = sel[1]; r < sel[3]; r++) {
			const row = pixels[r];
			for (let c = sel[0]; c < sel[2]; c++) {
				this.#buffer[r][c] = row[c];

				if (erase) {
					row[c] = 0;
				}
			}
		}

		if (erase) {
			this.#canvas.layers.currentLayer.commitTransaction();
		}

		return true;
	}

	cut() {
		if (!this.copy(true)) {
			return;
		}
		
		this.#canvas.commitObserver.commit();
		this.#canvas.render();
	}

	paste() {
		if (!this.#buffer) {
			return;
		}

		this.#canvas.layers.commitTransactions();

		if (!this.#wholeFrame) {
			const rect = this.#getBufferedImageRect();
			this.#toolBar.setTool('move');
			this.#canvas.setSelection(...rect);
			this.#canvas.layers.currentLayer.startTransactionFromBuffer(this.#canvas.layers.currentFrame, this.#buffer);
		} else {
			this.#canvas.layers.currentLayer.setPixels(this.#canvas.layers.currentFrame, this.#buffer);
			this.#canvas.commitObserver.commit();
		}

		this.#canvas.render();
	}

	#getBufferedImageRect() {
		let minCol = PX_COLS;
		let maxCol = 0;

		let minRow = PX_ROWS;
		let maxRow = 0;

		for (let r = 0; r < PX_ROWS; r++) {
			for (let c = 0; c < PX_COLS; c++) {
				if (this.#buffer[r][c] === 0) {
					continue;
				}

				minCol = c < minCol ? c : minCol;
				minRow = r < minRow ? r : minRow;

				maxCol = c > maxCol ? c : maxCol;
				maxRow = r > maxRow ? r : maxRow;
			}
		}

		if (minCol === PX_COLS) {
			return [0, 0, PX_COLS, PX_ROWS];
		}

		return [minCol, minRow, maxCol + 1, maxRow + 1];
	}
}