import {Layer} from "./layer";
import {FRAMES, PX_COLS, PX_ROWS} from "./config";

export class AnimationLayers {
	/** @type {CommitObserver} */
	#commitObserver;

	/** @type {Layer[]} */
	#layers = [];

	/** @type {number} */
	#currentLayer = 0;

	/** @type {number} */
	#currentFrame = 0;

	/**
	 * @param {CommitObserver} commitObserver
	 */
	constructor(commitObserver) {
		this.#commitObserver = commitObserver;
		this.#layers.push(new Layer(this.#commitObserver, this.#getNewLayerName()));
	}

	get currentLayer() {
		return this.#layers[this.#currentLayer];
	}

	get currentLayerIndex() {
		return this.#currentLayer;
	}

	get currentFrame() {
		return this.#currentFrame;
	}

	get layers() {
		return this.#layers;
	}

	setCurrentFrame(index) {
		index = Math.max(0, Math.min(FRAMES - 1, index));
		if (this.#currentFrame === index) {
			return;
		}

		this.commitTransactions();
		this.#currentFrame = index;
	}

	setLayersOrder(list) {
		this.commitTransactions();
		const selLayer = this.currentLayer;
		this.#layers.sort((a, b) => list.indexOf(a) - list.indexOf(b));
		this.#currentLayer = this.#layers.indexOf(selLayer);
		this.#commitObserver.commit();
	}

	setCurrentLayer(index) {
		if (this.#currentLayer === index) {
			return;
		}

		this.commitTransactions();
		this.#currentLayer = Math.max(0, Math.min(this.#layers.length - 1, index));
	}

	insertNewLayer(index) {
		this.commitTransactions();
		this.#layers.splice(index, 0, new Layer(this.#commitObserver, this.#getNewLayerName()));
		this.#currentLayer = index;
		this.#commitObserver.commit();
	}

	duplicateSelectedLayer() {
		this.commitTransactions();
		this.#layers.splice(this.#currentLayer, 0, this.currentLayer.clone(this.#getNewLayerName()));
		this.#commitObserver.commit();
		return true;
	}

	mergeSelectedLayer() {
		this.commitTransactions();
		if (this.#currentLayer === this.#layers.length - 1) {
			alert(
				floor796.detectUserLanguage() === 'ru'
					? 'Для объединения слоев необходимо наличие слоя под текущим выделенным'
					: 'To merge layers, you must have a layer below the current selection'
			);
			return false;
		}

		this.#layers[this.#currentLayer + 1].mergeLayer(this.#layers[this.#currentLayer]);
		this.removeSelectedLayer();
		this.#commitObserver.commit();
		return true;
	}

	removeSelectedLayer() {
		this.commitTransactions();
		this.#layers.splice(this.#currentLayer, 1);

		if (this.#currentLayer === this.#layers.length && this.#currentLayer !== 0) {
			this.#currentLayer--;
		}

		if (this.#layers.length === 0) {
			this.#layers.push(new Layer(this.#commitObserver, this.#getNewLayerName()));
		}

		this.#commitObserver.commit();
	}

	commitTransactions() {
		this.#layers.forEach(l => l.commitTransaction());
	}

	/**
	 * @param {number[][]} palette
	 * @return {ImageData|null}
	 */
	getImageData(palette) {
		let imgData = null;

		for (let i = this.#layers.length - 1; i >= 0; i--) {
			if (!this.#layers[i].isVisible) {
				continue;
			}

			if (imgData === null) {
				imgData = this.#layers[i].getImageData(this.#currentFrame, palette);
			} else {
				this.#layers[i].mergeImageData(imgData, this.#currentFrame, palette);
			}
		}

		return imgData || new ImageData(PX_COLS, PX_ROWS);
	}

	reset() {
		this.#layers = [
			new Layer(this.#commitObserver, '1')
		];
		this.#currentFrame = 0;
		this.#currentLayer = 0;
	}

	getState() {
		this.commitTransactions();
		return {
			current: {
				frame: this.#currentFrame,
				layer: this.#currentLayer,
			},
			layers: this.#layers.map(l => l.getState())
		};
	}

	setState(data) {
		this.#currentFrame = data.current.frame;
		this.#currentLayer = data.current.layer;
		const layersBefore = new Map(this.#layers.map(l => [l.id, l]));
		const layers = [];

		for (let layerData of data.layers) {
			let layer;
			if (layersBefore.has(layerData.id)) {
				layer = layersBefore.get(layerData.id);
			} else {
				layer = new Layer(this.#commitObserver, this.#getNewLayerName());
			}

			layers.push(layer);
			layer.setState(layerData);
		}

		this.#layers = layers;
	}

	#getNewLayerName() {
		let maxId = 0;
		for (const layer of this.#layers) {
			maxId = Math.max(maxId, parseInt(layer.name, 10));
		}

		return `${maxId + 1}`;
	}
}