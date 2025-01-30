
import "./../../shared.css";
import "./demo.css";
// @ts-ignore
import demoTemplate from "./demo-template.html?raw";

const appElement = document.getElementById('app')!;

console.log('init sprite demo', appElement.innerHTML = demoTemplate);