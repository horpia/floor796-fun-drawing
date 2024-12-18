import {HISTORY_LIMIT, LS_KEY, LS_KEY_BACKUP} from "./config";
import {AnimationFile} from "./animation-file";

export class HistoryBar {
	/** @type {HTMLElement} */
	#container;

	/** @type {CommitObserver} */
	#commitObserver;

	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {LayersBar} */
	#layersBar;

	/** @type {ToolBar} */
	#toolBar;

	/** @type {{}[]} */
	#records = [];

	/** @type {number} */
	#offset = -1;

	#lastStateJson = '';

	/**
	 * @param {HTMLElement} cont
	 * @param {CommitObserver} commitObserver
	 * @param {AnimationCanvas} canvas
	 * @param {LayersBar} layersBar
	 * @param {ToolBar} toolBar
	 */
	constructor(cont, commitObserver, canvas, layersBar, toolBar) {
		this.#container = cont;
		this.#commitObserver = commitObserver;
		this.#canvas = canvas;
		this.#layersBar = layersBar;
		this.#toolBar = toolBar;
		this.save();
		this.#container.querySelector('.button[data-role="undo"]').onclick = () => this.undo();
		this.#container.querySelector('.button[data-role="redo"]').onclick = () => this.redo();

		this.#commitObserver.observe(() => this.save());
	}

	async restoreFromLocalStorage() {
		const stateFile = localStorage.getItem(LS_KEY);
		if (!stateFile) {
			return false;
		}

		if (!stateFile.startsWith('data:octet/stream;base64,')) {
			return false;
		}

		let blob;

		try {
			blob = await (await fetch(stateFile)).blob();
		} catch (e) {
			console.error(e);
			return false;
		}

		this.#records = [];
		this.#offset = -1;
		this.#lastStateJson = '';

		try {
			new AnimationFile().unpack(new Uint8Array(await blob.arrayBuffer()), this.#canvas)
		} catch (e) {
			alert('Error while reading animation from Local Storage. Please report this error to info@floor796.com');
			localStorage.setItem(LS_KEY_BACKUP, stateFile);
			console.error(e);
			return false;
		}

		this.save();
		this.#layersBar.sync();
		this.#toolBar.sync();
		return true;
	}

	reset() {
		this.#records = [];
		this.#offset = -1;
		this.#lastStateJson = '';
		this.save()
	}

	save() {
		console.log('save');
		const state = this.#canvas.getState();

		const newStateJson = JSON.stringify(state);
		if (this.#lastStateJson === newStateJson) {
			console.log('skip');
			return;
		}

		this.#saveToLocalStorage();

		this.#lastStateJson = newStateJson;

		if (this.#offset < this.#records.length - 1) {
			this.#records.splice(this.#offset + 1);
		}

		this.#records.push(state);

		if (this.#records.length === HISTORY_LIMIT) {
			this.#records.shift();
		} else {
			this.#offset++;
		}
	}

	undo() {
		if (this.#offset === 0) {
			return;
		}

		this.#lastStateJson = '';
		this.#offset--;
		this.#canvas.setState(this.#records[this.#offset]);
		this.#layersBar.sync();
		this.#toolBar.sync();
	}

	redo() {
		if (this.#offset === this.#records.length - 1) {
			return;
		}

		this.#lastStateJson = '';
		this.#offset++;
		this.#canvas.setState(this.#records[this.#offset]);
		this.#layersBar.sync();
		this.#toolBar.sync();
	}

	#saveToLocalStorage() {
		const blob = new Blob([new Uint8Array(new AnimationFile().pack(this.#canvas))], {type: 'octet/stream'});
		const reader = new FileReader();
		reader.readAsDataURL(blob);

		reader.onloadend = () => {
			localStorage.setItem(LS_KEY, reader.result);
		};
	}
}