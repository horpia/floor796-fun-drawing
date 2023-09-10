import {AnimationPlayer} from "./animation-player";
import {Layer} from "./layer";
import {CommitObserver} from "./commit-observer";
import {PX_COLS, PX_ROWS, SCREEN_SCALE} from "./config";

const TRANSFORM_MATRIX = [
	0.7, 0, 0,
	0.559, 1, 0,
	0, 0, 1
];

export class AnimationPreview {
	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {AnimationPlayer} */
	#player;

	/** @type {HTMLElement} */
	#popup = document.querySelector('.preview-popup');

	/** @type {CanvasRenderingContext2D} */
	#ctx = document.querySelector('.preview-popup canvas').getContext('2d');

	constructor(canvas) {
		this.#canvas = canvas;
		this.#ctx.canvas.width = 252 * SCREEN_SCALE;
		this.#ctx.canvas.height = 404 * SCREEN_SCALE;

		document.querySelector('.button[data-role="play"]').onclick = () => this.play();
		this.#popup.onclick = () => this.closePopup();
	}

	closePopup() {
		this.#popup.hidden = true;
		if (this.#player) {
			this.#player.stop();
			this.#player = null;
		}
	}

	play() {
		if (!this.#popup.hidden) {
			return;
		}

		this.#popup.hidden = false;

		const dstLayer = new Layer(new CommitObserver(), '');
		for (const layer of [...this.#canvas.layers.layers].reverse()) {
			dstLayer.mergeLayer(layer);
		}

		this.#player = new AnimationPlayer(this.#canvas.palette);
		this.#player.play(dstLayer.getState().frames, this.#render.bind(this));
	}

	#render() {
		this.#ctx.clearRect(0, 0, this.#ctx.canvas.width, this.#ctx.canvas.height);
		this.#ctx.save();

		this.#ctx.setTransform(
			TRANSFORM_MATRIX[0], TRANSFORM_MATRIX[3],
			TRANSFORM_MATRIX[1], TRANSFORM_MATRIX[4],
			TRANSFORM_MATRIX[2], TRANSFORM_MATRIX[5]
		);
		this.#ctx.scale(4 * SCREEN_SCALE, 4 * SCREEN_SCALE);
		this.#ctx.fillStyle = '#ff0000';
		this.#ctx.drawImage(this.#player.canvas, 10, 8);
		this.#ctx.restore();

		this.#drawGrid();
	}

	#drawGrid() {
		this.#ctx.save();
		this.#ctx.lineWidth = 2;
		this.#ctx.globalAlpha = 0.3;
		this.#ctx.strokeStyle = '#555555';

		this.#ctx.setTransform(
			TRANSFORM_MATRIX[0], TRANSFORM_MATRIX[3],
			TRANSFORM_MATRIX[1], TRANSFORM_MATRIX[4],
			TRANSFORM_MATRIX[2], TRANSFORM_MATRIX[5]
		);
		const x = 41 * SCREEN_SCALE;
		const y = 33 * SCREEN_SCALE;
		this.#ctx.beginPath();
		const cols = PX_COLS >> 1;
		const rows = PX_ROWS >> 1;
		const pxSize = 8 * SCREEN_SCALE;
		const width = pxSize * cols;
		const height = pxSize * rows;

		for (let c = 0; c <= cols; c++) {
			const cx = x + c * pxSize;
			this.#ctx.moveTo(cx + 0.5, y + 0.5);
			this.#ctx.lineTo(cx + 0.5, y + height + 0.5);
		}

		for (let r = 0; r <= rows; r++) {
			const cy = y + r * pxSize;
			this.#ctx.moveTo(x + 0.5, cy + 0.5);
			this.#ctx.lineTo(x + width + 0.5, cy + 0.5);
		}

		this.#ctx.stroke();
		this.#ctx.restore();
	}
}