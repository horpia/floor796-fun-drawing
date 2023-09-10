const emptyFunc = () => {};

/**
 * @typedef {object} T_DragControllerOptions
 * @property {HTMLElement} element
 * @property {function(x:number,y:number,e:MouseEvent|TouchEvent):void} [start]
 * @property {function(dx:number,dy:number,x:number,y:number):void} [move]
 * @property {function():void} [finish]
 */

/**
 * Drag & Drop Controller
 */
export class DragController {
	/**
	 * Class constructor
	 *
	 * @param {T_DragControllerOptions} options
	 */
	constructor(options) {
		/**
		 * @type {Element|HTMLElement}
		 * @private
		 */
		this._element = options.element || document.body;

		/**
		 * @type {{
		 *  start: function, move: function, finish: function,
		 *  mouseMove: function, mouseUp: function
		 * }}
		 * @private
		 */
		this._handlers = {
			start: options.start || emptyFunc,
			move: options.move || emptyFunc,
			finish: options.finish || emptyFunc,
			mouseMove: this._onMouseMove.bind(this),
			mouseUp: this._onMouseUp.bind(this),
			touchMove: this._wrapTouchEvent(this._onMouseMove.bind(this)),
			touchUp: this._wrapTouchEvent(this._onMouseUp.bind(this)),
		};

		this._props = {
			startClientX: 0,
			startClienty: 0,
			startElemX: 0,
			startElemY: 0
		};

		/**
		 * @type {{dragging: boolean, isMultipleTouches: boolean}}
		 * @private
		 */
		this._flags = {
			dragging: false,
			isMultipleTouches: false,
		};

		this._element.addEventListener('touchmove', (e) => {
			e.preventDefault();
		}, {passive: false});

		this._element.addEventListener('touchstart', this._wrapTouchEvent(this._onMouseDown.bind(this)));
		this._element.addEventListener('mousedown', this._onMouseDown.bind(this));
		this._element.setAttribute('draggable', 'false');
	}

	/**
	 * @return {boolean}
	 */
	get isMultipleTouchesDetected() {
		return this._flags.isMultipleTouches;
	}

	/**
	 * Returns Touch Events wrapper which converts touch-based event to mouse-based
	 *
	 * @param {function} handler
	 * @returns {function(*=)}
	 * @private
	 */
	_wrapTouchEvent(handler) {
		return (e) => {
			e = this._createMouseFromTouchEvent(e);
			if (e) {
				handler(e);
			}
		}
	}

	/**
	 * Create Mouse event from Touch Event
	 *
	 * @param {TouchEvent} e
	 * @returns {MouseEvent|null}
	 * @private
	 */
	_createMouseFromTouchEvent(e) {
		if (e.type === 'touchmove') {
			e.preventDefault();
		}

		if (e.touches.length > 1) {
			this._flags.isMultipleTouches = true;
			this._onMouseUp();
			return null;
		}

		this._flags.isMultipleTouches = false;

		let event = {
			type: e.type,
			clientX: 0,
			clientY: 0,
			screenX: 0,
			screenY: 0,
			pageX: 0,
			pageY: 0,
			target: null,
			ctrlKey: e.ctrlKey,
			metaKey: e.metaKey,
			altKey: e.altKey,
			shiftKey: e.shiftKey,
			preventDefault: () => {
				return e.preventDefault();
			},
			stopPropagation: () => {
				return e.stopPropagation();
			},
		};
		if (e.touches && e.touches.length > 0) {
			let touch = e.touches[0];
			Object.assign(event, {
				clientX: touch.clientX,
				clientY: touch.clientY,
				screenX: touch.screenX,
				screenY: touch.screenY,
				pageX: touch.pageX,
				pageY: touch.pageY,
				target: touch.target
			});
		}
		return event;
	}

	/**
	 * Handles mouse down event
	 *
	 * @param {MouseEvent} e
	 * @returns {void}
	 * @private
	 */
	_onMouseDown(e) {
		if (this._flags.dragging) {
			return;
		}

		if (e.type === 'mousedown' && e.button !== 0) {
			return;
		}

		let props = this._props,
			bBox = this._element.getBoundingClientRect();
		props.startClientX = e.clientX;
		props.startClientY = e.clientY;
		props.startElemX = e.clientX - bBox.left;
		props.startElemY = e.clientY - bBox.top;
		this._flags.dragging = true;

		if (e.type === 'touchstart') {
			document.addEventListener('touchmove', this._handlers.touchMove, {capture: true, passive: false});
			document.addEventListener('touchend', this._handlers.touchUp, true);
		} else {
			document.addEventListener('mousemove', this._handlers.mouseMove, {capture: true, passive: false});
			document.addEventListener('mouseup', this._handlers.mouseUp, true);
		}

		this._handlers.start(props.startElemX, props.startElemY, e);
	}

	/**
	 * Handles mouse move event
	 *
	 * @param {MouseEvent} e
	 * @returns {void}
	 * @private
	 */
	_onMouseMove(e) {
		if (!this._flags.dragging) {
			return;
		}

		let props = this._props,
			dx = e.clientX - props.startClientX,
			dy = e.clientY - props.startClientY;
		this._handlers.move(dx, dy, props.startElemX, props.startElemY);
	}

	/**
	 * Handles mouse up event
	 *
	 * @returns {void}
	 * @private
	 */
	_onMouseUp() {
		document.removeEventListener('touchmove', this._handlers.touchMove, {capture: true, passive: false});
		document.removeEventListener('touchend', this._handlers.touchUp, true);
		document.removeEventListener('mousemove', this._handlers.mouseMove, {capture: true, passive: false});
		document.removeEventListener('mouseup', this._handlers.mouseUp, true);

		if (!this._flags.dragging) {
			return;
		}

		this._flags.dragging = false;
		this._handlers.finish();
	}
}
