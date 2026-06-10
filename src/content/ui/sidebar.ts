import { layerStore } from '../layer-state';
import { renderCreateBar } from './annotation-form';
import { renderTimeline } from './annotation-list';
import { injectSidebarStyles } from './styles';
import { OverlayNotificationSystem } from '../timestamp-engine';

let panelExpanded = true;
let settingsOpen = false;
let searchQuery = '';
let currentVideo: HTMLVideoElement | null = null;
let playerButtonObserver: MutationObserver | null = null;
let secondaryObserver: MutationObserver | null = null;
let unsubscribeStore: (() => void) | null = null;

export function mountSidebarUI(video: HTMLVideoElement | null): void {
  currentVideo = video;
  injectSidebarStyles();
  injectPlayerButton();
  injectPanel();

  playerButtonObserver = new MutationObserver(() => {
    if (!document.querySelector('.ytp-button-layer-wrap')) {
      injectPlayerButton();
    }
  });
  playerButtonObserver.observe(document.body, { childList: true, subtree: true });

  secondaryObserver = new MutationObserver(() => {
    if (!document.getElementById('layer-panel')) {
      injectPanel();
    }
  });
  secondaryObserver.observe(document.body, { childList: true, subtree: true });

  unsubscribeStore = layerStore.subscribe(() => {
    refreshPanel();
    const state = layerStore.getState();
    if (!state.toastsVisible) {
      OverlayNotificationSystem.hideAll();
    } else {
      OverlayNotificationSystem.showContainer();
    }
    updateButtonState();
  });
}

function injectPlayerButton(): void {
  const rightControls = document.querySelector('.ytp-right-controls');
  if (!rightControls) return;
  if (document.querySelector('.ytp-button-layer')) return;

  const btnWrap = document.createElement('div');
  btnWrap.className = 'ytp-button-layer-wrap';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'ytp-button ytp-button-layer layer-toggle-btn';
  toggleBtn.title = 'Toggle annotations overlay';

  const toggleImg = document.createElement('img');
  toggleImg.src = chrome.runtime.getURL('icons/icon128.png');
  toggleImg.alt = 'Toggle';
  toggleImg.className = 'layer-btn-icon';
  toggleBtn.appendChild(toggleImg);

  const indicator = document.createElement('span');
  indicator.className = 'layer-button-active-indicator';
  toggleBtn.appendChild(indicator);

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    layerStore.getState().toggleToastsVisible();
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'ytp-button ytp-button-layer layer-add-btn';
  addBtn.title = 'Add note at current time';

  const addImg = document.createElement('img');
  addImg.src = chrome.runtime.getURL('icons/add.png');
  addImg.alt = 'Add';
  addImg.className = 'layer-btn-icon';
  addBtn.appendChild(addImg);

  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handlePlayerAddNote();
  });

  btnWrap.appendChild(toggleBtn);
  btnWrap.appendChild(addBtn);
  rightControls.prepend(btnWrap);
  updateButtonState();
}

function togglePanel(): void {
  panelExpanded = !panelExpanded;
  updatePanelState();
}

function updatePanelState(): void {
  const panel = document.getElementById('layer-panel');
  if (panel) {
    panel.classList.toggle('layer-panel-collapsed', !panelExpanded);
  }
}

function handlePlayerAddNote(): void {
  const state = layerStore.getState();

  if (!state.activeLayer) {
    layerStore.getState().createLayer('');
    return;
  }

  if (state.isViewerMode) return;

  const noteInput = document.getElementById('layer-note-input') as HTMLInputElement | null;
  if (noteInput) {
    const tsBadge = document.getElementById('layer-ts-badge');
    if (currentVideo && tsBadge) {
      tsBadge.textContent = formatPlayerTimestamp(currentVideo.currentTime);
    }
    noteInput.focus();
  }
}

function formatPlayerTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateButtonState(): void {
  const state = layerStore.getState();
  const toggleBtn = document.querySelector<HTMLButtonElement>('.layer-toggle-btn');
  const addBtn = document.querySelector<HTMLButtonElement>('.layer-add-btn');

  if (toggleBtn) {
    toggleBtn.classList.toggle('layer-toasts-on', state.toastsVisible);
    if (state.toastsVisible) {
      toggleBtn.title = 'Hide annotations overlay';
    } else {
      toggleBtn.title = 'Show annotations overlay';
    }
  }

  if (addBtn) {
    const canAdd = state.activeLayer && !state.isViewerMode;
    addBtn.classList.toggle('layer-add-disabled', !canAdd);
    addBtn.style.opacity = canAdd ? '0.9' : '0.4';
  }
}

function injectPanel(): void {
  if (document.getElementById('layer-panel')) return;

  const secondary = document.querySelector('#secondary') || document.querySelector('#secondary-inner');
  if (!secondary) return;

  const container = buildPanel();
  secondary.prepend(container);
  updatePanelState();
  updateButtonState();
}

function buildPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.id = 'layer-panel';

  const state = layerStore.getState();

  const header = document.createElement('div');
  header.id = 'layer-panel-header';
  header.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.layer-icon-btn')) return;
    togglePanel();
  });

  const headerLeft = document.createElement('div');
  headerLeft.id = 'layer-panel-header-left';

  const chevron = document.createElement('span');
  chevron.id = 'layer-panel-chevron';
  chevron.textContent = '\u25BC';

  const title = document.createElement('span');
  title.id = 'layer-panel-title';
  const displayName = state.username || 'Notes';
  title.textContent = displayName;
  headerLeft.appendChild(chevron);
  headerLeft.appendChild(title);

  if (state.isViewerMode) {
    const badge = document.createElement('span');
    badge.className = 'layer-viewer-badge';
    badge.textContent = 'VIEWER';
    headerLeft.appendChild(badge);

    const ownerName = state.activeLayer?.ownerName;
    if (ownerName) {
      const ownerLabel = document.createElement('span');
      ownerLabel.className = 'layer-owner-name';
      ownerLabel.textContent = `${ownerName}'s layer`;
      ownerLabel.title = `Created by ${ownerName}`;
      headerLeft.appendChild(ownerLabel);
    }
  }

  header.appendChild(headerLeft);

  const actions = document.createElement('div');
  actions.className = 'layer-panel-header-actions';

  if (state.activeLayer) {
    const shareBtn = document.createElement('button');
    shareBtn.className = 'layer-icon-btn layer-share-btn';
    shareBtn.title = 'Copy share link';
    shareBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
    shareBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const shareUrl = `https://www.youtube.com/watch?v=${state.activeLayer!.youtubeVideoId}&layer=${state.activeLayer!.id}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = shareUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      shareBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3ea6ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      setTimeout(() => {
        shareBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
      }, 1500);
    });
    actions.appendChild(shareBtn);
  }

  const gearBtn = document.createElement('button');
  gearBtn.className = 'layer-icon-btn layer-gear-btn';
  gearBtn.title = 'Settings';
  gearBtn.innerHTML = '\u2699';
  gearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsOpen = !settingsOpen;
    refreshPanel();
  });
  actions.appendChild(gearBtn);

  header.appendChild(actions);
  panel.appendChild(header);

  const body = document.createElement('div');
  body.id = 'layer-panel-body';

  if (state.activeLayer) {
    if (!state.isViewerMode) {
      body.appendChild(renderCreateBar(currentVideo));
    } else {
      const viewerNote = document.createElement('div');
      viewerNote.style.cssText = 'color:#717171;font-size:11px;text-align:center;padding:8px 12px;border-bottom:1px solid #1e1e1e;';
      viewerNote.textContent = 'Viewing — annotations are read-only';
      body.appendChild(viewerNote);
    }

    const annCount = state.annotations.size;
    if (annCount > 20) {
      body.appendChild(renderSearchBar());
    }

    body.appendChild(renderTimeline(searchQuery));
  } else if (state.videoId) {
    const cta = document.createElement('div');
    cta.className = 'layer-create-cta';
    cta.innerHTML = '<p>No annotations on this video yet</p>';

    const createBtn = document.createElement('button');
    createBtn.className = 'layer-btn-primary';
    createBtn.textContent = 'Start Annotating';
    createBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      layerStore.getState().createLayer('');
    });
    cta.appendChild(createBtn);
    body.appendChild(cta);
  } else {
    const empty = document.createElement('div');
    empty.className = 'layer-timeline-empty';
    empty.textContent = 'Open a YouTube video to annotate';
    body.appendChild(empty);
  }

  if (settingsOpen) {
    body.appendChild(renderSettings());
  }

  panel.appendChild(body);
  return panel;
}

function renderSearchBar(): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'layer-search-bar';

  const icon = document.createElement('span');
  icon.className = 'layer-search-icon';
  icon.textContent = '\uD83D\uDD0D';

  const input = document.createElement('input');
  input.className = 'layer-search-input';
  input.type = 'text';
  input.placeholder = 'Search notes\u2026';
  input.value = searchQuery;
  input.addEventListener('input', () => {
    searchQuery = input.value;
    const timeline = document.querySelector('.layer-timeline');
    if (timeline) {
      const newTimeline = renderTimeline(searchQuery);
      timeline.replaceWith(newTimeline);
    }
  });

  bar.appendChild(icon);
  bar.appendChild(input);
  return bar;
}

function renderSettings(): HTMLElement {
  const state = layerStore.getState();

  const settings = document.createElement('div');
  settings.className = 'layer-settings';

  const titleEl = document.createElement('div');
  titleEl.className = 'layer-settings-title';
  titleEl.textContent = 'Settings';
  settings.appendChild(titleEl);

  const usernameRow = document.createElement('div');
  usernameRow.className = 'layer-settings-row';

  const usernameLabel = document.createElement('span');
  usernameLabel.className = 'layer-settings-label';
  usernameLabel.textContent = 'Username';

  const usernameInput = document.createElement('input');
  usernameInput.className = 'layer-settings-input';
  usernameInput.type = 'text';
  usernameInput.placeholder = 'Your name';
  usernameInput.maxLength = 50;
  usernameInput.value = state.username;
  usernameInput.addEventListener('change', () => {
    layerStore.getState().setUsername(usernameInput.value);
  });
  usernameInput.addEventListener('input', () => {
    layerStore.getState().setUsername(usernameInput.value);
  });

  usernameRow.appendChild(usernameLabel);
  usernameRow.appendChild(usernameInput);
  settings.appendChild(usernameRow);

  const durationRow = document.createElement('div');
  durationRow.className = 'layer-settings-row';

  const durationLabel = document.createElement('span');
  durationLabel.className = 'layer-settings-label';
  durationLabel.textContent = 'Toast duration (default)';

  const durationSlider = document.createElement('input');
  durationSlider.type = 'range';
  durationSlider.min = '5';
  durationSlider.max = '30';
  durationSlider.step = '1';
  durationSlider.value = String(state.toastDurationSeconds);
  durationSlider.className = 'layer-settings-slider';

  const durationValue = document.createElement('span');
  durationValue.className = 'layer-settings-value';
  durationValue.textContent = `${state.toastDurationSeconds}s`;

  durationSlider.addEventListener('input', () => {
    const val = Number(durationSlider.value);
    durationValue.textContent = `${val}s`;
    layerStore.getState().setToastDuration(val);
  });

  durationRow.appendChild(durationLabel);
  durationRow.appendChild(durationSlider);
  durationRow.appendChild(durationValue);
  settings.appendChild(durationRow);

  if (state.activeLayer) {
    const shareRow = document.createElement('div');
    shareRow.className = 'layer-settings-row';

    const shareLabel = document.createElement('span');
    shareLabel.className = 'layer-settings-label';
    shareLabel.textContent = 'Share link';

    const shareWrap = document.createElement('div');
    shareWrap.className = 'layer-settings-share';

    const shareInput = document.createElement('input');
    shareInput.className = 'layer-settings-share-input';
    shareInput.type = 'text';
    shareInput.readOnly = true;
    shareInput.value = `https://www.youtube.com/watch?v=${state.activeLayer.youtubeVideoId}&layer=${state.activeLayer.id}`;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'layer-btn-sm';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareInput.value);
        copyBtn.textContent = 'Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      } catch {
        shareInput.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      }
    });

    shareWrap.appendChild(shareInput);
    shareWrap.appendChild(copyBtn);
    shareRow.appendChild(shareLabel);
    shareRow.appendChild(shareWrap);
    settings.appendChild(shareRow);
  }

  return settings;
}

export function refreshPanel(): void {
  const panel = document.getElementById('layer-panel');
  const isCollapsed = panel?.classList.contains('layer-panel-collapsed') ?? !panelExpanded;

  if (panel) {
    panel.remove();
  }

  const secondary = document.querySelector('#secondary') || document.querySelector('#secondary-inner');
  if (!secondary) return;

  panelExpanded = !isCollapsed;
  const newPanel = buildPanel();
  secondary.prepend(newPanel);
  updateButtonState();
}