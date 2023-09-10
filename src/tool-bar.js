export class ToolBar {
	/** @type {Map<string, AnimationTool>} */
	#tools = new Map();

	/** @type {Map<string, HTMLButtonElement>} */
	#buttons = new Map();

	/** @type {AnimationCanvas} */
	#canvas;

	/** @type {HTMLElement} */
	#canvasCont = document.querySelector('.canvas-container');

	/** @type {string} */
	#currentTool = '';

	constructor(canvas) {
		this.#canvas = canvas;

		document.querySelectorAll('.button[data-role]').forEach(el => {
			this.#buttons.set(el.dataset.role, el);
			el.addEventListener('click', () => this.setTool(el.dataset.role));
		});
	}

	/**
	 * @param {string} role
	 * @param {AnimationTool} tool
	 */
	bindTool(role, tool) {
		this.#tools.set(role, tool);
	}

	sync() {
		const curTool = this.#canvas.getTool();
		for (const [role, tool] of this.#tools.entries()) {
			const btn = this.#buttons.get(role);
			btn.classList.toggle('button_checked', tool === curTool);

			if (tool === curTool) {
				this.#canvasCont.dataset.tool = role;
				this.#currentTool = role;
			}
		}
	}

	getTool() {
		return this.#currentTool;
	}

	setTool(role) {
		if (!this.#tools.has(role) || this.#currentTool === role) {
			return;
		}

		this.#currentTool = role;

		for (const [btnRole, btn] of this.#buttons.entries()) {
			btn.classList.toggle('button_checked', btnRole === role);
		}

		this.#canvas.setTool(this.#tools.get(role));
		this.#canvasCont.dataset.tool = role;
	}
}