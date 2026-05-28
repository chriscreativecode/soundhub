import { PianoDemo } from './demo';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import 'highlight.js/styles/github-dark.min.css';

hljs.registerLanguage('typescript', typescript);

new PianoDemo();

// Highlight the code snippet after the DOM is built (PianoDemo.init is async)
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>('.info-code-block code').forEach(block => {
      hljs.highlightElement(block);
    });
  });
});