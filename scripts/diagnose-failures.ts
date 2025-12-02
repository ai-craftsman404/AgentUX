import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import OpenAI from 'openai';
import { safeParseVisionPayload, jsonValidator } from '../src/utils/jsonValidation';
import { buildVisionPrompt, SYSTEM_PROMPT } from '../src/utils/prompt';
import { AnalysisMetadata } from '../src/types';

config();
config({ path: path.resolve(process.cwd(), '.env.test'), override: false });

const apiKey = process.env.OPENAI_API_KEY;
const imagesDir = path.resolve(process.cwd(), 'fixtures/images/real');
const debugDir = path.resolve(process.cwd(), 'artifacts/debug');

interface DiagnosticResult {
  filename: string;
  imageSize: { width: number; height: number };
  metadata: AnalysisMetadata;
  rawResponse: string | null;
  rawResponseLength: number;
  hasEllipses: boolean;
  validationError: string | null;
  validationErrorType: string | null;
  parsedRegions: number;
  parsedAttentionGrid: boolean;
  parsedSummary: boolean;
  fallbackUsed: boolean;
}

const getImageDimensions = async (imagePath: string): Promise<{ width: number; height: number }> => {
  try {
    const { PNG } = await import('pngjs');
    const image = PNG.sync.read(fs.readFileSync(imagePath));
    return { width: image.width, height: image.height };
  } catch {
    return { width: 0, height: 0 };
  }
};

const diagnoseImage = async (
  client: OpenAI,
  imagePath: string,
  metadata: AnalysisMetadata,
): Promise<DiagnosticResult> => {
  const filename = path.basename(imagePath);
  const result: DiagnosticResult = {
    filename,
    imageSize: await getImageDimensions(imagePath),
    metadata,
    rawResponse: null,
    rawResponseLength: 0,
    hasEllipses: false,
    validationError: null,
    validationErrorType: null,
    parsedRegions: 0,
    parsedAttentionGrid: false,
    parsedSummary: false,
    fallbackUsed: false,
  };

  try {
    const prompt = buildVisionPrompt(metadata);
    const imageBase64 = await fs.promises.readFile(imagePath, 'base64');
    
    console.log(`\n📸 Analyzing: ${filename}`);
    console.log(`   Image size: ${result.imageSize.width}x${result.imageSize.height}px`);
    console.log(`   Metadata: ${metadata.platform} / ${metadata.uiType} / ${metadata.audience}`);
    console.log(`   Image base64 size: ${(imageBase64.length / 1024).toFixed(1)}KB`);

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt } as any,
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            } as any,
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (typeof raw !== 'string') {
      result.validationError = 'Unexpected response format: content is not a string';
      result.validationErrorType = 'FORMAT_ERROR';
      return result;
    }

    result.rawResponse = raw;
    result.rawResponseLength = raw.length;
    result.hasEllipses = raw.includes('...');

    // Save raw response for inspection
    const rawResponsePath = path.join(debugDir, `${path.parse(filename).name}-raw-response.txt`);
    fs.writeFileSync(rawResponsePath, raw);
    console.log(`   Raw response saved: ${rawResponsePath}`);
    console.log(`   Response length: ${raw.length} characters`);

    // Check for ellipses
    if (result.hasEllipses) {
      const ellipsesMatches = raw.match(/\.\.\./g);
      console.log(`   ⚠️  Contains ${ellipsesMatches?.length ?? 0} ellipses (invalid)`);
    }

    // Try to parse and validate
    try {
      const payload = jsonValidator.parseVisionPayload(raw);
      result.parsedRegions = payload.regions.length;
      result.parsedAttentionGrid = payload.attentionGrid !== null;
      result.parsedSummary = payload.summary !== null;
      console.log(`   ✅ Validation successful`);
      console.log(`      Regions: ${result.parsedRegions}`);
      console.log(`      Attention grid: ${result.parsedAttentionGrid ? 'present' : 'missing'}`);
      console.log(`      Summary: ${result.parsedSummary ? 'present' : 'missing'}`);
    } catch (error) {
      result.validationError = error instanceof Error ? error.message : String(error);
      result.validationErrorType = error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR';
      result.fallbackUsed = true;
      
      console.log(`   ❌ Validation failed: ${result.validationErrorType}`);
      console.log(`      Error: ${result.validationError}`);
      
      // Try safe parse to see what fallback returns
      const fallbackPayload = safeParseVisionPayload(raw);
      result.parsedRegions = fallbackPayload.regions.length;
      result.parsedAttentionGrid = fallbackPayload.attentionGrid !== null;
      result.parsedSummary = fallbackPayload.summary !== null;
      console.log(`   🔄 Fallback payload: ${result.parsedRegions} regions`);
    }

    // Try JSON repair separately to see if that's the issue
    try {
      const repaired = jsonValidator.repair(raw);
      const repairedPath = path.join(debugDir, `${path.parse(filename).name}-repaired.json`);
      fs.writeFileSync(repairedPath, repaired);
      console.log(`   Repaired JSON saved: ${repairedPath}`);
    } catch (repairError) {
      console.log(`   ⚠️  JSON repair also failed: ${repairError instanceof Error ? repairError.message : String(repairError)}`);
    }

  } catch (error) {
    result.validationError = error instanceof Error ? error.message : String(error);
    result.validationErrorType = error instanceof Error ? error.constructor.name : 'API_ERROR';
    console.log(`   ❌ API call failed: ${result.validationError}`);
  }

  return result;
};

async function main(): Promise<void> {
  if (!apiKey) {
    console.error('OPENAI_API_KEY missing. Set it via VS Code command or .env.test');
    process.exit(1);
  }

  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  const client = new OpenAI({ apiKey });
  const imageFiles = fs
    .readdirSync(imagesDir)
    .filter((file) => file.toLowerCase().endsWith('.png'))
    .slice(0, 5);

  const metadataVariants: AnalysisMetadata[] = [
    { platform: 'Desktop Web', uiType: 'Dashboard', audience: 'Enterprise Users' },
    { platform: 'Mobile Web', uiType: 'Landing Page', audience: 'General Public' },
    { platform: 'Tablet', uiType: 'E-commerce Product / Checkout', audience: 'General Public' },
    { platform: 'Native iOS', uiType: 'Form / Input Flow', audience: 'Accessibility-Focused' },
    { platform: 'Desktop App', uiType: 'Settings Panel', audience: 'Developer / Technical Users' },
  ];

  console.log('='.repeat(80));
  console.log('DIAGNOSTIC ANALYSIS: Vision API Failures');
  console.log('='.repeat(80));

  const results: DiagnosticResult[] = [];

  for (let i = 0; i < imageFiles.length; i += 1) {
    const file = imageFiles[i];
    const meta = metadataVariants[i % metadataVariants.length];
    const imagePath = path.join(imagesDir, file);
    
    const result = await diagnoseImage(client, imagePath, meta);
    results.push(result);
  }

  // Summary report
  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSTIC SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter((r) => !r.validationError && r.parsedRegions > 0).length;
  const failed = results.filter((r) => r.validationError !== null).length;
  const fallbackUsed = results.filter((r) => r.fallbackUsed).length;
  const hasEllipses = results.filter((r) => r.hasEllipses).length;

  console.log(`Total images analyzed: ${results.length}`);
  console.log(`Successful validations: ${successful}`);
  console.log(`Failed validations: ${failed}`);
  console.log(`Fallback payloads used: ${fallbackUsed}`);
  console.log(`Responses with ellipses: ${hasEllipses}`);

  console.log('\nFailure breakdown by type:');
  const errorTypes = new Map<string, number>();
  results.forEach((r) => {
    if (r.validationErrorType) {
      errorTypes.set(r.validationErrorType, (errorTypes.get(r.validationErrorType) ?? 0) + 1);
    }
  });
  errorTypes.forEach((count, type) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log('\nImage size analysis:');
  results.forEach((r) => {
    const area = r.imageSize.width * r.imageSize.height;
    const status = r.validationError ? '❌ FAILED' : '✅ OK';
    console.log(`  ${r.filename}: ${r.imageSize.width}x${r.imageSize.height}px (${(area / 1000).toFixed(0)}K px²) ${status}`);
  });

  // Save detailed diagnostic report
  const reportPath = path.join(debugDir, 'diagnostic-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed diagnostic report saved: ${reportPath}`);
  console.log(`📁 Raw responses saved in: ${debugDir}`);
}

main().catch((error) => {
  console.error('Diagnostic analysis failed:', error);
  process.exit(1);
});

