import {FRAMES, PX_COLS, PX_ROWS} from "./config";
import {Layer} from "./layer";
import {CommitObserver} from "./commit-observer";
import {ByteArrayReader} from "./helpers/byte-array-reader";

const SIGNATURE = 'f796img'.split('').map(c => c.charCodeAt(0));
const CHUNK_TYPE_CANVAS = 1;
const CHUNK_TYPE_LAYER = 2;
const CHUNK_TYPE_FRAMES_ARRAY = 3;
const CHUNK_TYPE_FRAME = 4;

export class AnimationFile {
	/**
	 * @param {AnimationCanvas} canvas
	 * @return {Promise<string>}
	 */
	async packToFinalFile(canvas) {
		const dstLayer = new Layer(new CommitObserver(), '');
		for (const layer of [...canvas.layers.layers].reverse()) {
			dstLayer.mergeLayer(layer);
		}

		const out = [...SIGNATURE, CHUNK_TYPE_CANVAS];
		out.push(1);

		AnimationFile.#packLayer(out, dstLayer);

		const blob = new Blob([new Uint8Array(out)], {type: 'octet/stream'});
		const reader = new FileReader();
		return new Promise(r => {
			reader.readAsDataURL(blob);
			reader.onloadend = () => {
				const res = reader.result;
				r(res.substr(res.indexOf(',') + 1));
			};
		});
	}

	/**
	 * @param {AnimationCanvas} canvas
	 * @return {(number|number)[]}
	 */
	pack(canvas) {
		const out = [...SIGNATURE, CHUNK_TYPE_CANVAS];
		out.push(canvas.layers.layers.length);

		for (const layer of canvas.layers.layers) {
			AnimationFile.#packLayer(out, layer);
		}
		return out;
	}

	/**
	 * @param {number[]|Uint8Array} bytes
	 * @param {AnimationCanvas} canvas
	 */
	unpack(bytes, canvas) {
		canvas.setState(this.unpackState(bytes));
	}

	/**
	 * @param {number[]|Uint8Array|Uint8ClampedArray} bytes
	 * @return {object}
	 */
	unpackState(bytes) {
		const blob = new ByteArrayReader(bytes);

		if (blob.readBytes(SIGNATURE.length).join(',') !== SIGNATURE.join(',')) {
			throw new Error('Wrong file signature');
		}

		if (blob.readUint8() !== CHUNK_TYPE_CANVAS) {
			throw new Error('Missing canvas chunk type');
		}

		const len = blob.readUint8();
		const state = {
			x: 0,
			y: 0,
			scale: 1,
			tool: 0,
			selection: null,
			selectionOffset: [0, 0],
			layers: {
				current: {
					layer: 0,
					frame: 0
				},
				layers: []
			}
		};

		for (let i = 0; i < len; i++) {
			state.layers.layers.push(AnimationFile.#unpackLayer(blob));
		}

		return state;
	}

	/**
	 * @param {number[]} out
	 * @param {Layer} layer
	 */
	static #packLayer(out, layer) {
		const state = layer.getState();
		out.push(CHUNK_TYPE_LAYER);
		out.push(...AnimationFile.#packString(state.id));
		out.push(...AnimationFile.#packString(state.name));
		AnimationFile.#packFrames(out, state.frames);
	}

	/**
	 * @param {ByteArrayReader} blob
	 */
	static #unpackLayer(blob) {
		const state = {};
		if (blob.readUint8() !== CHUNK_TYPE_LAYER) {
			throw new Error('Missing layer chunk type');
		}

		state.id = blob.readShortString();
		state.name = blob.readShortString();
		state.frames = AnimationFile.#unpackFrames(blob);
		state.transaction = null;
		state.transactionOffset = [0, 0];
		state.visible = true;

		return state;
	}

	static #packString(str) {
		const uint8Arr = new TextEncoder().encode(str);
		return [uint8Arr.length, ...uint8Arr];
	}

	static #packFrames(out, frames) {
		out.push(CHUNK_TYPE_FRAMES_ARRAY);

		let firstFrameData = frames[0];

		if (!firstFrameData) {
			firstFrameData = new Array(PX_ROWS).fill(null).map(_ => new Array(PX_COLS).fill(0));
		}

		for (let f = 0; f < FRAMES; f++) {
			if (frames[f] === null) {
				out.push(CHUNK_TYPE_FRAME, 0, 0);
				continue;
			}

			const bytes = AnimationFile.#packFramePixels(f, frames[f], firstFrameData);
			out.push(
				CHUNK_TYPE_FRAME,
				(bytes.length >> 8) & 0xFF,
				bytes.length & 0xFF,
				...bytes
			);
		}
	}

	/**
	 * @param {number} frame
	 * @param {number[][]} frameData
	 * @param {number[][]} firstFrameData
	 */
	static #packFramePixels(frame, frameData, firstFrameData) {
		const bytes = [];
		let prevColor = -1;
		let prevColorCount = 0;
		let isRepeatFirstFrame = false;

		const maxRepeatedColorCount = 0xFFFF - 1;
		const maxFirstFrameRepeatedCount = 2 ** (6 + 8) - 1;
		const mask6bit = 2 ** 6 - 1;
		const lastRow = PX_ROWS - 1;
		const lastCol = PX_COLS - 1;

		for (let r = 0; r < PX_ROWS; r++) {
			const row = frameData[r];
			const row0 = firstFrameData[r];

			for (let c = 0; c < PX_COLS; c++) {
				const color = row[c];
				const isLastPixel = r === lastRow && c === lastCol;

				if (
					frame > 0
					&& color === row0[c]
					&& (prevColorCount === 0 || isRepeatFirstFrame)
					&& prevColorCount < maxFirstFrameRepeatedCount
					&& !isLastPixel
				) {
					prevColorCount++;
					isRepeatFirstFrame = true;
					continue;
				}

				if (isRepeatFirstFrame) {
					// repeated first frame pixels with max length 16384
					bytes.push((0b11 << 6) | ((prevColorCount >> 8) & mask6bit));
					bytes.push(prevColorCount & 0xFF);

					isRepeatFirstFrame = false;
					prevColorCount = 0;
					prevColor = -1;
				}

				if (prevColor === color && prevColorCount < maxRepeatedColorCount && !isLastPixel) {
					prevColorCount++;
					continue;
				} else if (prevColorCount > 0) {
					prevColorCount++; // include first pixel

					if (prevColorCount > 0xFF) {
						// repeated pixels with max length 65535
						bytes[bytes.length - 1] = (0b10 << 6) | prevColor;
						bytes.push(
							(prevColorCount >> 8) & 0xFF,
							prevColorCount & 0xFF,
						);
					} else {
						// repeated pixels with max length 255
						bytes[bytes.length - 1] = (0b01 << 6) | prevColor;
						bytes.push(prevColorCount & 0xFF);
					}

					prevColorCount = 0;
				}

				prevColor = color;
				bytes.push(color & mask6bit);
			}
		}

		return bytes;
	}

	/**
	 * @param {ByteArrayReader} blob
	 * @return {(number[][]|null)[]}
	 */
	static #unpackFrames(blob) {
		const out = [];

		if (blob.readUint8() !== CHUNK_TYPE_FRAMES_ARRAY) {
			throw new Error('Missing expected frame array chunk');
		}

		let firstFrameData = null;

		for (let f = 0; f < FRAMES; f++) {
			const chunkType = blob.readUint8();
			if (chunkType !== CHUNK_TYPE_FRAME) {
				throw new Error('Missing expected frame chunk: frame #' + f);
			}

			const length = blob.readUint16();
			if (length === 0) {
				out.push(null);
				continue;
			}

			const data = blob.readBytes(length);
			if (data.length !== length) {
				throw new Error('Invalid length of bytes');
			}

			out.push(AnimationFile.#unpackFramePixels(data, firstFrameData))

			if (f === 0) {
				firstFrameData = out[0].flat();
			}
		}

		return out;
	}

	/**
	 * @param {number[]} data
	 * @param {number[]} firstFrameData
	 * @return {number[][]}
	 */
	static #unpackFramePixels(data, firstFrameData) {
		const pixels = [];
		const mask6bit = 2 ** 6 - 1;

		for (let i = 0; i < data.length; i++) {
			const code = (data[i] >> 6) & 0b11;
			if (code === 0) {
				// single pixel
				pixels.push(data[i] & mask6bit);

			} else if (code === 1) {
				// repeated color, max 255
				if (i + 1 >= data.length) {
					throw new Error('Not enough bytes for unpack repeated pixels (max 256)');
				}
				pixels.push(...(new Array(data[i + 1]).fill(data[i] & mask6bit)));
				i += 1;
			} else if (code === 2) {
				// repeated color, max 65535
				if (i + 2 >= data.length) {
					throw new Error('Not enough bytes for unpack repeated pixels (max 65535)');
				}
				const len = (data[i + 1] << 8) | data[i + 2];
				pixels.push(...(new Array(len).fill(data[i] & mask6bit)));
				i += 2;
			} else if (code === 3) {
				// repeated first frame pixels, max 16384
				if (i + 1 >= data.length) {
					throw new Error('Not enough bytes for unpack repeated first frame pixels');
				}

				const len = ((data[i] & mask6bit) << 8) | data[i + 1];
				for (let j = pixels.length, to = pixels.length + len; j < to; j++) {
					if (firstFrameData === null) {
						pixels.push(0);
					} else {
						pixels.push(firstFrameData[j]);
					}
				}
				i += 1;
			}
		}

		if (pixels.length !== PX_ROWS * PX_COLS) {
			throw new Error('Invalid unpacked pixels count: ' + pixels.length);
		}

		const out = []
		for (let r = 0; r < PX_ROWS; r++) {
			out.push(pixels.splice(0, PX_COLS));
		}

		return out;
	}
}