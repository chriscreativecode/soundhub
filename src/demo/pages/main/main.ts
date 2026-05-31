import "./../../shared.css";
import "./landing.css";
import { AudioControllerComponent } from "../../components/audio-controller-component/audio-controller.component";

declare function gtag(...args: any[]): void;
import { LocalStorageManagerManager } from "../../services/local-storage-manager";
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.min.css';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('html', xml);

// Initialize the audio controller SVG animation on the landing page
const landingController = document.getElementById('landingAudioController');
if (landingController) {
  new AudioControllerComponent(landingController);
}

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

document.querySelectorAll<HTMLAnchorElement>('.landing-card[href]').forEach(card => {
  card.addEventListener('click', () => {
    const href = card.getAttribute('href') ?? '';
    const demo = href.replace('./', '').replace('/', '') || 'unknown';
    gtag('event', 'demo_nav_click', { demo });
  });
});

// About modal
const aboutBtn = document.getElementById('aboutBtn') as HTMLButtonElement | null;
const aboutModal = document.getElementById('aboutModal') as HTMLElement | null;
const aboutBackdrop = document.getElementById('aboutBackdrop') as HTMLElement | null;
const modalCloseBtn = document.getElementById('modalCloseBtn') as HTMLButtonElement | null;

function openModal(): void {
  if (aboutBackdrop) aboutBackdrop.classList.add('visible');
  if (aboutModal) aboutModal.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeModal(): void {
  if (aboutBackdrop) aboutBackdrop.classList.remove('visible');
  if (aboutModal) aboutModal.classList.remove('visible');
  document.body.style.overflow = '';
}

if (aboutBtn && aboutModal && aboutBackdrop) {
  aboutBtn.addEventListener('click', openModal);

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  aboutBackdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && aboutModal.classList.contains('visible')) {
      closeModal();
    }
  });
}

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
