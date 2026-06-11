import { layerStore } from '../layer-state';
import { renderCreateBar } from './annotation-form';
import { renderTimeline, renderAnnotationList } from './annotation-list';
import { injectSidebarStyles } from './styles';
import { hideAllToasts, showToastContainer } from '../timestamp-engine';
import { formatTimestamp, clipboardCopy } from '../utils';
import { VIDEO_SELECTOR, MAX_CONTENT_LENGTH, MAX_USERNAME_LENGTH, TOAST_DURATION_MIN, TOAST_DURATION_MAX } from '../constants';
import { showPlayerOverlay, setVideoRef } from './player-overlay';

let panelExpanded = true;
let settingsOpen = false;
let searchQuery = '';
let currentVideo: HTMLVideoElement | null = null;
let playerButtonObserver: MutationObserver | null = null;
let secondaryObserver: MutationObserver | null = null;
let unsubscribeStore: (() => void) | null = null;

export function mountSidebarUI(video: HTMLVideoElement | null): void {
  currentVideo = video;
  setVideoRef(video);
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
      hideAllToasts();
    } else {
      showToastContainer();
    }
    updateButtonState();
    if (pendingFocusNote) {
      pendingFocusNote = false;
      requestAnimationFrame(() => {
        focusNoteInput();
      });
    }
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

let pendingFocusNote = false;

function handlePlayerAddNote(): void {
  const state = layerStore.getState();

  if (!state.activeLayer) {
    pendingFocusNote = true;
    layerStore.getState().createLayer('');
    return;
  }

  if (state.activeTab !== 'own') {
    pendingFocusNote = true;
    layerStore.getState().switchToOwnLayer();
    return;
  }

  tryFocusSidebarOrCreateOverlay();
}

function tryFocusSidebarOrCreateOverlay(): void {
  const noteInput = document.getElementById('layer-note-input') as HTMLInputElement | null;
  if (noteInput && noteInput.offsetParent !== null) {
    if (currentVideo) {
      const tsBadge = document.getElementById('layer-ts-badge');
      if (tsBadge) tsBadge.textContent = formatTimestamp(currentVideo.currentTime);
    }
    noteInput.focus();
  } else {
    showPlayerOverlay();
  }
}

function focusNoteInput(): void {
  const noteInput = document.getElementById('layer-note-input') as HTMLInputElement | null;
  if (noteInput && noteInput.offsetParent !== null) {
    if (currentVideo) {
      const tsBadge = document.getElementById('layer-ts-badge');
      if (tsBadge) tsBadge.textContent = formatTimestamp(currentVideo.currentTime);
    }
    noteInput.focus();
  } else {
    showPlayerOverlay();
  }
}

function updateButtonState(): void {
  const state = layerStore.getState();
  const toggleBtn = document.querySelector<HTMLButtonElement>('.layer-toggle-btn');
  const addBtn = document.querySelector<HTMLButtonElement>('.layer-add-btn');

  if (toggleBtn) {
    toggleBtn.classList.toggle('layer-toasts-on', state.toastsVisible);
    toggleBtn.title = state.toastsVisible ? 'Hide annotations overlay' : 'Show annotations overlay';
  }

  if (addBtn) {
    addBtn.classList.remove('layer-add-disabled');
    addBtn.style.opacity = '0.9';
  }
}

function isDarkMode(): boolean {
  return document.documentElement.getAttribute('dark') !== null;
}

function getReactionIconHtml(type: 'like' | 'dislike', filled: boolean): string {
  const dark = isDarkMode();
  const name = filled ? 'like_filled' : (dark ? 'like' : 'lm_like');
  const src = chrome.runtime.getURL(`icons/${name}.png`);
  const rotate = type === 'dislike' ? ' layer-reaction-icon-rotate' : '';
  return `<img class="layer-reaction-icon-img${rotate}" src="${src}" alt="${type}" draggable="false">`;
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
    if ((e.target as HTMLElement).closest('.layer-icon-btn') || (e.target as HTMLElement).closest('.layer-tab-bar')) return;
    togglePanel();
  });

  const headerLeft = document.createElement('div');
  headerLeft.id = 'layer-panel-header-left';

  const chevron = document.createElement('span');
  chevron.id = 'layer-panel-chevron';
  chevron.textContent = '\u25BC';
  headerLeft.appendChild(chevron);

  if (state.videoId) {
    const tabBar = document.createElement('div');
    tabBar.className = 'layer-tab-bar';

    const ownTab = document.createElement('div');
    ownTab.className = 'layer-tab-item' + (state.activeTab === 'own' ? ' layer-tab-item-active' : '');
    const ownLabel = document.createElement('span');
    ownLabel.className = 'layer-tab-label';
    ownLabel.textContent = 'My Notes';
    ownTab.appendChild(ownLabel);
    ownTab.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.activeTab !== 'own') {
        if (state.sharedLayers.size > 0) {
          layerStore.getState().switchToOwnLayer();
        } else {
          layerStore.getState().setActiveTab('own');
        }
      }
    });

    const sharedTab = document.createElement('div');
    sharedTab.className = 'layer-tab-item' + (state.activeTab === 'shared' ? ' layer-tab-item-active' : '');
    const sharedLabel = document.createElement('span');
    sharedLabel.className = 'layer-tab-label';
    const sharedCount = state.sharedLayers.size;
    sharedLabel.textContent = 'Shared' + (sharedCount > 0 ? ` (${sharedCount})` : '');
    sharedTab.appendChild(sharedLabel);
    sharedTab.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.activeTab !== 'shared') {
        if (state.sharedLayers.size > 0) {
          layerStore.getState().switchToSharedLayer();
        } else {
          layerStore.getState().setActiveTab('shared');
        }
      }
    });

    const browseTab = document.createElement('div');
    browseTab.className = 'layer-tab-item' + (state.activeTab === 'browse' ? ' layer-tab-item-active' : '');
    const browseLabel = document.createElement('span');
    browseLabel.className = 'layer-tab-label';
    browseLabel.textContent = 'Browse';
    browseTab.appendChild(browseLabel);
    browseTab.addEventListener('click', (e) => {
      e.stopPropagation();
      layerStore.getState().setActiveTab('browse');
      layerStore.getState().loadPublicLayers();
    });

    tabBar.appendChild(ownTab);
    tabBar.appendChild(sharedTab);
    tabBar.appendChild(browseTab);
    headerLeft.appendChild(tabBar);
  } else {
    const title = document.createElement('span');
    title.id = 'layer-panel-title';
    title.textContent = 'Notes';
    headerLeft.appendChild(title);
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
        await clipboardCopy(shareUrl);
      } catch {
        /* Clipboard API unavailable */
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

  if (state.activeTab === 'own') {
    body.appendChild(renderOwnTab(state));
  } else if (state.activeTab === 'shared') {
    body.appendChild(renderSharedTab(state));
  } else if (state.activeTab === 'browse') {
    body.appendChild(renderBrowseTab(state));
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

function renderOwnTab(state: ReturnType<typeof layerStore.getState>): HTMLElement {
  const container = document.createElement('div');

  if (!state.activeLayer) {
    const cta = document.createElement('div');
    cta.className = 'layer-create-cta';
    cta.innerHTML = '<p>Create your own notes on this video</p>';
    const createBtn = document.createElement('button');
    createBtn.className = 'layer-btn-primary';
    createBtn.textContent = 'Start Annotating';
    createBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      layerStore.getState().createLayer('');
    });
    cta.appendChild(createBtn);
    container.appendChild(cta);
    return container;
  }

  const publicToggle = document.createElement('div');
  publicToggle.className = 'layer-own-header';

  const ownerLabel = document.createElement('span');
  ownerLabel.className = 'layer-own-owner-label';
  ownerLabel.textContent = state.username || 'My Notes';
  publicToggle.appendChild(ownerLabel);

  const toggleWrap = document.createElement('button');
  toggleWrap.className = 'layer-public-toggle' + (state.activeLayer.isPublic ? ' layer-public-active' : '');
  toggleWrap.title = state.activeLayer.isPublic ? 'Notes are public' : 'Notes are private';
  toggleWrap.innerHTML = state.activeLayer.isPublic
    ? '<span class="layer-public-dot"></span>Public'
    : 'Private';
  toggleWrap.addEventListener('click', async (e) => {
    e.stopPropagation();
    await layerStore.getState().toggleLayerPublic();
  });
  publicToggle.appendChild(toggleWrap);
  container.appendChild(publicToggle);

  container.appendChild(renderCreateBar(currentVideo));

  const annCount = state.annotations.size;
  if (annCount > 20) {
    container.appendChild(renderSearchBar());
  }

  container.appendChild(renderTimeline(searchQuery, false));
  return container;
}

function renderSharedTab(state: ReturnType<typeof layerStore.getState>): HTMLElement {
  const container = document.createElement('div');

  if (state.sharedLayers.size === 0) {
    const empty = document.createElement('div');
    empty.className = 'layer-timeline-empty';
    empty.innerHTML = 'No shared notes yet.<br><span style="color:#717171;font-size:12px;">Open a shared link or add notes from Browse.</span>';
    container.appendChild(empty);
    return container;
  }

  for (const [, entry] of state.sharedLayers) {
    const segment = document.createElement('div');
    segment.className = 'layer-shared-segment';

    const segmentHeader = document.createElement('div');
    segmentHeader.className = 'layer-shared-segment-header';

    const ownerLabel = document.createElement('span');
    ownerLabel.className = 'layer-shared-segment-owner';
    ownerLabel.textContent = entry.layer.ownerName || 'Shared';
    segmentHeader.appendChild(ownerLabel);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'layer-shared-segment-remove';
    removeBtn.title = 'Remove from shared';
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      layerStore.getState().removeSharedLayer(entry.layer.id);
    });
    segmentHeader.appendChild(removeBtn);

    segment.appendChild(segmentHeader);
    segment.appendChild(renderAnnotationList(entry.annotations, true));
    container.appendChild(segment);
  }

  return container;
}

function renderBrowseTab(state: ReturnType<typeof layerStore.getState>): HTMLElement {
  const container = document.createElement('div');

  if (state.publicLayers.length === 0 && state.syncStatus === 'idle') {
    const empty = document.createElement('div');
    empty.className = 'layer-timeline-empty';
    empty.textContent = 'No public notes on this video yet';
    container.appendChild(empty);
    return container;
  }

  if (state.syncStatus === 'syncing' && state.publicLayers.length === 0) {
    const loading = document.createElement('div');
    loading.className = 'layer-timeline-empty';
    loading.textContent = 'Loading public notes\u2026';
    container.appendChild(loading);
    return container;
  }

  for (const summary of state.publicLayers) {
    const card = document.createElement('div');
    card.className = 'layer-browse-card';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'layer-browse-card-header';

    const ownerInfo = document.createElement('div');
    ownerInfo.className = 'layer-browse-owner-info';

    const ownerName = document.createElement('span');
    ownerName.className = 'layer-browse-owner-name';
    ownerName.textContent = summary.layer.ownerName || 'Anonymous';
    ownerInfo.appendChild(ownerName);

    const noteCount = document.createElement('span');
    noteCount.className = 'layer-browse-note-count';
    noteCount.textContent = `${summary.annotationCount} note${summary.annotationCount !== 1 ? 's' : ''}`;
    ownerInfo.appendChild(noteCount);

    cardHeader.appendChild(ownerInfo);

    const reactions = document.createElement('div');
    reactions.className = 'layer-browse-reactions';

    const likeBtn = document.createElement('button');
    likeBtn.className = 'layer-reaction-btn' + (summary.userReaction === 'like' ? ' layer-reaction-active' : '');
    likeBtn.innerHTML = getReactionIconHtml('like', summary.userReaction === 'like') + `<span class="layer-reaction-count">${summary.layer.likeCount}</span>`;
    likeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await layerStore.getState().likeLayer(summary.layer.id);
    });
    reactions.appendChild(likeBtn);

    const dislikeBtn = document.createElement('button');
    dislikeBtn.className = 'layer-reaction-btn' + (summary.userReaction === 'dislike' ? ' layer-reaction-active' : '');
    dislikeBtn.innerHTML = getReactionIconHtml('dislike', summary.userReaction === 'dislike') + `<span class="layer-reaction-count">${summary.layer.dislikeCount}</span>`;
    dislikeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await layerStore.getState().dislikeLayer(summary.layer.id);
    });
    reactions.appendChild(dislikeBtn);

    cardHeader.appendChild(reactions);
    card.appendChild(cardHeader);

    if (state.expandedPublicLayerId === summary.layer.id) {
      const notesContainer = document.createElement('div');
      notesContainer.className = 'layer-browse-expanded';
      notesContainer.appendChild(renderAnnotationList(state.expandedPublicAnnotations, true));

      const collapseBtn = document.createElement('button');
      collapseBtn.className = 'layer-btn-primary layer-browse-collapse-btn';
      collapseBtn.textContent = 'Collapse';
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        layerStore.getState().collapsePublicLayer();
      });
      notesContainer.appendChild(collapseBtn);
      card.appendChild(notesContainer);
    } else {
      const actions = document.createElement('div');
      actions.className = 'layer-browse-card-actions';

      const addBtn = document.createElement('button');
      addBtn.className = 'layer-btn-primary layer-browse-add-btn';
      addBtn.textContent = 'Add to Shared';
      addBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await layerStore.getState().addSharedLayer(summary.layer.id);
        layerStore.getState().setActiveTab('shared');
      });
      actions.appendChild(addBtn);

      const viewBtn = document.createElement('button');
      viewBtn.className = 'layer-btn-sm';
      viewBtn.textContent = 'Preview';
      viewBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await layerStore.getState().expandPublicLayer(summary.layer.id);
      });
      actions.appendChild(viewBtn);

      card.appendChild(actions);
    }

    container.appendChild(card);
  }

  return container;
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
      const newTimeline = renderTimeline(searchQuery, layerStore.getState().activeTab !== 'own');
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
  usernameInput.maxLength = MAX_USERNAME_LENGTH;
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
  durationSlider.min = String(TOAST_DURATION_MIN);
  durationSlider.max = String(TOAST_DURATION_MAX);
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

  const defaultPublicRow = document.createElement('div');
  defaultPublicRow.className = 'layer-settings-row';

  const defaultPublicLabel = document.createElement('span');
  defaultPublicLabel.className = 'layer-settings-label';
  defaultPublicLabel.textContent = 'New notes default';

  const defaultPublicToggle = document.createElement('button');
  defaultPublicToggle.className = 'layer-public-toggle' + (state.defaultIsPublic ? ' layer-public-active' : '');
  defaultPublicToggle.innerHTML = state.defaultIsPublic
    ? '<span class="layer-public-dot"></span>Public'
    : 'Private';
  defaultPublicToggle.addEventListener('click', async () => {
    await layerStore.getState().setDefaultIsPublic(!state.defaultIsPublic);
  });

  defaultPublicRow.appendChild(defaultPublicLabel);
  defaultPublicRow.appendChild(defaultPublicToggle);
  settings.appendChild(defaultPublicRow);

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
        await clipboardCopy(shareInput.value);
        copyBtn.textContent = 'Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      } catch {
        /* Clipboard API unavailable */
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