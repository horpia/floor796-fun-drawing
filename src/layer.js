import {FRAMES, PX_COLS, PX_ROWS} from "./config";

let seq = 0;

export class Layer {
	name = '';

	/** @type {CommitObserver} */
	#commitObserver;

	/** @type {string} */
	#id;

	/** @type {(number[][]|null)[]} */
	#frames;

	/** @type {(number[][]|null)[]} */
	#transactionLayer = null;

	#transactionOffset = [0, 0];

	/** @type {function()[]} */
	#observers = [];

	#isVisible = true;

	/**
	 * @param {CommitObserver} commitObserver
	 * @param {string} name
	 */
	constructor(commitObserver, name) {
		this.#commitObserver = commitObserver;
		this.#id = Date.now() + '.' + Math.ceil(Math.random() * 100000) + '.' + (++seq);
		this.name = name;
		this.#frames = new Array(FRAMES).fill(null);
	}

	get id() {
		return this.#id;
	}

	get isVisible() {
		return this.#isVisible;
	}

	setVisibility(flag) {
		this.#isVisible = flag;
	}

	addObserver(func) {
		this.#observers.push(func);
	}

	createBlankKeyframe(frame) {
		const frames = this.#transactionLayer || this.#frames;

		frames[frame] = new Array(PX_ROWS)
			.fill(null)
			.map(_ => new Array(PX_COLS).fill(0));

		if (!this.#transactionLayer) {
			this.#callObservers();
			this.#commitObserver.commit();
		}
	}

	createKeyframe(frame) {
		const frames = this.#transactionLayer || this.#frames;
		if (frames[frame]) {
			return;
		}

		if (this.#transactionLayer) {
			this.createBlankKeyframe(frame);
			return;
		}

		const nearestFrame = this.#getNearestKeyframe(frame);
		if (nearestFrame < 0) {
			this.createBlankKeyframe(frame);
			return;
		}

		if ('structuredClone' in window) {
			frames[frame] = structuredClone(frames[nearestFrame]);
		} else {
			frames[frame] = JSON.parse(JSON.stringify(frames[nearestFrame]));
		}

		if (!this.#transactionLayer) {
			this.#callObservers();
		}
	}

	insertFrame(frame) {
		if (frame === FRAMES - 1) {
			return false;
		}

		const statuses = this.getFramesStatus();
		if (statuses[statuses.length - 1] > 1) {
			alert(
				floor796.detectUserLanguage() === 'ru'
					? 'В таймлайне текущего слоя нет места для вставки кадра'
					: 'There is no space in the timeline of the current layer to insert a frame'
			);
			return false;
		}

		this.#frames.splice(frame + 1, 0, null);
		this.#frames.pop();

		if (!this.#transactionLayer) {
			this.#callObservers();
			this.#commitObserver.commit();
		}

		return true;
	}

	removeFrame(frame) {
		if (this.#frames[frame]) {
			this.#frames[frame] = null;

			if (this.#transactionLayer) {
				this.#transactionLayer[frame] = null;
			}
		} else {
			this.#frames.splice(frame, 1);
			this.#frames.push(null);

			if (this.#transactionLayer) {
				this.#transactionLayer.splice(frame, 1);
				this.#transactionLayer.push(null);
			}
		}

		if (!this.#transactionLayer) {
			this.#callObservers();
			this.#commitObserver.commit();
		}
	}

	/**
	 * @return {number[]} 0 - repeated empty, 1 - repeated key, 2 - blank key, 3 - filled key
	 */
	getFramesStatus() {
		const out = [];
		let hasKeyFrame = false;

		const checkPixels = (pixels) => {
			for (let r = 0; r < PX_ROWS; r++) {
				const row = pixels[r];
				for (let c = 0; c < PX_COLS; c++) {
					if (row[c] !== 0) {
						return true
					}
				}
			}

			return false;
		}

		for (let f = 0; f < FRAMES; f++) {
			let pixels = this.#frames[f];
			if (pixels === null) {
				out.push(hasKeyFrame ? 1 : 0); // repeated frame
				continue;
			}

			if (checkPixels(pixels)) {
				hasKeyFrame = true;
				out.push(3); // filled key frame
				continue;
			}

			if (this.#transactionLayer && this.#transactionLayer[f] && checkPixels(this.#transactionLayer[f])) {
				hasKeyFrame = true;
				out.push(3); // filled key frame
				continue;
			}

			hasKeyFrame = false;
			out.push(2); // blank key frame
		}

		return out;
	}

	hasTransaction() {
		return this.#transactionLayer !== null;
	}

	startTransaction() {
		this.#transactionLayer = new Array(FRAMES).fill(null);
	}

	startTransactionFromSelection(frame, selection) {
		if (!this.#frames[frame]) {
			this.createKeyframe(frame);
		}

		this.#transactionOffset = [0, 0];
		this.#transactionLayer = new Array(FRAMES).fill(null);
		this.createBlankKeyframe(frame);

		const frmDataFrom = this.#frames[frame];
		const frmDataTo = this.#transactionLayer[frame];

		for (let r = selection[1]; r < selection[3]; r++) {
			const row = frmDataFrom[r];
			for (let c = selection[0]; c < selection[2]; c++) {
				frmDataTo[r][c] = row[c];
				frmDataFrom[r][c] = 0;
			}
		}
	}

	startTransactionFromBuffer(frame, buffer) {
		this.#transactionOffset = [0, 0];
		this.#transactionLayer = new Array(FRAMES).fill(null);

		if (!this.#frames[frame]) {
			this.createKeyframe(frame);
		}

		this.createBlankKeyframe(frame);

		this.#transactionLayer[frame] = JSON.parse(JSON.stringify(buffer));
	}

	translateTransaction(deltaCol, deltaRow) {
		this.#transactionOffset[0] = deltaCol;
		this.#transactionOffset[1] = deltaRow;
	}

	getTransactionOffset() {
		return [...this.#transactionOffset];
	}

	commitTransaction() {
		if (!this.#transactionLayer) {
			return;
		}

		const transaction = this.#transactionLayer;
		this.#transactionLayer = null;

		for (let frame = 0; frame < FRAMES; frame++) {
			if (!transaction[frame]) {
				continue;
			}

			if (!this.#frames[frame]) {
				this.createKeyframe(frame);
			}

			const frmDataFrom = transaction[frame];
			const frmDataTo = this.#frames[frame];

			for (let r = 0; r < PX_ROWS; r++) {
				const r2 = r + this.#transactionOffset[1];
				if (r2 < 0 || r2 >= PX_ROWS) {
					continue;
				}

				const row = frmDataFrom[r2];
				for (let c = 0; c < PX_COLS; c++) {
					const c2 = c + this.#transactionOffset[0];
					if (c2 < 0 || c2 >= PX_COLS) {
						continue;
					}

					if (row[c2] === 0) {
						// transparent color
						continue;
					}

					frmDataTo[r][c] = row[c2];
				}
			}
		}

		this.#transactionOffset[0] = 0;
		this.#transactionOffset[1] = 0;
		this.#callObservers();
		this.#commitObserver.commit();
	}

	/**
	 * @param {number} frame
	 * @param {boolean} createFrameIfNotExists
	 * @return {number[][]|null}
	 */
	getPixels(frame, createFrameIfNotExists = false) {
		const frames = this.#transactionLayer || this.#frames;

		if (!frames[frame]) {
			if (createFrameIfNotExists) {
				this.createKeyframe(frame);
			} else {
				return null;
			}
		}

		return frames[frame];
	}

	getPixel(frame, col, row) {
		if (this.#transactionLayer && this.#transactionLayer[frame]) {
			const color = this.#transactionLayer[frame]
				[row + this.#transactionOffset[1]]
				[col + this.#transactionOffset[0]];

			if (color !== 0) {
				return color;
			}
		}

		frame = this.#getNearestKeyframe(frame);
		if (frame < 0) {
			return 0;
		}

		return this.#frames[frame][row][col];
	}

	setPixels(frame, pixels) {
		const frames = this.#transactionLayer || this.#frames;

		if (!frames[frame]) {
			this.createKeyframe(frame);
		}

		frames[frame] = pixels;
	}

	putPixel(frame, colorIndex, col, row, size = 1, selection = null) {
		if (this.#transactionLayer) {
			col += this.#transactionOffset[0];
			row += this.#transactionOffset[1];
		}

		if (col >= PX_COLS || row >= PX_ROWS || col < 0 || row < 0) {
			return false;
		}

		const frames = this.#transactionLayer || this.#frames;

		if (!frames[frame]) {
			this.createKeyframe(frame);
		}

		const frmData = frames[frame];

		size--;

		for (let r = row - size; r <= row + size; r++) {
			for (let c = col - size; c <= col + size; c++) {
				if (c >= PX_COLS || r >= PX_ROWS || c < 0 || r < 0) {
					continue;
				}

				if (
					selection !== null
					&& (
						c >= selection[2]
						|| r >= selection[3]
						|| c < selection[0]
						|| r < selection[1]
					)
				) {
					// outside selection
					continue;
				}

				frmData[r][c] = colorIndex;
			}
		}

		return true;
	}

	clearRect(frame, col1, row1, col2, row2) {
		col1 = Math.max(0, Math.min(col1, col2, PX_COLS));
		row1 = Math.max(0, Math.min(row1, row2, PX_ROWS));
		col2 = Math.min(PX_COLS, Math.max(col1, col2, 0));
		row2 = Math.min(PX_ROWS, Math.max(row1, row2, 0));
		const frames = this.#transactionLayer || this.#frames;
		if (!frames[frame]) {
			return;
		}

		for (let r = row1; r < row2; r++) {
			const row = frames[frame][r];
			for (let c = col1; c < col2; c++) {
				row[c] = 0;
			}
		}
	}

	/**
	 * @param {number} frame
	 * @param {number[][]} palette
	 * @return {ImageData}
	 */
	getImageData(frame, palette) {
		const imgData = new ImageData(PX_COLS, PX_ROWS);
		this.mergeImageData(imgData, frame, palette);
		return imgData;
	}

	clone(name) {
		const l = new Layer(this.#commitObserver, name);
		l.#frames = JSON.parse(JSON.stringify(this.#frames));
		return l;
	}

	/**
	 * @param {Layer} layer
	 */
	mergeLayer(layer) {
		this.commitTransaction();

		const framesFrom = layer.#frames;
		const framesTo = this.#frames;


		for (let f = 0; f < FRAMES; f++) {
			if (framesFrom[f] !== null && framesTo[f] === null) {
				this.createKeyframe(f);
			}
		}

		for (let f = 0; f < FRAMES; f++) {
			if (framesFrom[f] === null && framesTo[f] === null) {
				continue;
			}

			let frameFrom, frameTo;

			let lastKeyframe = layer.#getNearestKeyframe(f);
			if (lastKeyframe === -1) {
				continue;
			}
			frameFrom = framesFrom[lastKeyframe];

			frameTo = framesTo[f];

			for (let r = 0; r < PX_ROWS; r++) {
				const row = frameFrom[r];
				for (let c = 0; c < PX_COLS; c++) {
					if (row[c] === 0) {
						continue;
					}

					frameTo[r][c] = row[c];
				}
			}
		}
	}

	/**
	 * @param {ImageData} imgData
	 * @param {number} frame
	 * @param {number[][]} palette
	 */
	mergeImageData(imgData, frame, palette) {
		const nearestKeyframe = this.#getNearestKeyframe(frame);
		if (nearestKeyframe >= 0) {
			Layer.#mergeFrameData(imgData, this.#frames[nearestKeyframe], palette, 0, 0);
		}

		if (this.#transactionLayer && this.#transactionLayer[frame]) {
			Layer.#mergeFrameData(
				imgData,
				this.#transactionLayer[frame],
				palette,
				this.#transactionOffset[0],
				this.#transactionOffset[1]
			);
		}
	}

	getState() {
		return {
			id: this.#id,
			name: this.name,
			frames: JSON.parse(JSON.stringify(this.#frames)),
			transaction: JSON.parse(JSON.stringify(this.#transactionLayer)),
			transactionOffset: JSON.parse(JSON.stringify(this.#transactionOffset)),
			visible: this.#isVisible,
		};
	}

	setState(data) {
		this.#id = data.id;
		this.name = data.name;
		this.#frames = JSON.parse(JSON.stringify(data.frames));
		this.#transactionLayer = JSON.parse(JSON.stringify(data.transaction));
		this.#transactionOffset = JSON.parse(JSON.stringify(data.transactionOffset));
		this.#isVisible = data.visible === undefined ? true : data.visible;
	}

	/**
	 * @param {ImageData} imgData
	 * @param {number[][]} frmData
	 * @param {number[][]} palette
	 * @param {number} offsetX
	 * @param {number} offsetY
	 */
	static #mergeFrameData(imgData, frmData, palette, offsetX, offsetY) {
		const rgba = imgData.data;
		let i = 0;

		for (let r = 0; r < PX_ROWS; r++) {
			const r2 = r + offsetY;
			if (r2 < 0 || r2 >= PX_ROWS) {
				i += 4 * PX_COLS;
				continue;
			}

			const row = frmData[r2];

			for (let c = 0; c < PX_COLS; c++) {
				const c2 = c + offsetX;
				if (c2 < 0 || c2 >= PX_COLS) {
					i += 4;
					continue;
				}

				if (row[c2] === 0) {
					// transparent color
					i += 4;
					continue;
				}

				const [r, g, b] = palette[row[c2]];
				rgba[i++] = r;
				rgba[i++] = g;
				rgba[i++] = b;
				rgba[i++] = 255;
			}
		}
	}

	#getNearestKeyframe(frame) {
		for (let f = frame; f >= 0; f--) {
			if (this.#frames[f] !== null) {
				return f;
			}
		}

		return -1;
	}

	#callObservers() {
		this.#observers.map(o => o());
	}
}
