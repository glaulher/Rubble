import { GlobalWindow } from "happy-dom";

var window = new GlobalWindow();
globalThis.window = window;
globalThis.document = window.document;
globalThis.navigator = window.navigator;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
globalThis.Event = window.Event;
globalThis.EventTarget = window.EventTarget;

document.body.innerHTML = "";

