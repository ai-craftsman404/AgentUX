import * as path from 'path';
import { promises as fs } from 'fs';
import { PNG } from 'pngjs';

/**
 * Generates a side-by-side comparison HTML view for assessing test outputs.
 * This allows visual verification that overlay images accurately represent
 * elements from source images.
 */

interface TestImage {
  name: string;
  sourcePath: string;
  overlayPath: string;
  reportPath?: string;
  qualityPath?: string;
  visualPath?: string;
}

async function generateAssessmentView(
  testDir: string = 'artifacts/tests',
): Promise<void> {
  const testDirPath = path.resolve(testDir);
  const outputPath = path.join(testDirPath, 'TEST_ASSESSMENT_VIEW.html');

  // Find all source images
  const sourceDir = path.resolve('fixtures/images/real');
  const sourceFiles = await fs.readdir(sourceDir);
  const imageFiles = sourceFiles.filter((f) => /\.(png|jpg|jpeg)$/i.test(f));

  const tests: TestImage[] = [];

  for (const imageFile of imageFiles) {
    const imageName = path.basename(imageFile, path.extname(imageFile));
    const sourcePath = path.join(sourceDir, imageFile);
    const overlayPath = path.join(testDirPath, `${imageName}-overlay.png`);

    // Check if overlay exists
    let overlayExists = false;
    try {
      await fs.access(overlayPath);
      overlayExists = true;
    } catch {
      // Overlay doesn't exist yet
    }

    if (overlayExists) {
      tests.push({
        name: imageName,
        sourcePath: path.relative(testDirPath, sourcePath),
        overlayPath: path.relative(testDirPath, overlayPath),
        reportPath: `REPORT_${imageName}.md`,
        qualityPath: `QUALITY_${imageName}.md`,
        visualPath: `VISUAL_${imageName}.md`,
      });
    }
  }

  // Get image dimensions for layout
  const imageDimensions: Array<{ name: string; width: number; height: number }> = [];
  for (const test of tests) {
    try {
      const fullSourcePath = path.join(testDirPath, test.sourcePath);
      const buffer = await fs.readFile(fullSourcePath);
      const image = PNG.sync.read(buffer);
      imageDimensions.push({
        name: test.name,
        width: image.width,
        height: image.height,
      });
    } catch {
      // Skip if can't read
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgentUX Test Assessment View</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            background: #252526;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border: 1px solid #3e3e42;
        }
        .header h1 {
            color: #4ec9b0;
            margin-bottom: 10px;
        }
        .header p {
            color: #858585;
            font-size: 14px;
        }
        .test-section {
            background: #252526;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            border: 1px solid #3e3e42;
        }
        .test-section h2 {
            color: #4ec9b0;
            margin-bottom: 15px;
            font-size: 20px;
        }
        .comparison-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .image-container {
            background: #1e1e1e;
            border-radius: 4px;
            padding: 10px;
            border: 1px solid #3e3e42;
        }
        .image-container h3 {
            color: #ce9178;
            font-size: 14px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .image-container img {
            max-width: 100%;
            height: auto;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            display: block;
        }
        .assessment-checklist {
            background: #1e1e1e;
            border-radius: 4px;
            padding: 15px;
            border: 1px solid #3e3e42;
            margin-top: 15px;
        }
        .assessment-checklist h4 {
            color: #4ec9b0;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .checklist-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 8px;
            padding: 8px;
            background: #252526;
            border-radius: 4px;
        }
        .checklist-item input[type="checkbox"] {
            margin-right: 10px;
            margin-top: 3px;
            cursor: pointer;
        }
        .checklist-item label {
            cursor: pointer;
            flex: 1;
            color: #d4d4d4;
            font-size: 14px;
        }
        .reports-links {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 15px;
        }
        .report-link {
            padding: 6px 12px;
            background: #0e639c;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 12px;
            transition: background 0.2s;
        }
        .report-link:hover {
            background: #1177bb;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }
        .status-pending {
            background: #6a6a6a;
            color: white;
        }
        .status-valid {
            background: #4caf50;
            color: white;
        }
        .status-invalid {
            background: #f44336;
            color: white;
        }
        .summary {
            background: #252526;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            border: 1px solid #3e3e42;
        }
        .summary h2 {
            color: #4ec9b0;
            margin-bottom: 15px;
        }
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .stat-card {
            background: #1e1e1e;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #3e3e42;
        }
        .stat-card .label {
            color: #858585;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .stat-card .value {
            color: #4ec9b0;
            font-size: 24px;
            font-weight: 600;
        }
        @media (max-width: 768px) {
            .comparison-container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 AgentUX Test Assessment View</h1>
        <p>Visual verification that overlay images accurately represent elements from source images</p>
        <p style="margin-top: 10px; font-size: 12px;">Generated: ${new Date().toISOString()}</p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <div class="summary-stats">
            <div class="stat-card">
                <div class="label">Total Tests</div>
                <div class="value">${tests.length}</div>
            </div>
            <div class="stat-card">
                <div class="label">Pending Assessment</div>
                <div class="value" id="pending-count">${tests.length}</div>
            </div>
            <div class="stat-card">
                <div class="label">Valid</div>
                <div class="value" id="valid-count">0</div>
            </div>
            <div class="stat-card">
                <div class="label">Invalid</div>
                <div class="value" id="invalid-count">0</div>
            </div>
        </div>
    </div>

    ${tests
      .map(
        (test, index) => `
    <div class="test-section" data-test-index="${index}">
        <h2>Test ${index + 1}: ${test.name}</h2>
        
        <div class="comparison-container">
            <div class="image-container">
                <h3>📸 Source Image</h3>
                <img src="${test.sourcePath}" alt="Source: ${test.name}" loading="lazy" />
            </div>
            <div class="image-container">
                <h3>🎯 Overlay Image (Analysis Output)</h3>
                <img src="${test.overlayPath}" alt="Overlay: ${test.name}" loading="lazy" />
            </div>
        </div>

        <div class="assessment-checklist">
            <h4>Assessment Checklist</h4>
            <div class="checklist-item">
                <input type="checkbox" id="valid-${index}" class="assessment-checkbox" data-test="${index}" data-type="valid">
                <label for="valid-${index}">
                    ✅ <strong>Output is valid:</strong> Overlay image exists, is properly formatted, and contains bounding boxes
                </label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="representative-${index}" class="assessment-checkbox" data-test="${index}" data-type="representative">
                <label for="representative-${index}">
                    🎯 <strong>Output is representative:</strong> Bounding boxes accurately align with actual UI elements in source image
                </label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="complete-${index}" class="assessment-checkbox" data-test="${index}" data-type="complete">
                <label for="complete-${index}">
                    📋 <strong>Analysis is complete:</strong> All major UI elements are detected and properly categorized
                </label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="accurate-${index}" class="assessment-checkbox" data-test="${index}" data-type="accurate">
                <label for="accurate-${index}">
                    ✨ <strong>Classification is accurate:</strong> Categories and severities match the visual issues in the source
                </label>
            </div>
        </div>

        <div class="reports-links">
            ${test.reportPath ? `<a href="${test.reportPath}" class="report-link" target="_blank">📄 View Report</a>` : ''}
            ${test.qualityPath ? `<a href="${test.qualityPath}" class="report-link" target="_blank">📊 Quality Analysis</a>` : ''}
            ${test.visualPath ? `<a href="${test.visualPath}" class="report-link" target="_blank">👁️ Visual Accuracy</a>` : ''}
        </div>

        <div style="margin-top: 15px;">
            <span class="status-badge status-pending" id="status-${index}">⏳ Pending Assessment</span>
        </div>
    </div>
    `,
      )
      .join('\n')}

    <script>
        // Load saved assessments from localStorage
        const savedAssessments = JSON.parse(localStorage.getItem('agentux-assessments') || '{}');
        
        // Update checkboxes from saved state
        document.querySelectorAll('.assessment-checkbox').forEach(checkbox => {
            const testIndex = checkbox.dataset.test;
            const type = checkbox.dataset.type;
            const key = \`test-\${testIndex}-\${type}\`;
            if (savedAssessments[key]) {
                checkbox.checked = true;
            }
            checkbox.addEventListener('change', updateAssessment);
        });

        function updateAssessment(event) {
            const checkbox = event.target;
            const testIndex = checkbox.dataset.test;
            const type = checkbox.dataset.type;
            const key = \`test-\${testIndex}-\${type}\`;
            
            // Save to localStorage
            if (!savedAssessments[key]) {
                savedAssessments[key] = {};
            }
            savedAssessments[key] = checkbox.checked;
            localStorage.setItem('agentux-assessments', JSON.stringify(savedAssessments));
            
            // Update test status
            updateTestStatus(parseInt(testIndex));
            updateSummary();
        }

        function updateTestStatus(testIndex) {
            const testSection = document.querySelector(\`[data-test-index="\${testIndex}"]\`);
            const statusBadge = document.getElementById(\`status-\${testIndex}\`);
            
            const checks = {
                valid: document.getElementById(\`valid-\${testIndex}\`).checked,
                representative: document.getElementById(\`representative-\${testIndex}\`).checked,
                complete: document.getElementById(\`complete-\${testIndex}\`).checked,
                accurate: document.getElementById(\`accurate-\${testIndex}\`).checked,
            };
            
            const allChecked = Object.values(checks).every(v => v);
            const anyChecked = Object.values(checks).some(v => v);
            
            if (allChecked) {
                statusBadge.textContent = '✅ Valid & Representative';
                statusBadge.className = 'status-badge status-valid';
            } else if (anyChecked) {
                statusBadge.textContent = '⚠️ Partial Assessment';
                statusBadge.className = 'status-badge status-pending';
            } else {
                statusBadge.textContent = '⏳ Pending Assessment';
                statusBadge.className = 'status-badge status-pending';
            }
        }

        function updateSummary() {
            const tests = document.querySelectorAll('.test-section');
            let validCount = 0;
            let invalidCount = 0;
            let pendingCount = 0;
            
            tests.forEach((test, index) => {
                const checks = {
                    valid: document.getElementById(\`valid-\${index}\`).checked,
                    representative: document.getElementById(\`representative-\${index}\`).checked,
                    complete: document.getElementById(\`complete-\${index}\`).checked,
                    accurate: document.getElementById(\`accurate-\${index}\`).checked,
                };
                
                const allChecked = Object.values(checks).every(v => v);
                if (allChecked) {
                    validCount++;
                } else if (Object.values(checks).some(v => v)) {
                    pendingCount++;
                } else {
                    pendingCount++;
                }
            });
            
            document.getElementById('pending-count').textContent = pendingCount;
            document.getElementById('valid-count').textContent = validCount;
            document.getElementById('invalid-count').textContent = invalidCount;
        }

        // Initialize status for all tests
        document.querySelectorAll('.test-section').forEach((test, index) => {
            updateTestStatus(index);
        });
        updateSummary();
    </script>
</body>
</html>
`;

  await fs.writeFile(outputPath, html);
  console.log(`✅ Assessment view generated: ${outputPath}`);
  console.log(`\n📊 Found ${tests.length} test(s) ready for assessment`);
  console.log(`\n💡 Open ${outputPath} in a browser to assess outputs`);
}

if (require.main === module) {
  generateAssessmentView().catch(console.error);
}

export { generateAssessmentView };

