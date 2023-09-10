export class ByteArrayReader {
	/**
	 * @param {array|Uint8Array} data
	 */
	constructor(data) {
		/**
		 * @type {Array|Uint8Array}
		 * @private
		 */
		this._data = data;

		/**
		 * @type {number}
		 * @private
		 */
		this._offset = 0;
	}

	/**
	 * @return {number}
	 */
	readUint8() {
		if (this._data.length < this._offset + 1) {
			this._offset++;
			console.error('Cannot unpack uint8: not enough bytes');
			return 0;
		}

		const value = this._data[this._offset];

		this._offset++;

		return value;
	}

	/**
	 * @return {number}
	 */
	readUint16() {
		if (this._data.length < this._offset + 2) {
			this._offset += 2;
			console.error('Cannot unpack uint16: not enough bytes');
			return 0;
		}

		const value = (this._data[this._offset] << 8)
			| this._data[this._offset + 1];

		this._offset += 2;

		return value;
	}

	/**
	 * @return {number}
	 */
	readUint32() {
		if (this._data.length < this._offset + 4) {
			this._offset += 4;
			console.error('Cannot unpack uint32: not enough bytes');
			return 0;
		}

		const value = (this._data[this._offset] << 24)
			| (this._data[this._offset + 1] << 16)
			| (this._data[this._offset + 2] << 8)
			| this._data[this._offset + 3];

		this._offset += 4;

		return value;
	}

	/**
	 * @param {number} length
	 * @return {Array}
	 */
	readBytes(length) {
		if (this._data.length < this._offset + length) {
			this._offset += length;
			console.error('Cannot unpack: not enough bytes');
			return [];
		}

		const data = this._data.slice(this._offset, this._offset + length);
		this._offset += length;
		return data;
	}

	/**
	 * @return {string}
	 */
	readShortString() {
		const len = this.readUint8();
		if (len === 0) {
			return '';
		}

		if (this._data.length < this._offset + len) {
			this._offset += len;
			console.error('Cannot unpack string: not enough bytes');
			return '';
		}

		const value = [...this._data.slice(this._offset, this._offset + len)]
			.map(code => String.fromCharCode(code))
			.join('');

		this._offset += len;

		return value;
	}

	/**
	 * @return {Map<string, number>}
	 */
	readMapStringUint32() {
		const map = [];
		const len = this.readUint16();

		for (let i = 0; i < len; i++) {
			map.push([this.readShortString(), this.readUint32()]);
		}

		return new Map(map);
	}

	/**
	 * @return {Map<number, number>}
	 */
	readMapUint8Uint32() {
		const map = [];
		const len = this.readUint16();

		for (let i = 0; i < len; i++) {
			map.push([this.readUint8(), this.readUint32()]);
		}

		return new Map(map);
	}

	/**
	 * @return {Map<number, number>}
	 */
	readMapUint16Uint32() {
		const map = [];
		const len = this.readUint16();

		for (let i = 0; i < len; i++) {
			map.push([this.readUint16(), this.readUint32()]);
		}

		return new Map(map);
	}

	/**
	 * @return {Map<number, number>}
	 */
	readMapUint32Uint32() {
		const map = [];
		const len = this.readUint16();

		for (let i = 0; i < len; i++) {
			map.push([this.readUint32(), this.readUint32()]);
		}

		return new Map(map);
	}
}
