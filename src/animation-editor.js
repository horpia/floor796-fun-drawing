import {ColorsBar} from "./colors-bar";
import {SizeBar} from "./size-bar";
import {AnimationCanvas} from "./animation-canvas";
import {ToolBar} from "./tool-bar";
import {AnimationLayers} from "./animation-layers";
import {AnimationToolHand} from "./tools/hand";
import {AnimationToolPencil} from "./tools/pencil";
import {AnimationToolEraser} from "./tools/eraser";
import {AnimationToolLine} from "./tools/line";
import {AnimationToolEllipse} from "./tools/ellipse";
import {AnimationToolFill} from "./tools/fill-v2";
import {AnimationToolRect} from "./tools/rect";
import {AnimationToolMove} from "./tools/move";
import {ClipboardBar} from "./clipboard-bar";
import {LayersBar} from "./layers-bar";
import {HistoryBar} from "./history-bar";
import {CommitObserver} from "./commit-observer";
import {AnimationToolPickColor} from "./tools/pick-color";
import {AnimationPreview} from "./animation-preview";
import {AnimationFile} from "./animation-file";
import {FilesBar} from "./files-bar";
import {PX_COLS, PX_ROWS} from "./config";
import {FlipTool} from "./flip-tool";
import editorView from "./html/editor.html";
import iconsView from "./html/icons.html";
import "./style/editor.css"

export class AnimationEditor {
	/** @type {CommitObserver} */
	#commitObserver;

	/** @type {AnimationLayers} */
	#layers;

	/** @type {ColorsBar} */
	#colorsBar;

	/** @type {SizeBar} */
	#sizeBar;

	/** @type {ToolBar} */
	#toolBar;

	/** @type {ClipboardBar} */
	#clipboardBar;

	/** @type {HistoryBar} */
	#historyBar;

	/** @type {LayersBar} */
	#layersBar;

	/** @type {AnimationPreview} */
	#preview;

	/** @type {FilesBar} */
	#filesBar;

	/** @type {FlipTool} */
	#flipTool;

	/** @type {AnimationCanvas} */
	#canvas;

	/**
	 * @param {string} url
	 */
	constructor(url = '') {
		// create editor DOM
		(document.querySelector('#editor-container') || document.body).innerHTML = iconsView + editorView;
		document.querySelectorAll('[data-title-ru]').forEach(el => {
			el.title = el.getAttribute(`data-title-${globalThis.floor796.detectUserLanguage()}`);
		})

		this.#commitObserver = new CommitObserver();
		this.#layers = new AnimationLayers(this.#commitObserver);
		this.#colorsBar = new ColorsBar();
		this.#sizeBar = new SizeBar();
		this.#canvas = new AnimationCanvas(this.#commitObserver, this.#layers, this.#colorsBar.colors);
		this.#preview = new AnimationPreview(this.#canvas);
		this.#toolBar = new ToolBar(this.#canvas);
		this.#toolBar.bindTool('hand', new AnimationToolHand(this.#canvas));
		this.#toolBar.bindTool('pencil', new AnimationToolPencil(this.#canvas, this.#colorsBar, this.#sizeBar));
		this.#toolBar.bindTool('line', new AnimationToolLine(this.#canvas, this.#colorsBar, this.#sizeBar));
		this.#toolBar.bindTool('ellipse', new AnimationToolEllipse(this.#canvas, this.#colorsBar, this.#sizeBar));
		this.#toolBar.bindTool('eraser', new AnimationToolEraser(this.#canvas, this.#sizeBar));
		this.#toolBar.bindTool('fill', new AnimationToolFill(this.#canvas, this.#colorsBar));
		this.#toolBar.bindTool('rect', new AnimationToolRect(this.#canvas));
		this.#toolBar.bindTool('move', new AnimationToolMove(this.#canvas));
		this.#toolBar.bindTool('pick-color', new AnimationToolPickColor(this.#canvas, this.#colorsBar));
		this.#toolBar.setTool('pencil');

		this.#flipTool = new FlipTool(this.#canvas);
		this.#layersBar = new LayersBar(this.#canvas, this.#toolBar);
		this.#clipboardBar = new ClipboardBar(this.#canvas, this.#toolBar);

		this.#historyBar = new HistoryBar(
			this.#commitObserver,
			this.#canvas,
			this.#layersBar,
			this.#toolBar
		);

		this.#filesBar = new FilesBar(this.#canvas, this.#layersBar, this.#toolBar, this.#historyBar);

		window.onresize = this.updateSize.bind(this);

		document.querySelector('.button[data-role="delete"]').onclick = () => this.resetAll();

		this.updateSize();
		if (url === '') {
			this.#historyBar.restoreFromLocalStorage().then();
		} else {
			this.#filesBar.loadByUrl(url).then();
		}
		this.#listenKeyboard();
	}

	get canvas() {
		return this.#canvas;
	}

	updateSize() {
		this.#canvas.resizeToContainer();
		this.#canvas.render();
	}

	resetAll(muted = false) {
		if (!muted) {
			const msg = floor796.detectUserLanguage() === 'ru'
				? 'Вы действительно хотите удалить текущую анимацию?'
				: 'Do you really want to delete the current animation?'

			if (!confirm(msg)) {
				return;
			}
		}

		this.#canvas.reset();
		this.#layersBar.build();
		this.#toolBar.sync();
		this.#historyBar.reset();
		this.#toolBar.setTool('pencil');
	}

	async getFile() {
		return await new AnimationFile().packToFinalFile(this.canvas);
	}

	#listenKeyboard() {
		let lastTool;
		let pressedKeys = {};

		document.addEventListener('keydown', (e) => {
			if (e.target && e.target.tagName === 'INPUT') {
				return;
			}

			switch (e.code) {
				case 'ArrowRight':
				case 'Period':
					this.#layersBar.selectNextFrame();
					break;
				case 'ArrowLeft':
				case 'Comma':
					this.#layersBar.selectPrevFrame();
					break;
				case 'KeyB':
					this.#toolBar.setTool('pencil');
					break;
				case 'KeyE':
					this.#toolBar.setTool('eraser');
					break;
				case 'KeyR':
					this.#toolBar.setTool('rect');
					break;
				case 'KeyN':
					this.#toolBar.setTool('line');
					break;
				case 'KeyO':
					this.#toolBar.setTool('ellipse');
					break;
				case 'KeyI':
					this.#toolBar.setTool('pick-color');
					break;
				case 'KeyT':
					this.#toolBar.setTool('move');
					break;
				case 'KeyK':
					this.#toolBar.setTool('fill');
					break;
				case 'KeyC':
					if (e.ctrlKey || e.metaKey) {
						this.#clipboardBar.copy();
					} else {
						this.#colorsBar.showColorsPalette();
					}
					break;
				case 'KeyX':
					if (e.ctrlKey || e.metaKey) {
						this.#clipboardBar.cut();
					}
					break;
				case 'KeyV':
					if (e.ctrlKey || e.metaKey) {
						this.#clipboardBar.paste();
					}
					break;
				case 'KeyZ':
					if (e.ctrlKey || e.metaKey) {
						if (e.shiftKey) {
							this.#historyBar.redo();
						} else {
							this.#historyBar.undo();
						}
					}
					break;
				case 'KeyA':
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						e.stopPropagation();
						this.#canvas.setSelection(0, 0, PX_COLS, PX_ROWS);
					}
					break;
				case 'Space':
					e.preventDefault();

					if (!pressedKeys[e.code]) {
						lastTool = this.#toolBar.getTool();
						this.#toolBar.setTool('hand');
					}
					break;
				case 'Delete':
					if (this.#canvas.getSelection() !== null) {
						this.#canvas.layers.currentLayer.clearRect(
							this.#canvas.layers.currentFrame,
							...this.#canvas.getSelection()
						);
						this.#canvas.render();
						this.#commitObserver.commit();
					}
					break;
				case 'Digit1':
					this.#sizeBar.setSize(1);
					break;
				case 'Digit2':
					this.#sizeBar.setSize(2);
					break;
				case 'Digit3':
					this.#sizeBar.setSize(3);
					break;
				case 'Digit4':
					this.#sizeBar.setSize(4);
					break;
				case 'F9':
					this.#preview.play();
					break;
				case 'F5':
					e.preventDefault();
					this.#layersBar.insertFrame();
					break;
				case 'F7':
					e.preventDefault();
					this.#layersBar.makeBlankFrame();
					break;
				case 'F8':
					e.preventDefault();
					this.#layersBar.removeFrame();
					break;
				case 'Escape':
					this.#preview.closePopup();
					this.#colorsBar.closeColorsPalette();
					if (this.#canvas.getSelection() !== null) {
						this.#canvas.layers.commitTransactions();
						this.#canvas.setSelection(0, 0, 0, 0);
					}
					break;
			}

			pressedKeys[e.code] = true;
		});


		document.addEventListener('keyup', (e) => {
			if (e.target && e.target.tagName === 'INPUT') {
				return;
			}

			switch (e.code) {
				case 'Space':
					if (lastTool) {
						this.#toolBar.setTool(lastTool);
					}
					break;
			}

			delete pressedKeys[e.code];
		});
	}
}
