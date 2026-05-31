import { SpriteDemo } from './demo';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import 'highlight.js/styles/github-dark.min.css';

hljs.registerLanguage('typescript', typescript);

new SpriteDemo();