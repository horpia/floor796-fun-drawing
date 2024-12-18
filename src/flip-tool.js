import {PX_COLS, PX_ROWS} from "./config";

export class FlipTool {
	/** @type {AnimationCanvas} */
	#canvas;

	/**
	 * @param {HTMLElement} cont 
	 * @param {AnimationCanvas} canvas 
	 */
	constructor(cont, canvas) {
		this.#canvas = canvas;

		cont.querySelector('button[data-role="flip-x"]').onclick = () => this.#flipHorizontal();
		cont.querySelector('button[data-role="flip-y"]').onclick = () => this.#flipVertical();
	}

	#flipHorizontal() {
		this.#flip((pixels, newPixels, selection) => {
			for (let r = selection[1]; r < selection[3]; r++) {
				for (let c = selection[0]; c < selection[2]; c++) {
					newPixels[r][c] = pixels[r][(selection[2] - 1) - (c - selection[0])];
				}
			}
		});
	}

	#flipVertical() {
		this.#flip((pixels, newPixels, selection) => {
			for (let r = selection[1]; r < selection[3]; r++) {
				for (let c = selection[0]; c < selection[2]; c++) {
					newPixels[r][c] = pixels[(selection[3] - 1) - (r - selection[1])][c];
				}
			}
		});
	}

	#flip(func) {
		this.#canvas.layers.commitTransactions();
		this.#canvas.applySelectionTranslate();

		const layer = this.#canvas.layers.currentLayer;
		let selection = this.#canvas.getSelection();
		const pixels = layer.getPixels(this.#canvas.layers.currentFrame, true);

		if (!selection) {
			selection = [0, 0, PX_COLS, PX_ROWS];
		}

		const newPixels = JSON.parse(JSON.stringify(pixels));

		func(pixels, newPixels, selection);

		layer.setPixels(this.#canvas.layers.currentFrame, newPixels);
		layer.startTransaction();
		layer.commitTransaction();
		this.#canvas.render();
	}
}