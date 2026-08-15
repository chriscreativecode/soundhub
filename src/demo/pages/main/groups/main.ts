import { GroupsDemo } from './demo';
import { ShareBarComponent } from '../../../components/share-bar-component/share-bar.component';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import 'highlight.js/styles/github-dark.min.css';

hljs.registerLanguage('typescript', typescript);

new GroupsDemo();

const shareBar = document.getElementById('shareBar');
if (shareBar) {
  new ShareBarComponent(shareBar);
}
