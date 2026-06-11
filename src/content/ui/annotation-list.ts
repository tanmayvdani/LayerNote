import { Annotation } from '../../storage/types';
import { layerStore } from '../layer-state';
import { formatTimestamp, parseTimestamp } from '../utils';
import { VIDEO_SELECTOR, MAX_CONTENT_LENGTH } from '../constants';

export function renderTimeline(searchQuery: string = '', readOnly: boolean = false): HTMLElement {
  const container = document.createElement('div');
  container.className = 'layer-timeline';

  const state = layerStore.getState();
  let annotations = Array.from(state.annotations.values());

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    annotations = annotations.filter(a => a.content.toLowerCase().includes(q));
  }

  annotations.sort((a, b) => a.timestampSeconds - b.timestampSeconds);

  if (annotations.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'layer-timeline-empty';
    empty.textContent = searchQuery ? 'No matching notes' : 'No notes yet';
    container.appendChild(empty);
    return container;
  }

  const isReadOnly = readOnly || state.activeTab !== 'own';

  for (const ann of annotations) {
    container.appendChild(createCard(ann, isReadOnly));
  }

  return container;
}

export function renderAnnotationList(annotations: Annotation[], readOnly: boolean = true): HTMLElement {
  const container = document.createElement('div');
  container.className = 'layer-timeline';

  const sorted = [...annotations].sort((a, b) => a.timestampSeconds - b.timestampSeconds);

  if (sorted.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'layer-timeline-empty';
    empty.textContent = 'No notes yet';
    container.appendChild(empty);
    return container;
  }

  for (const ann of sorted) {
    container.appendChild(createCard(ann, readOnly));
  }

  return container;
}

function createCard(ann: Annotation, isViewer: boolean): HTMLElement {
  const card = document.createElement('div');
  card.className = 'layer-card';
  card.dataset.annotationId = ann.id;

  const tsBtn = document.createElement('button');
  tsBtn.className = 'layer-card-ts';
  tsBtn.textContent = formatTimestamp(ann.timestampSeconds);
  tsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const video = document.querySelector<HTMLVideoElement>(VIDEO_SELECTOR);
    if (video) {
      video.currentTime = ann.timestampSeconds;
    }
  });

  const body = document.createElement('div');
  body.className = 'layer-card-body';

  const text = document.createElement('div');
  text.className = 'layer-card-text';
  text.textContent = ann.content;
  body.appendChild(text);

  if (!isViewer) {
    const del = document.createElement('button');
    del.className = 'layer-card-delete';
    del.textContent = '\u00d7';
    del.title = 'Delete';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      layerStore.getState().deleteAnnotation(ann.id);
    });

    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.layer-card-ts') ||
          (e.target as HTMLElement).closest('.layer-card-delete')) {
        return;
      }
      enterEditMode(card, ann);
    });

    card.appendChild(tsBtn);
    card.appendChild(body);
    card.appendChild(del);
  } else {
    card.addEventListener('click', () => {
      const video = document.querySelector<HTMLVideoElement>(VIDEO_SELECTOR);
      if (video) {
        video.currentTime = ann.timestampSeconds;
      }
    });
    card.appendChild(tsBtn);
    card.appendChild(body);
  }

  return card;
}

function enterEditMode(card: HTMLElement, ann: Annotation): void {
  card.innerHTML = '';
  card.className = 'layer-card layer-card-editing';

  const tsInput = document.createElement('input');
  tsInput.className = 'layer-card-ts layer-card-ts-input';
  tsInput.type = 'text';
  tsInput.value = formatTimestamp(ann.timestampSeconds);
  tsInput.maxLength = 8;
  tsInput.addEventListener('click', (e) => e.stopPropagation());

  const body = document.createElement('div');
  body.className = 'layer-card-body';

  const textInput = document.createElement('input');
  textInput.className = 'layer-card-edit-input';
  textInput.type = 'text';
  textInput.value = ann.content;
  textInput.maxLength = MAX_CONTENT_LENGTH;
  textInput.addEventListener('click', (e) => e.stopPropagation());

  body.appendChild(textInput);

  const save = () => {
    const newTs = parseTimestamp(tsInput.value);
    const newContent = textInput.value.trim();
    if (!isNaN(newTs) && newTs >= 0 && newContent && (newTs !== ann.timestampSeconds || newContent !== ann.content)) {
      layerStore.getState().updateAnnotation(ann.id, newContent, newTs);
    } else {
      cardCancelled = true;
      const state = layerStore.getState();
      const freshAnn = state.annotations.get(ann.id);
      if (freshAnn) {
        card.innerHTML = '';
        card.className = 'layer-card';
        rebuildCard(card, freshAnn, state.activeTab !== 'own');
      }
    }
  };

  let cardCancelled = false;

  tsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      textInput.focus();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      cardCancelled = true;
      const state = layerStore.getState();
      const freshAnn = state.annotations.get(ann.id);
      if (freshAnn) {
        card.innerHTML = '';
        card.className = 'layer-card';
        rebuildCard(card, freshAnn, state.activeTab !== 'own');
      }
    }
  });

  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      cardCancelled = true;
      const state = layerStore.getState();
      const freshAnn = state.annotations.get(ann.id);
      if (freshAnn) {
        card.innerHTML = '';
        card.className = 'layer-card';
        rebuildCard(card, freshAnn, state.activeTab !== 'own');
      }
    }
  });

  tsInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (!cardCancelled && document.activeElement !== textInput && document.activeElement !== tsInput) {
        save();
      }
    }, 100);
  });

  textInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (!cardCancelled && document.activeElement !== textInput && document.activeElement !== tsInput) {
        save();
      }
    }, 100);
  });

  card.appendChild(tsInput);
  card.appendChild(body);

  textInput.focus();
  textInput.select();
}

function rebuildCard(card: HTMLElement, ann: Annotation, isViewer: boolean): void {
  const fresh = createCard(ann, isViewer);
  card.replaceWith(fresh);
}