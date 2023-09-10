import {FRAMES, MAX_LAYERS} from "./config";
import {DragController} from "./helpers/drag-controller";

export class LayersBar {
	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {ToolBar} */
	#toolBar;

	/** @type {HTMLElement[]} */
	#layerElements = [];

	/** @type {Map<HTMLElement, Layer>} */
	#layerMap = new Map();

	/** @type {HTMLDivElement} */
	#listEl = document.querySelector('.layers-list');

	/** @type {HTMLDivElement} */
	#headerFramesEl = document.querySelector('.layers-header-frames');

	constructor(canvas, toolBar) {
		this.#canvas = canvas;
		this.#toolBar = toolBar;
		this.#createFramesHeader();
		document.querySelector('.button[data-role="add-layer"]').onclick = () => this.#insertNewLayer();
		document.querySelector('.button[data-role="remove-layer"]').onclick = () => this.#removeSelectedLayer();
		document.querySelector('.button[data-role="merge-layer"]').onclick = () => this.#mergeLayers();
		document.querySelector('.button[data-role="copy-layer"]').onclick = () => this.#duplicateLayer();
		document.querySelector('.button[data-role="clear-frame"]').onclick = () => this.makeBlankFrame();
		document.querySelector('.button[data-role="insert-frame"]').onclick = () => this.insertFrame();
		document.querySelector('.button[data-role="remove-frame"]').onclick = () => this.removeFrame();
		this.build();
	}

	build() {
		this.#listEl.innerHTML = '';
		this.#layerElements = [];
		this.#layerMap.clear();

		for (const layer of this.#canvas.layers.layers) {
			this.#createLayerTimeline(layer);
		}

		this.#updateSelection();
	}

	sync() {
		const layersMapInv = new Map([...this.#layerMap.entries()].map(([el, l]) => [l, el]));
		this.#layerElements = [];

		for (const layer of this.#canvas.layers.layers) {
			if (layersMapInv.has(layer)) {
				let el = layersMapInv.get(layer);
				this.#listEl.appendChild(el);
				this.#layerElements.push(el);
				this.#updateLayerTimeline(el);
				layersMapInv.delete(layer);
			} else {
				this.#createLayerTimeline(layer);
			}
		}

		for (const el of layersMapInv.values()) {
			el.remove();
			this.#layerMap.delete(el);
		}

		this.#updateSelection();
	}

	selectNextFrame() {
		this.#canvas.layers.setCurrentFrame(this.#canvas.layers.currentFrame + 1);
		this.#updateSelection();
		this.#canvas.render();
	}

	selectPrevFrame() {
		this.#canvas.layers.setCurrentFrame(this.#canvas.layers.currentFrame - 1);
		this.#updateSelection();
		this.#canvas.render();
	}

	makeBlankFrame() {
		this.#canvas.layers.commitTransactions();
		this.#canvas.layers.currentLayer.createBlankKeyframe(this.#canvas.layers.currentFrame);
		this.#canvas.render();
	}

	insertFrame() {
		this.#canvas.layers.commitTransactions();
		this.#canvas.layers.currentLayer.insertFrame(this.#canvas.layers.currentFrame);
		this.#canvas.render();
	}

	removeFrame() {
		this.#canvas.layers.commitTransactions();
		this.#canvas.layers.currentLayer.removeFrame(this.#canvas.layers.currentFrame);
		this.#canvas.render();
	}

	#duplicateLayer() {
		this.#canvas.layers.duplicateSelectedLayer();
		this.#createLayerTimeline(this.#canvas.layers.currentLayer, this.#canvas.layers.currentLayerIndex);
		this.#updateSelection();
		this.#canvas.render();
		this.#toolBar.setTool('move');
	}

	#mergeLayers() {
		const idx = this.#canvas.layers.currentLayerIndex;

		if (!this.#canvas.layers.mergeSelectedLayer()) {
			return;
		}

		this.#layerMap.delete(this.#layerElements[idx]);
		this.#layerElements[idx].remove();
		this.#layerElements.splice(idx, 1);

		this.#updateSelection();
		this.#canvas.render();
	}

	#removeSelectedLayer() {
		const idx = this.#canvas.layers.currentLayerIndex;
		this.#layerMap.delete(this.#layerElements[idx]);
		this.#layerElements[idx].remove();
		this.#layerElements.splice(idx, 1);
		this.#canvas.layers.removeSelectedLayer();

		if (this.#layerElements.length === 0) {
			this.#createLayerTimeline(this.#canvas.layers.currentLayer);
		}

		this.#canvas.render();
		this.#updateSelection();
	}

	#insertNewLayer() {
		if (this.#canvas.layers.layers.length > MAX_LAYERS) {
			alert(
				floor796.detectUserLanguage() === 'ru'
					? 'Слишком много слоев'
					: 'Too many layers'
			);
			return;
		}
		const idx = this.#canvas.layers.currentLayerIndex;
		this.#canvas.layers.insertNewLayer(idx);
		this.#createLayerTimeline(this.#canvas.layers.currentLayer, idx);
		this.#canvas.render();
		this.#updateSelection();
	}

	/**
	 * @param {HTMLElement} el
	 */
	#selectLayer(el) {
		const idx = this.#layerElements.indexOf(el);
		this.#canvas.layers.setCurrentLayer(idx);
		this.#updateSelection();
	}

	#toggleVisibility(el) {
		const idx = this.#layerElements.indexOf(el);
		this.#canvas.layers.layers[idx].setVisibility(!this.#canvas.layers.layers[idx].isVisible);
		this.#updateLayerTimeline(el);
		this.#canvas.render();
	}

	/**
	 * @param {number} idx
	 */
	#selectFrame(idx) {
		idx = Math.max(0, Math.min(idx, FRAMES - 1));
		if (idx === this.#canvas.layers.currentFrame) {
			return;
		}

		this.#canvas.layers.setCurrentFrame(idx);
		this.#updateSelection();
		this.#canvas.render();
	}

	#updateSelection() {
		const idx = this.#canvas.layers.currentLayerIndex;
		for (let i = 0; i < this.#layerElements.length; i++) {
			this.#layerElements[i].classList.toggle('selected', i === idx);
		}

		document.querySelectorAll('.layers-header-frames > div.selected, .layer-frames > div.selected').forEach(el => {
			el.classList.remove('selected');
		});

		const frm = this.#canvas.layers.currentFrame + 1;
		document.querySelectorAll(`.layers-header-frames > div:nth-child(${frm}), .layer-frames > div:nth-child(${frm})`)
			.forEach(el => {
				el.classList.add('selected');
			});
	}

	#updateLayerTimeline(el) {
		const layer = this.#layerMap.get(el);
		if (!layer) {
			return;
		}

		el.querySelector('.layer-flag').dataset.flag = layer.isVisible ? '1' : '0';

		const frames = el.querySelectorAll('.layer-frames div');
		const statuses = layer.getFramesStatus();
		const modifierClasses = {
			repeated: 'repeated-frame',
			blank: 'blank-frame',
			key: 'key-frame',
			closeLeft: 'close-left',
			closeRight: 'close-right',
		};

		for (let i = 0; i < FRAMES; i++) {
			const modifiers = {
				repeated: false,
				blank: false,
				key: false,
				closeLeft: false,
				closeRight: false,
			};

			if (statuses[i] === 1) {
				modifiers.repeated = true;
			} else if (statuses[i] === 2) {
				modifiers.blank = true;
				modifiers.closeLeft = true;
				modifiers.closeRight = true;
			} else if (statuses[i] === 3) {
				modifiers.key = true;
				modifiers.closeLeft = true;
			}

			if (i === 0 || (statuses[i - 1] > 1 && statuses[i] !== 1)) {
				modifiers.closeLeft = true;
			}

			if (i === FRAMES - 1 || statuses[i + 1] > 1) {
				modifiers.closeRight = true;
			}

			for (const [modName, flag] of Object.entries(modifiers)) {
				frames[i].classList.toggle(modifierClasses[modName], flag);
			}
		}
	}

	/**
	 * @param {Layer} layer
	 * @param {number} [index]
	 */
	#createLayerTimeline(layer, index = -1) {
		const titleMove = floor796.detectUserLanguage() === 'ru'
			? 'Поменять порядок отображения слоя'
			: 'Change layer order';

		const titleEye = floor796.detectUserLanguage() === 'ru'
			? 'Скрыть/показать слой'
			: 'Hide/show layer';
		const el = document.createElement('div');
		el.classList.add('layer-timeline');
		el.innerHTML = `
			<div class="layer-move" draggable="false" title="${titleMove}">
				<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon">
					<use href="#icon-svg-bars"></use>
				</svg>
			</div>
			<div class="layer-name">${layer.name}</div>
			<div class="layer-flag" data-flag="1" title="${titleEye}">
				<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon" data-flag="1">
					<use href="#icon-svg-eye"></use>
				</svg>
				<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon" data-flag="0">
					<use href="#icon-svg-eye-slash"></use>
				</svg>
			</div>
			<div class="layer-frames">${'<div></div>'.repeat(FRAMES)}</div>
		`;

		let startIndex, startList;

		new DragController({
			element: el.querySelector('.layer-move'),
			start: () => {
				this.#setDragMode(true);
				el.classList.add('highlighted');
				startList = [...this.#layerElements];
				startIndex = this.#layerElements.indexOf(el);
			},
			move: (_, dy) => {
				let newIndex = Math.min(
					startList.length - 1,
					Math.max(0, startIndex + Math.round(dy / el.offsetHeight))
				);

				if (this.#layerElements[newIndex] === el) {
					return;
				}

				this.#layerElements = [...startList];
				this.#layerElements.splice(startIndex, 1);

				this.#layerElements.splice(newIndex, 0, el);

				this.#setDragMode(true);
			},
			finish: () => {
				el.classList.remove('highlighted');
				this.#setDragMode(false);
				this.#selectLayer(el)
			},
		});

		el.querySelector('.layer-name').onclick = () => this.#selectLayer(el);
		el.querySelector('.layer-flag').onclick = () => this.#toggleVisibility(el);

		// start listen pointer events on timeline for selecting frames and layers
		this.#listenTimelineEvents(el.querySelector('.layer-frames'), () => this.#selectLayer(el));

		this.#layerMap.set(el, layer);

		if (index === -1 || this.#layerElements.length === 0) {
			this.#layerElements.push(el);
			this.#listEl.appendChild(el);
		} else {
			this.#listEl.insertBefore(el, this.#layerElements[index]);
			this.#layerElements.splice(index, 0, el);
		}

		let timerId = 0;
		layer.addObserver(() => {
			clearTimeout(timerId);
			timerId = setTimeout(() => {
				this.#updateLayerTimeline(el);
			});
		});

		this.#updateLayerTimeline(el);
	}

	#setDragMode(flag) {
		if (flag) {
			this.#listEl.style.height = `${this.#listEl.offsetHeight}px`;
			this.#layerElements.forEach((el, i) => {
				el.style.top = `${el.offsetHeight * i}px`;
			});
		} else {
			this.#listEl.style.height = '';
			this.#layerElements.forEach(el => {
				el.style.top = '';
				this.#listEl.appendChild(el);
			});
		}

		this.#listEl.classList.toggle('drag-mode', flag);

		this.#canvas.layers.setLayersOrder(this.#layerElements.map(el => this.#layerMap.get(el)));
		this.#canvas.render();
	}

	#createFramesHeader() {
		let html = [];
		for (let f = 1; f <= FRAMES; f++) {
			html.push(`<div>${f}</div>`);
		}

		this.#headerFramesEl.innerHTML = html.join('');
		this.#listenTimelineEvents(this.#headerFramesEl);
	}

	#listenTimelineEvents(timelineEl, onStartCallback = null) {
		let padding, cellWidth, startX = 0;
		const selectFrame = x => this.#selectFrame(Math.floor((x - padding) / cellWidth));

		new DragController({
			element: timelineEl,
			start: (x) => {
				padding = timelineEl.firstElementChild.offsetLeft;
				cellWidth = timelineEl.firstElementChild.offsetWidth;
				startX = x;
				onStartCallback && onStartCallback();
				selectFrame(x);
			},
			move: (dx) => selectFrame(startX + dx)
		});
	}
}