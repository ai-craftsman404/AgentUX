import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import OpenAI from 'openai';
import { safeParseVisionPayload } from '../src/utils/jsonValidation';
import { buildVisionPrompt, SYSTEM_PROMPT } from '../src/utils/prompt';
import { AnalysisMetadata } from '../src/types';
import { validateImage } from '../src/utils/imageValidation';
import { postProcessRegions } from '../src/utils/regionPostProcessing';
import { getImageDimensions } from '../src/utils/imageValidation';

config();
config({ path: path.resolve(process.cwd(), '.env.test'), override: false });

const apiKey = process.env.OPENAI_API_KEY;
const imagesDir = path.resolve(process.cwd(), 'fixtures/images/real');

const metadataVariants: AnalysisMetadata[] = [
  { platform: 'Desktop Web', uiType: 'Dashboard', audience: 'Enterprise Users' },
  { platform: 'Mobile Web', uiType: 'Landing Page', audience: 'General Public' },
  { platform: 'Tablet', uiType: 'E-commerce Product / Checkout', audience: 'General Public' },
  { platform: 'Native iOS', uiType: 'Form / Input Flow', audience: 'Accessibility-Focused' },
  { platform: 'Desktop App', uiType: 'Settings Panel', audience: 'Developer / Technical Users' },
];

async function analyseImage(
  client: OpenAI,
  imagePath: string,
  metadata: AnalysisMetadata,
): Promise<ReturnType<typeof safeParseVisionPayload>> {
  // Pre-validate image
  const validation = await validateImage(imagePath);
  if (!validation.valid) {
    const issues = validation.issues.join('; ');
    console.error(`❌ Image validation failed for ${path.basename(imagePath)}: ${issues}`);
    throw new Error(`Image validation failed: ${issues}`);
  }

  // Log warnings if any
  if (validation.warnings.length > 0) {
    validation.warnings.forEach((warning) => {
      console.warn(`⚠️  ${path.basename(imagePath)}: ${warning}`);
    });
  }

  const prompt = buildVisionPrompt(metadata);
  const imageBase64 = await fs.promises.readFile(imagePath, 'base64');
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
    throw new Error('Unexpected response format.');
  }
  const payload = safeParseVisionPayload(raw, imagePath);

  // Post-process regions
  const imageDims = await getImageDimensions(imagePath);
  const processingResult = postProcessRegions(
    payload.regions,
    imageDims.width,
    imageDims.height,
  );

  if (processingResult.removedCount > 0) {
    console.warn(
      `⚠️  Removed ${processingResult.removedCount} invalid/suspicious regions from ${path.basename(imagePath)}`,
    );
  }

  // Update payload with filtered regions
  payload.regions = processingResult.filteredRegions;

  console.log(
    `${path.basename(imagePath)} | regions=${payload.regions.length} (${processingResult.removedCount} filtered) strengths=${
      payload.summary?.strengths.length ?? 0
    } weaknesses=${payload.summary?.weaknesses.length ?? 0}`,
  );
  return payload;
}

async function main(): Promise<void> {
  if (!apiKey) {
    console.error('OPENAI_API_KEY missing. Set it via VS Code command or .env.test');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });
  const imageFiles = fs
    .readdirSync(imagesDir)
    .filter((file) => file.toLowerCase().endsWith('.png'))
    .slice(0, 5);

  if (imageFiles.length < 5) {
    console.warn('Less than 5 images found; proceeding with available files.');
  }

  for (let i = 0; i < imageFiles.length; i += 1) {
    const file = imageFiles[i];
    const meta = metadataVariants[i % metadataVariants.length];
    const imagePath = path.join(imagesDir, file);
    console.log(`\n📸 Running Vision analysis on ${file} with metadata`, meta);
    try {
      const payload = await analyseImage(client, imagePath, meta);
      const stateDir = path.resolve(process.cwd(), 'artifacts/state');
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(stateDir, `${path.parse(file).name}.json`),
        JSON.stringify(
          {
            metadata: meta,
            regions: payload.regions,
            attentionGrid: payload.attentionGrid,
            summary: payload.summary,
          },
          null,
          2,
        ),
      );
      console.log(`✅ Analysis saved for ${file}`);
    } catch (error) {
      console.error(`❌ Failed to analyze ${file}:`, error instanceof Error ? error.message : String(error));
      // Continue with next image
    }
  }
}

main().catch((error) => {
  console.error('Batch Vision run failed:', error);
  process.exit(1);
});

