export const SIDEBAR_STYLES = `
@keyframes layer-slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes layer-toast-appear {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

#layer-panel {
  background: #0f0f0f;
  border: 1px solid #272727;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
  font-family: 'Roboto', system-ui, -apple-system, sans-serif;
  color: #f1f1f1;
  font-size: 14px;
}

.layer-panel-collapsed #layer-panel-body {
  display: none;
}

#layer-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  background: #181818;
  transition: background 0.15s;
}

#layer-panel-header:hover {
  background: #222;
}

#layer-panel-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

#layer-panel-chevron {
  color: #aaa;
  font-size: 10px;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.layer-panel-collapsed #layer-panel-chevron {
  transform: rotate(-90deg);
}

#layer-panel-title {
  font-size: 13px;
  font-weight: 500;
  color: #f1f1f1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-panel-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 8px;
}

.layer-icon-btn {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.layer-icon-btn:hover {
  background: #272727;
  color: #fff;
}

.layer-gear-btn {
  font-size: 18px !important;
  color: #fff !important;
}

.layer-share-btn {
  font-size: 16px !important;
}

#layer-panel-body {
  padding: 0;
}

/* ── Tab bar ── */

.layer-tab-bar {
  display: flex;
  gap: 2px;
  background: #272727;
  border-radius: 6px;
  padding: 2px;
  margin-left: 4px;
}

.layer-tab {
  background: none;
  border: none;
  color: #aaa;
  font-size: 11px;
  font-family: inherit;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.layer-tab:hover {
  color: #f1f1f1;
  background: #333;
}

.layer-tab-active {
  background: #3ea6ff !important;
  color: #0f0f0f !important;
  font-weight: 600;
}

.layer-tab-active:hover {
  background: #65b8ff !important;
  color: #0f0f0f !important;
}

/* ── Create bar ── */

.layer-create-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #1e1e1e;
}

.layer-ts-badge {
  background: #3ea6ff;
  color: #0f0f0f;
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s;
  border: none;
  line-height: 1.4;
}

.layer-ts-badge:hover {
  background: #65b8ff;
}

.layer-note-input {
  background: #181818;
  border: 1px solid #272727;
  color: #f1f1f1;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  font-family: inherit;
  flex: 1;
  resize: none;
  min-height: 30px;
  max-height: 60px;
  line-height: 1.4;
  transition: border-color 0.15s;
}

.layer-note-input:focus {
  outline: none;
  border-color: #3ea6ff;
}

.layer-note-input::placeholder {
  color: #717171;
}

/* ── Search ── */

.layer-search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid #1e1e1e;
  background: #0f0f0f;
}

.layer-search-icon {
  color: #717171;
  font-size: 13px;
  flex-shrink: 0;
}

.layer-search-input {
  background: none;
  border: none;
  color: #f1f1f1;
  font-size: 12px;
  font-family: inherit;
  flex: 1;
  padding: 2px 0;
}

.layer-search-input:focus {
  outline: none;
}

.layer-search-input::placeholder {
  color: #555;
}

/* ── Timeline list ── */

.layer-timeline {
  max-height: 400px;
  overflow-y: auto;
  padding: 6px 0;
}

.layer-timeline-empty {
  text-align: center;
  padding: 28px 16px;
  color: #555;
  font-size: 13px;
  line-height: 1.5;
}

/* ── Timeline card ── */

.layer-card {
  display: flex;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
  align-items: flex-start;
}

.layer-card:hover {
  background: #181818;
}

.layer-card-ts {
  background: #222;
  color: #3ea6ff;
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 1px;
  min-width: 42px;
  text-align: center;
  border: none;
  cursor: pointer;
  line-height: 1.5;
  transition: background 0.15s, color 0.15s;
}

.layer-card-ts:hover {
  background: #3ea6ff;
  color: #0f0f0f;
}

.layer-card-body {
  flex: 1;
  min-width: 0;
}

.layer-card-text {
  font-size: 13px;
  color: #ccc;
  line-height: 1.35;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.layer-card-delete {
  background: none;
  border: none;
  color: transparent;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.layer-card:hover .layer-card-delete {
  color: #717171;
}

.layer-card-delete:hover {
  color: #cc0000 !important;
  background: #272727;
}

.layer-card-editing {
  background: #1a1a2e;
  border-left: 2px solid #3ea6ff;
}

.layer-card-ts-input {
  background: #222 !important;
  color: #3ea6ff !important;
  font-family: 'Roboto Mono', monospace !important;
  font-size: 12px !important;
  font-weight: 600;
  border: 1px solid #3ea6ff !important;
  border-radius: 3px !important;
  padding: 2px 6px !important;
  width: 56px;
  text-align: center;
  outline: none;
}

.layer-card-edit-input {
  background: #222;
  border: 1px solid #3ea6ff;
  color: #f1f1f1;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
  font-family: inherit;
  width: 100%;
  outline: none;
}

/* ── Settings drawer ── */

.layer-settings {
  padding: 12px;
  border-top: 1px solid #272727;
  background: #0f0f0f;
}

.layer-settings-title {
  font-size: 12px;
  color: #717171;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.layer-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.layer-settings-label {
  font-size: 12px;
  color: #aaa;
}

.layer-settings-slider {
  width: 100px;
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  background: #3a3a3a;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.layer-settings-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3ea6ff;
  cursor: pointer;
}

.layer-settings-value {
  font-size: 12px;
  color: #3ea6ff;
  font-weight: 500;
  min-width: 24px;
  text-align: right;
}

.layer-settings-input {
  background: #181818;
  border: 1px solid #272727;
  color: #f1f1f1;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: inherit;
  width: 140px;
  outline: none;
}

.layer-settings-input:focus {
  border-color: #3ea6ff;
}

.layer-settings-input::placeholder {
  color: #717171;
}

.layer-settings-share {
  display: flex;
  gap: 6px;
  align-items: center;
}

.layer-settings-share-input {
  background: #181818;
  border: 1px solid #272727;
  color: #aaa;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  font-family: monospace;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-settings-share-input:focus {
  outline: none;
  border-color: #3ea6ff;
}

.layer-btn-sm {
  background: #272727;
  color: #f1f1f1;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.layer-btn-sm:hover {
  background: #3a3a3a;
}

/* ── Create Layer CTA ── */

.layer-create-cta {
  text-align: center;
  padding: 28px 16px;
}

.layer-create-cta p {
  color: #717171;
  font-size: 13px;
  margin: 0 0 12px;
}

.layer-btn-primary {
  background: #3ea6ff;
  color: #0f0f0f;
  border: none;
  border-radius: 18px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.layer-btn-primary:hover {
  background: #65b8ff;
}

/* ── Own tab header ── */

.layer-own-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #1e1e1e;
}

.layer-own-owner-label {
  font-size: 12px;
  color: #aaa;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.layer-public-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #272727;
  border: 1px solid #3a3a3a;
  color: #aaa;
  border-radius: 12px;
  padding: 3px 10px;
  font-size: 11px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.3;
}

.layer-public-toggle:hover {
  background: #333;
  border-color: #4a4a4a;
}

.layer-public-active {
  background: rgba(62, 166, 255, 0.15);
  border-color: #3ea6ff;
  color: #3ea6ff;
}

.layer-public-active:hover {
  background: rgba(62, 166, 255, 0.25);
}

.layer-public-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3ea6ff;
  margin-right: 2px;
  vertical-align: middle;
  animation: layer-dot-pulse 2s ease-in-out infinite;
}

@keyframes layer-dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Shared tab segments ── */

.layer-shared-segment {
  border-bottom: 1px solid #1e1e1e;
}

.layer-shared-segment:last-child {
  border-bottom: none;
}

.layer-shared-segment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #141414;
  border-bottom: 1px solid #1e1e1e;
}

.layer-shared-segment-owner {
  font-size: 12px;
  font-weight: 600;
  color: #3ea6ff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.layer-shared-segment-remove {
  background: none;
  border: none;
  color: #717171;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s;
  flex-shrink: 0;
}

.layer-shared-segment-remove:hover {
  color: #cc0000;
}

/* ── Browse tab ── */

.layer-browse-card {
  padding: 12px;
  border-bottom: 1px solid #1e1e1e;
  transition: background 0.1s;
}

.layer-browse-card:hover {
  background: #141414;
}

.layer-browse-card:last-child {
  border-bottom: none;
}

.layer-browse-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.layer-browse-owner-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.layer-browse-owner-name {
  font-size: 13px;
  font-weight: 500;
  color: #f1f1f1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-browse-note-count {
  font-size: 11px;
  color: #717171;
}

.layer-browse-reactions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.layer-reaction-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 3px 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
  line-height: 1;
}

.layer-reaction-btn:hover {
  background: #222;
  border-color: #3a3a3a;
}

.layer-reaction-active {
  background: rgba(62, 166, 255, 0.12);
  border-color: #3ea6ff;
}

.layer-reaction-icon {
  font-size: 12px;
  line-height: 1;
}

.layer-reaction-count {
  font-size: 11px;
  color: #aaa;
  font-weight: 500;
  line-height: 1;
}

.layer-reaction-active .layer-reaction-count {
  color: #3ea6ff;
}

.layer-browse-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.layer-browse-add-btn {
  padding: 5px 14px !important;
  font-size: 12px !important;
}

.layer-browse-collapse-btn {
  margin-top: 8px;
  padding: 5px 14px !important;
  font-size: 12px !important;
  display: block;
  width: 100%;
  text-align: center;
}

.layer-browse-expanded {
  border-top: 1px solid #1e1e1e;
  margin-top: 4px;
}

.layer-browse-expanded .layer-card:hover {
  background: #1a1a1a;
}

/* ── Viewer badge (legacy, kept for compatibility) ── */

.layer-viewer-badge {
  background: #f9a825;
  color: #0f0f0f;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 6px;
}

/* ── Player buttons ── */

.ytp-button-layer-wrap {
  display: flex;
  align-items: center;
  gap: 0;
}

.ytp-button-layer {
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 6px;
  box-sizing: border-box;
}

.ytp-button-layer svg {
  width: 100%;
  height: 100%;
}

.ytp-button-layer .layer-button-active-indicator {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #3ea6ff;
  opacity: 0;
  transition: opacity 0.15s;
}

.layer-toggle-btn.layer-toasts-on .layer-button-active-indicator {
  opacity: 1;
}

.layer-toggle-btn.layer-toasts-on {
  opacity: 1;
}

.layer-toggle-btn:not(.layer-toasts-on) {
  opacity: 0.5;
}

.layer-add-btn {
  opacity: 0.9;
}

.layer-add-btn:not(.layer-add-disabled) {
  opacity: 0.9;
}

.ytp-button-layer .layer-btn-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  pointer-events: none;
  display: block;
  margin: auto;
}

.layer-add-disabled {
  opacity: 0.4;
  cursor: default;
}
`;

export function injectSidebarStyles(): void {
  if (document.getElementById('layer-sidebar-styles')) return;

  const style = document.createElement('style');
  style.id = 'layer-sidebar-styles';
  style.textContent = SIDEBAR_STYLES;
  document.head.appendChild(style);
}