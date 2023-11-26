import {
	CURSOR_COLOR,
	CURSOR_COLOR_DARK,
	GRID_COLOR,
	PX_COLS,
	PX_ROWS,
	PX_SIZE,
	SCALES,
	SCREEN_SCALE
} from "./config";

export class AnimationCanvas {
	/** @type {CommitObserver} */
	#commitObserver;

	/** @type {HTMLCanvasElement} */
	#canvas;

	/** @type {HTMLCanvasElement} */
	#srcCanvas;

	/** @type {HTMLCanvasElement} */
	#cursorCanvas;

	/** @type {CanvasRenderingContext2D} */
	#ctx;

	/** @type {CanvasRenderingContext2D} */
	#srcCtx;

	/** @type {CanvasRenderingContext2D} */
	#cursorCtx;

	/** @type {AnimationLayers} */
	#layers;

	/** @type {number[][]} */
	#palette;

	/** @type {number} */
	#scale = 1;

	/** @type {number} */
	#x = 0;

	/** @type {number} */
	#y = 0;

	/**
	 * @type {{x: number, width: number, pxSize: number, y: number, height: number}}
	 */
	#cachedRect;

	/** @type {AnimationTool|null} */
	#tool = null;

	/** @type {Map<AnimationTool, number>} */
	#usedTools = new Map();

	/** @type {number[]} */
	#cursorPos = [0, 0];

	/** @type {number[]|null} */
	#selection = null;

	/** @type {number[]} */
	#selectionOffset = [0, 0];

	#requestedAnimationFrame;
	#cursorRequestedAnimationFrame;

	/**
	 * @param {CommitObserver} commitObserver
	 * @param {AnimationLayers} layers
	 * @param {number[][]} palette
	 */
	constructor(commitObserver, layers, palette) {
		this.#commitObserver = commitObserver;
		this.#canvas = document.createElement('canvas');
		this.#ctx = this.#canvas.getContext('2d');

		this.#cursorCanvas = document.createElement('canvas');
		this.#cursorCtx = this.#cursorCanvas.getContext('2d');

		this.#srcCanvas = document.createElement('canvas');
		this.#srcCanvas.width = PX_COLS;
		this.#srcCanvas.height = PX_ROWS;
		this.#srcCtx = this.#srcCanvas.getContext('2d');

		this.#layers = layers;
		this.#palette = palette;

		const cont = document.querySelector('.canvas-container');
		cont.appendChild(this.#canvas);
		cont.appendChild(this.#cursorCanvas);

		this.#listenEvents(cont);

		document.querySelector('.button[data-role="zoom-in"]').onclick = () => this.#setScale(1);
		document.querySelector('.button[data-role="zoom-out"]').onclick = () => this.#setScale(-1);
	}

	/**
	 * @return {CommitObserver}
	 */
	get commitObserver() {
		return this.#commitObserver;
	}

	/**
	 * @return {AnimationLayers}
	 */
	get layers() {
		return this.#layers;
	}

	/**
	 * @return {number[][]}
	 */
	get palette() {
		return this.#palette;
	}

	/**
	 * @return {number[]}
	 */
	getPosition() {
		return [this.#x, this.#y];
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 */
	setPosition(x, y) {
		const halfCols = PX_COLS >> 1;
		const halfRows = PX_ROWS >> 1;

		this.#x = Math.max(Math.min(x, halfCols * PX_SIZE), -halfCols * PX_SIZE);
		this.#y = Math.max(Math.min(y, halfRows * PX_SIZE), -halfRows * PX_SIZE);
		this.#cachedRect = undefined;
		this.render();
		this.#renderCursor();
	}

	getScale() {
		return this.#scale;
	}

	resizeToContainer() {
		const p = this.#canvas.parentElement;
		if (!p) {
			return;
		}

		this.#cachedRect = undefined;

		for (const c of [this.#canvas, this.#cursorCanvas]) {
			c.width = p.offsetWidth * SCREEN_SCALE;
			c.height = (p.offsetHeight - 1) * SCREEN_SCALE;
			c.style.width = `${p.offsetWidth}px`;
			c.style.height = `${p.offsetHeight - 1}px`;
		}
	}

	render() {
		if (this.#requestedAnimationFrame) {
			cancelAnimationFrame(this.#requestedAnimationFrame);
		}

		this.#requestedAnimationFrame = requestAnimationFrame(() => {
			this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
			this.#ctx.imageSmoothingEnabled = false;
			this.#ctx.webkitImageSmoothingEnabled = false;
			this.#ctx.mozImageSmoothingEnabled = false;
			this.#drawLayers();
			this.#drawGrid();
		});
	}

	/**
	 * @param {AnimationTool|null} tool
	 */
	setTool(tool) {
		if (this.#tool === tool) {
			return;
		}

		if (this.#tool) {
			this.#tool.unload();
		}

		if (!this.#usedTools.has(tool)) {
			this.#usedTools.set(tool, Math.max(...[...this.#usedTools.values(), 0]) + 1);
		}

		this.#tool = tool;
		this.#layers.commitTransactions();
		this.applySelectionTranslate();
		this.render();
		this.#renderCursor();
	}

	/**
	 * @return {AnimationTool|null}
	 */
	getTool() {
		return this.#tool;
	}

	setSelection(col1, row1, col2, row2) {
		col1 = Math.max(0, Math.min(col1, PX_COLS));
		col2 = Math.max(0, Math.min(col2, PX_COLS));
		row1 = Math.max(0, Math.min(row1, PX_ROWS));
		row2 = Math.max(0, Math.min(row2, PX_ROWS));
		const fromCol = Math.min(col1, col2);
		const fromRow = Math.min(row1, row2);
		const toCol = Math.max(col1, col2);
		const toRow = Math.max(row1, row2);

		this.#selectionOffset = [0, 0];

		if (toCol - fromCol <= 1 || toRow - fromRow <= 1) {
			this.#selection = null;
		} else {
			this.#selection = [fromCol, fromRow, toCol - fromCol, toRow - fromRow];
		}

		this.#renderCursor();
	}

	translateSelection(deltaCol, deltaRow) {
		this.#selectionOffset[0] = deltaCol;
		this.#selectionOffset[1] = deltaRow;
		this.#renderCursor();
	}

	getSelection() {
		if (!this.#selection) {
			return null;
		}

		return [
			this.#selection[0],
			this.#selection[1],
			this.#selection[0] + this.#selection[2],
			this.#selection[1] + this.#selection[3],
		];
	}

	applySelectionTranslate() {
		if (this.#selection == null || (this.#selectionOffset[0] === 0 && this.#selectionOffset[1] === 0)) {
			return;
		}
		const sel = this.getSelection();
		this.setSelection(
			sel[0] - this.#selectionOffset[0],
			sel[1] - this.#selectionOffset[1],
			sel[2] - this.#selectionOffset[0],
			sel[3] - this.#selectionOffset[1]
		);
	}

	getSelectionOffset() {
		return [...this.#selectionOffset];
	}

	reset() {
		this.#x = 0;
		this.#y = 0;
		this.#scale = 1;
		this.#selection = null;
		this.#selectionOffset = [0, 0];
		this.#layers.reset();
		this.render();
		this.#renderCursor();
	}

	getState() {
		return {
			x: this.#x,
			y: this.#y,
			scale: this.#scale,
			tool: this.#usedTools.get(this.#tool),
			selection: JSON.parse(JSON.stringify(this.#selection)),
			selectionOffset: JSON.parse(JSON.stringify(this.#selectionOffset)),
			layers: this.#layers.getState()
		};
	}

	setState(data) {
		this.#cachedRect = undefined;
		this.#x = data.x;
		this.#y = data.y;
		this.#scale = Math.max(0.5, data.scale);

		/*[...this.#usedTools.entries()].forEach(([tool, id]) => {
			if (data.tool === id && this.#tool !== tool) {
				if (this.#tool) {
					this.#tool.unload();
				}

				this.#tool = tool;
			}
		});*/

		this.#selection = JSON.parse(JSON.stringify(data.selection));
		this.#selectionOffset = JSON.parse(JSON.stringify(data.selectionOffset));

		this.#layers.setState(data.layers);

		this.render();
		this.#renderCursor();
	}

	#renderCursor() {
		if (this.#cursorRequestedAnimationFrame) {
			cancelAnimationFrame(this.#cursorRequestedAnimationFrame);
		}

		this.#cursorRequestedAnimationFrame = requestAnimationFrame(() => {
			const {x, y, pxSize} = this.#getRenderRect();
			this.#cursorCtx.clearRect(0, 0, this.#cursorCanvas.width, this.#cursorCanvas.height);

			if (this.#tool) {
				this.#cursorCtx.save();
				this.#tool.renderCursor(this.#cursorCtx, x, y, this.#cursorPos[0], this.#cursorPos[1], pxSize);
				this.#cursorCtx.restore();
			}

			if (this.#selection) {
				this.#cursorCtx.save();
				this.#cursorCtx.lineWidth = 2;
				this.#cursorCtx.beginPath();
				this.#cursorCtx.rect(
					x + this.#selection[0] * pxSize - this.#selectionOffset[0] * pxSize,
					y + this.#selection[1] * pxSize - this.#selectionOffset[1] * pxSize,
					this.#selection[2] * pxSize,
					this.#selection[3] * pxSize,
				);
				this.#cursorCtx.setLineDash([10, 10]);
				this.#cursorCtx.strokeStyle = CURSOR_COLOR;
				this.#cursorCtx.stroke();
				this.#cursorCtx.strokeStyle = CURSOR_COLOR_DARK;
				this.#cursorCtx.lineDashOffset = 10;
				this.#cursorCtx.stroke();
				this.#cursorCtx.restore();
			}
		});
	}

	#listenEvents(cont) {
		let startXY = {canvasX: 0, canvasY: 0, col: 0, row: 0};
		let lastXY = {canvasX: 0, canvasY: 0, col: 0, row: 0};
		let isTouchPointer = false;

		const convClientXY = (e) => {
			let x, y;
			if (window.TouchEvent && e instanceof TouchEvent) {
				x = e.touches[0].clientX;
				y = e.touches[0].clientY;
			} else {
				x = e.clientX;
				y = e.clientY;
			}

			const canvasRect = this.#getRenderRect();

			x += cont.scrollLeft;
			y += cont.scrollTop;

			let {left, top} = cont.getBoundingClientRect();
			left += cont.scrollLeft;
			top += cont.scrollTop;

			const canvasX = (x - left);
			const canvasY = (y - top);

			const col = Math.floor((canvasX * SCREEN_SCALE - canvasRect.x) / canvasRect.pxSize);
			const row = Math.floor((canvasY * SCREEN_SCALE - canvasRect.y) / canvasRect.pxSize);

			return {canvasX, canvasY, col, row};
		}

		const pointerMove = /** @param {MouseEvent|TouchEvent} e */(e) => {
			if (!this.#tool) {
				return;
			}
			lastXY = convClientXY(e);

			this.#cursorPos[0] = lastXY.col;
			this.#cursorPos[1] = lastXY.row;
			this.#renderCursor();

			this.#tool.handleMove(lastXY.col, lastXY.row, lastXY.canvasX - startXY.canvasX, lastXY.canvasY - startXY.canvasY);
		};

		const pointerUp = () => {
			isTouchPointer = false;

			if (this.#tool) {
				this.#tool.handleEnd(lastXY.col, lastXY.row, lastXY.canvasX, lastXY.canvasY);
			}

			document.removeEventListener('mousemove', pointerMove, {capture: true});
			document.removeEventListener('mouseup', pointerUp, {capture: true});
			cont.removeEventListener('touchmove', pointerMove);
			cont.removeEventListener('touchend', pointerUp);
		};

		cont.addEventListener('touchstart', /** @param {TouchEvent} e */(e) => {
			isTouchPointer = true;
			e.preventDefault();

			startXY = convClientXY(e);
			this.#tool.handleStart(startXY.col, startXY.row, startXY.canvasX, startXY.canvasY);

			cont.addEventListener('touchmove', pointerMove);
			cont.addEventListener('touchend', pointerUp);
		});

		cont.addEventListener('wheel', /** @param {WheelEvent} e */(e) => {
			e.stopPropagation();
			e.preventDefault();
			if (e.deltaY === 0) {
				return;
			}
			this.#setScale(e.deltaY > 0 ? -1 : 1);
		});

		document.addEventListener('mousemove', (e) => {
			if (!this.#tool) {
				return;
			}
			lastXY = convClientXY(e);
			this.#cursorPos[0] = lastXY.col;
			this.#cursorPos[1] = lastXY.row;
			this.#renderCursor();
		});

		cont.addEventListener('mousedown', /** @param {MouseEvent} e */(e) => {
			if (isTouchPointer) {
				return;
			}
			startXY = convClientXY(e);
			this.#tool && this.#tool.handleStart(startXY.col, startXY.row, startXY.canvasX, startXY.canvasY);
			document.addEventListener('mousemove', pointerMove, {capture: true});
			document.addEventListener('mouseup', pointerUp, {capture: true});
		});
	}

	#setScale(delta) {
		this.#scale = SCALES[Math.max(0, Math.min(SCALES.length - 1, SCALES.indexOf(this.#scale) + delta))];
		this.#cachedRect = undefined;
		this.render();
		this.#renderCursor();
	}

	#drawLayers() {
		const {x, y, width, height} = this.#getRenderRect();
		this.#ctx.save();
		const imgData = this.#layers.getImageData(this.#palette);
		this.#srcCtx.putImageData(imgData, 0, 0);
		this.#ctx.drawImage(this.#srcCanvas, x, y, width, height);
		this.#ctx.restore();
	}

	#drawGrid() {
		const {x, y, width, height, pxSize} = this.#getRenderRect();
		this.#ctx.save();
		this.#ctx.lineWidth = Math.min(1, this.#scale);
		this.#ctx.globalAlpha = 0.6;
		this.#ctx.strokeStyle = GRID_COLOR;
		this.#ctx.beginPath();

		for (let c = 0; c <= PX_COLS; c++) {
			const cx = x + c * pxSize;
			this.#ctx.moveTo(cx, y);
			this.#ctx.lineTo(cx, y + height);
		}

		for (let r = 0; r <= PX_ROWS; r++) {
			const cy = y + r * pxSize;
			this.#ctx.moveTo(x, cy);
			this.#ctx.lineTo(x + width, cy);
		}

		this.#ctx.stroke();
		this.#ctx.restore();
	}

	/**
	 * @return {{x: number, width: number, pxSize: number, y: number, height: number}}
	 */
	#getRenderRect() {
		if (this.#cachedRect) {
			return this.#cachedRect;
		}

		const pxSize = PX_SIZE * this.#scale * SCREEN_SCALE;
		const width = PX_COLS * pxSize;
		const height = PX_ROWS * pxSize;
		const centerX = this.#canvas.width >> 1;
		const centerY = this.#canvas.height >> 1;
		this.#cachedRect = {
			x: centerX - (width >> 1) + Math.round(this.#x * this.#scale * SCREEN_SCALE),
			y: centerY - (height >> 1) + Math.round(this.#y * this.#scale * SCREEN_SCALE),
			width,
			height,
			pxSize,
		};

		return this.#cachedRect;
	}
}
