import "./../../shared.css";
import "./landing.css";
import { LocalStorageManagerManager } from "../../services/local-storage-manager";
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.min.css';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('html', xml);

document.querySelectorAll<HTMLElement>('.qs-panel code').forEach(block => {
  hljs.highlightElement(block);
});

const body = document.body;
const themeToggle = document.getElementById('themeToggle') as HTMLInputElement;

const storedTheme = LocalStorageManagerManager.getItem('sound-manager-ts-demo-theme');
if (!storedTheme) {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', systemTheme);
}

if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  body.classList.add('dark-theme');
  if (themeToggle) themeToggle.checked = true;
} else {
  body.classList.remove('dark-theme');
  if (themeToggle) themeToggle.checked = false;
}

if (themeToggle) {
  themeToggle.addEventListener('change', function () {
    if (this.checked) {
      body.classList.add('dark-theme');
      LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', 'dark');
    } else {
      body.classList.remove('dark-theme');
      LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', 'light');
    }
  });
}

const qsTabs = document.querySelectorAll<HTMLButtonElement>('.qs-tab');
qsTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    qsTabs.forEach(t => t.classList.remove('qs-tab--active'));
    tab.classList.add('qs-tab--active');
    document.querySelectorAll<HTMLElement>('.qs-panel').forEach(panel => {
      panel.style.display = panel.dataset.panel === target ? 'block' : 'none';
    });
  });
});

const copyBtn = document.getElementById('qs-copy-btn') as HTMLButtonElement | null;
if (copyBtn) {
  const iconCopy = copyBtn.querySelector('.qs-icon-copy') as SVGElement;
  const iconCheck = copyBtn.querySelector('.qs-icon-check') as SVGElement;

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('npm install sound-manager-ts');
      copyBtn.classList.add('copied');
      iconCopy.style.display = 'none';
      iconCheck.style.display = 'block';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        iconCopy.style.display = 'block';
        iconCheck.style.display = 'none';
      }, 2000);
    } catch {
      // clipboard API unavailable (non-HTTPS or denied)
    }
  });
}
