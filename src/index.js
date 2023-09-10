import {AnimationEditor} from "./animation-editor";
import {AnimationPlayer} from "./animation-player";
import {AnimationFile} from "./animation-file";
import {ColorsBar} from "./colors-bar";
import {LS_KEY} from "./config";

if (!('floor796' in globalThis)) {
	// emulate production scope and add necessary dependencies
	globalThis.floor796 = {
		detectUserLanguage: () => /[?&]lang=ru\b/.test(location.search) ? 'ru' : 'en'
	};
}

// export front editor classes and config constants to the global scope
globalThis.funDrawing = {
	AnimationEditor,
	AnimationPlayer,
	AnimationFile,
	ColorsBar,
	LS_KEY,
};