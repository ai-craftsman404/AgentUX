import * as vscode from 'vscode';
import { AnalysisState } from '../types';

const getNonce = (): string =>
  Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join('');

const getCsp = (webview: vscode.Webview, nonce: string): string => {
  return `
    default-src 'none';
    img-src ${webview.cspSource} https:;
    script-src 'nonce-${nonce}';
    style-src ${webview.cspSource} 'unsafe-inline';
  `;
};

export const getWebviewHtml = (
  webview: vscode.Webview,
  _extensionUri: vscode.Uri,
  state: AnalysisState,
): string => {
  const nonce = getNonce();
  const screenshotUri = state.lastScreenshotUri
    ? webview.asWebviewUri(vscode.Uri.file(state.lastScreenshotUri)).toString()
    : '';
  const safeScreenshotUri = screenshotUri.replace(/"/g, '&quot;');

  const serializedState = JSON.stringify(state).replace(/</g, '\\u003c');

  const summary = state.summary ?? { strengths: [], weaknesses: [] };

  const agentFindingsEntries = (
    Object.entries(state.agentFindings) as [string, string[]][]
  ).filter(([, findings]) => findings.length);

  return /* html */ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="${getCsp(
          webview,
          nonce,
        ).replace(/\s+/g, ' ')}" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AgentUX Analysis</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 16px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
          }
          h1 {
            font-size: 1.4rem;
            margin-bottom: 0.5rem;
          }
          h2 {
            margin-bottom: 0.5rem;
          }
          h3 {
            margin-top: 0;
          }
          .meta {
            margin-bottom: 1rem;
            font-size: 0.9rem;
          }
          ul {
            padding-left: 1.2rem;
          }
          .layout {
            display: grid;
            grid-template-columns: minmax(420px, 1.2fr) minmax(320px, 0.8fr);
            gap: 1.5rem;
          }
          .panel {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 1rem;
            background: var(--vscode-editor-background);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }
          .canvas {
            position: relative;
            width: 100%;
          }
          .canvas img {
            width: 100%;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            display: block;
            background: var(--vscode-editorPane-background);
          }
          .regions-layer {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }
          .region-box {
            position: absolute;
            border: 1px solid rgba(255, 99, 71, 0.8);
            background: rgba(255, 99, 71, var(--heat-opacity, 0.4));
            border-radius: 4px;
            pointer-events: auto;
            cursor: pointer;
            transition: transform 0.1s ease, border-color 0.1s ease;
          }
          .region-box:hover,
          .region-box.hovered {
            border-color: var(--vscode-focusBorder);
            transform: scale(1.02);
          }
          .region-box.selected {
            border-color: var(--vscode-textLink-activeForeground);
            background: rgba(0, 120, 212, var(--heat-opacity, 0.45));
          }
          .controls {
            display: flex;
            gap: 0.75rem;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 0.75rem;
          }
          .controls label {
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 0.35rem;
          }
          .controls button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 0.35rem 0.75rem;
            border-radius: 4px;
            cursor: pointer;
          }
          .controls button:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .selection-summary {
            margin-top: 0.75rem;
            font-size: 0.9rem;
            color: var(--vscode-descriptionForeground);
          }
          .regions-list,
          .findings-list {
            list-style: none;
            padding-left: 0;
            margin: 0;
          }
          .regions-list button,
          .findings-list li {
            width: 100%;
            border: 1px solid transparent;
            border-radius: 4px;
            background: transparent;
            color: var(--vscode-foreground);
            text-align: left;
            padding: 0.4rem;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .regions-list button:hover,
          .regions-list button.hovered,
          .regions-list button.selected {
            border-color: var(--vscode-focusBorder);
            background: rgba(255,255,255,0.04);
          }
          .regions-list strong {
            text-transform: capitalize;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 0.5rem;
          }
          .summary-grid ul {
            margin: 0;
          }
          .agent-findings {
            margin-top: 1rem;
          }
          .agent-findings h3 {
            margin-bottom: 0.25rem;
          }
          .agent-findings li {
            border-bottom: 1px dashed rgba(255,255,255,0.08);
            padding: 0.2rem 0;
          }
        </style>
      </head>
      <body>
        <h1>AgentUX Analysis</h1>
        <div class="meta">
          <strong>Platform:</strong> ${state.metadata?.platform ?? 'n/a'} |
          <strong>UI Type:</strong> ${state.metadata?.uiType ?? 'n/a'} |
          <strong>Audience:</strong> ${state.metadata?.audience ?? 'n/a'}
        </div>
        <div class="layout">
          <section class="panel">
            <div class="controls">
              <label>
                Heatmap opacity
                <input type="range" id="heatmapSlider" min="0" max="1" step="0.05" value="0.45" />
              </label>
              <button id="selectAllBtn">Select all</button>
              <button id="clearSelectionBtn">Clear</button>
            </div>
            <div class="canvas">
              ${
                screenshotUri
                  ? `<img id="screenshot" src="${safeScreenshotUri}" alt="Analysed screenshot" />`
                  : '<div style="text-align:center;padding:2rem;">Screenshot unavailable.</div>'
              }
              <div class="regions-layer" id="regionsLayer"></div>
            </div>
            <div class="selection-summary" id="selectionSummary">
              No regions selected. Use click, Ctrl+A, or Escape to manage selections.
            </div>
          </section>
          <section class="panel">
            <h2>Summary</h2>
            <div class="summary-grid">
              <div>
                <h3>Strengths</h3>
                <ul>
                  ${
                    summary.strengths.length
                      ? summary.strengths.map((s) => `<li>${s}</li>`).join('')
                      : '<li>None recorded.</li>'
                  }
                </ul>
              </div>
              <div>
                <h3>Weaknesses</h3>
                <ul>
                  ${
                    summary.weaknesses.length
                      ? summary.weaknesses.map((s) => `<li>${s}</li>`).join('')
                      : '<li>None recorded.</li>'
                  }
                </ul>
              </div>
            </div>
            <div style="margin-top:1rem;">
              <h3>Regions (${state.regions.length})</h3>
              <div id="regionsList"></div>
            </div>
            ${
              agentFindingsEntries.length
                ? `<div class="agent-findings">
                    <h3>Agent Findings</h3>
                    ${agentFindingsEntries
                      .map(
                        ([agent, findings]) => `
                          <div>
                            <strong>${agent}</strong>
                            <ul class="findings-list">
                              ${findings
                                .map((f) => `<li>${f}</li>`)
                                .join('')}
                            </ul>
                          </div>
                        `,
                      )
                      .join('')}
                  </div>`
                : ''
            }
          </section>
        </div>
        <script nonce="${nonce}">
          const state = ${serializedState};
          const screenshotEl = document.getElementById('screenshot');
          const regionsLayer = document.getElementById('regionsLayer');
          const regionsListEl = document.getElementById('regionsList');
          const heatmapSlider = document.getElementById('heatmapSlider');
          const selectAllBtn = document.getElementById('selectAllBtn');
          const clearSelectionBtn = document.getElementById('clearSelectionBtn');
          const selectionSummary = document.getElementById('selectionSummary');
          const selection = new Set();
          document.body.style.setProperty('--heat-opacity', heatmapSlider.value);
          const regions = state.regions.map((region, index) => ({
            ...region,
            id: \`region-\${index}\`,
          }));

          const createRegionElement = (region, scaleX, scaleY) => {
            const el = document.createElement('div');
            el.className = 'region-box';
            el.style.left = region.bounds.x * scaleX + 'px';
            el.style.top = region.bounds.y * scaleY + 'px';
            el.style.width = region.bounds.width * scaleX + 'px';
            el.style.height = region.bounds.height * scaleY + 'px';
            el.dataset.regionId = region.id;
            return el;
          };

          const renderRegionsList = () => {
            regionsListEl.innerHTML = '';
            const list = document.createElement('ul');
            list.className = 'regions-list';

            regions.forEach((region, index) => {
              const button = document.createElement('button');
              button.dataset.regionId = region.id;
              button.innerHTML = \`
                <span>
                  <strong>\${region.classification.category.replace('_', ' ')}</strong>
                  <small>#\${index + 1} — \${region.classification.subcategory}</small>
                </span>
                <em>\${region.severity.level}</em>
              \`;
              list.appendChild(button);
            });

            regionsListEl.appendChild(list);
          };

          const updateSelectionSummary = () => {
            if (selection.size === 0) {
              selectionSummary.textContent =
                'No regions selected. Use click, Ctrl+A, or Escape to manage selections.';
            } else {
              selectionSummary.textContent = \`\${selection.size} region(s) selected.\`;
            }
          };

          const syncSelectionStyles = () => {
            document
              .querySelectorAll('.region-box')
              .forEach((el) =>
                el.classList.toggle('selected', selection.has(el.dataset.regionId)),
              );
            document
              .querySelectorAll('.regions-list button')
              .forEach((el) =>
                el.classList.toggle('selected', selection.has(el.dataset.regionId)),
              );
            updateSelectionSummary();
          };

          const toggleSelection = (regionId) => {
            if (selection.has(regionId)) {
              selection.delete(regionId);
            } else {
              selection.add(regionId);
            }
            syncSelectionStyles();
          };

          const selectAll = () => {
            regions.forEach((region) => selection.add(region.id));
            syncSelectionStyles();
          };

          const clearSelection = () => {
            selection.clear();
            syncSelectionStyles();
          };

          const highlightRegion = (regionId, hovered) => {
            document
              .querySelectorAll(\`[data-region-id="\${regionId}"]\`)
              .forEach((el) => el.classList.toggle('hovered', hovered));
          };

          const drawRegions = () => {
            if (!screenshotEl) {
              return;
            }
            const scaleX = screenshotEl.clientWidth / screenshotEl.naturalWidth || 1;
            const scaleY = screenshotEl.clientHeight / screenshotEl.naturalHeight || 1;

            regionsLayer.innerHTML = '';
            regionsLayer.innerHTML = '';
            regions.forEach((region) => {
              const el = createRegionElement(region, scaleX, scaleY);
              regionsLayer.appendChild(el);
            });
            renderRegionsList();
            syncSelectionStyles();
          };

          if (screenshotEl) {
            screenshotEl.addEventListener('load', drawRegions);
            window.addEventListener('resize', drawRegions);
            if (screenshotEl.complete) {
              drawRegions();
            }
          } else {
            renderRegionsList();
          }

          regionsLayer?.addEventListener('click', (event) => {
            const target = event.target.closest('.region-box');
            if (target?.dataset.regionId) {
              toggleSelection(target.dataset.regionId);
            }
          });

          regionsLayer?.addEventListener('mouseover', (event) => {
            const target = event.target.closest('.region-box');
            if (target?.dataset.regionId) {
              highlightRegion(target.dataset.regionId, true);
            }
          });

          regionsLayer?.addEventListener('mouseout', (event) => {
            const target = event.target.closest('.region-box');
            if (target?.dataset.regionId) {
              highlightRegion(target.dataset.regionId, false);
            }
          });

          regionsListEl.addEventListener('click', (event) => {
            const target = event.target.closest('button[data-region-id]');
            if (target?.dataset.regionId) {
              toggleSelection(target.dataset.regionId);
            }
          });

          regionsListEl.addEventListener('mouseover', (event) => {
            const target = event.target.closest('button[data-region-id]');
            if (target?.dataset.regionId) {
              highlightRegion(target.dataset.regionId, true);
            }
          });

          regionsListEl.addEventListener('mouseout', (event) => {
            const target = event.target.closest('button[data-region-id]');
            if (target?.dataset.regionId) {
              highlightRegion(target.dataset.regionId, false);
            }
          });

          heatmapSlider.addEventListener('input', (event) => {
            document.body.style.setProperty(
              '--heat-opacity',
              event.target.value,
            );
          });

          selectAllBtn.addEventListener('click', selectAll);
          clearSelectionBtn.addEventListener('click', clearSelection);

          window.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
              event.preventDefault();
              selectAll();
            }
            if (event.key === 'Escape') {
              clearSelection();
            }
          });
        </script>
      </body>
    </html>
  `;
};
