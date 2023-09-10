import {AnimationFile} from "./animation-file";

export class FilesBar {
	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {LayersBar} */
	#layersBar;

	/** @type {ToolBar} */
	#toolBars;

	/** @type {HistoryBar} */
	#historyBar;

	/**
	 * @param {AnimationCanvas} canvas
	 * @param {LayersBar} layersBar
	 * @param {ToolBar} toolBars
	 * @param {HistoryBar} historyBar
	 */
	constructor(canvas, layersBar, toolBars, historyBar) {
		this.#canvas = canvas;
		this.#layersBar = layersBar;
		this.#toolBars = toolBars;
		this.#historyBar = historyBar;
		document.querySelector('.button[data-role="download"]').onclick = () => this.#downloadFile();
		document.querySelector('.button[data-role="open"]').onclick = () => this.#openFile();
	}

	async loadByUrl(url) {
		const data = new Uint8Array(await (await (await fetch(url)).blob()).arrayBuffer());
		this.#loadBytesArray(data);
	}

	#openFile() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.f796i';
		input.onchange = async _ => {
			const data = new Uint8Array(await input.files[0].arrayBuffer());
			this.#loadBytesArray(data);
		};
		input.click();
	}

	#loadBytesArray(data) {
		try {
			new AnimationFile().unpack(data, this.#canvas);
		} catch (e) {
			alert(
				floor796.detectUserLanguage() === 'ru'
					? 'Ошибка во время чтения файла. Пожалуйста, свяжитесь с автором проекта: info@floor796.com'
					: 'Error while reading the file. Please contact with author of this project: info@floor796.com'
			);
			return;
		}
		this.#layersBar.build();
		this.#toolBars.sync();
		this.#historyBar.reset();
	}

	#downloadFile() {
		let a = document.createElement('a');
		document.body.appendChild(a);
		let data = new AnimationFile().pack(this.#canvas);
		const blob = new Blob([new Uint8Array(data)], {type: 'octet/stream'});
		const url = window.URL.createObjectURL(blob);
		a.href = url;
		a.download = 'fun-animation.f796i';
		a.click();

		setTimeout(() => {
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
	    }, 0);
	}
}