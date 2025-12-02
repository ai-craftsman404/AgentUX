import path from 'path';
import { promises as fs } from 'fs';
import { config } from 'dotenv';
import OpenAI from 'openai';
import { jsonValidator } from '../src/utils/jsonValidation';
import { buildVisionPrompt, SYSTEM_PROMPT } from '../src/utils/prompt';
import { AnalysisMetadata } from '../src/types';
import { validateImage } from '../src/utils/imageValidation';
import { postProcessRegions } from '../src/utils/regionPostProcessing';
import { getImageDimensions } from '../src/utils/imageValidation';

config();
config({ path: path.resolve(process.cwd(), '.env.test'), override: false });

const apiKey = process.env.OPENAI_API_KEY;
const SAMPLE_IMAGE_PATH = path.resolve(
  process.cwd(),
  'fixtures/images/sample-dashboard.png',
);

async function main(): Promise<void> {
  if (!apiKey) {
    console.error(
      'OPENAI_API_KEY is not set. Add it to VS Code SecretStorage or .env.test.',
    );
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });
  const metadata: AnalysisMetadata = {
    platform: 'Desktop Web',
    uiType: 'Dashboard',
    audience: 'Enterprise Users',
  };
  const prompt = buildVisionPrompt(metadata);

  try {
    // Pre-validate image
    const validation = await validateImage(SAMPLE_IMAGE_PATH);
    if (!validation.valid) {
      const issues = validation.issues.join('; ');
      console.error(`❌ Image validation failed: ${issues}`);
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach((warning) => {
        console.warn(`⚠️  ${warning}`);
      });
    }

    const imageBase64 = await fs.readFile(SAMPLE_IMAGE_PATH, 'base64');
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
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            } as any,
          ],
        },
      ],
    });

    const message = response.choices[0]?.message;
    let raw: string | undefined;
    if (typeof message?.content === 'string') {
      raw = message.content;
    } else if (Array.isArray(message?.content)) {
      const parts = message.content as Array<{ type?: string; text?: string }>;
      raw = parts
        .map((part) => (part.type === 'text' ? part.text ?? '' : ''))
        .join('\n');
    }

    if (!raw) {
      throw new Error('Unexpected response content.');
    }

    let payload;
    try {
      payload = jsonValidator.parseVisionPayload(raw);
    } catch (error) {
      console.error('Raw model response (truncated):', raw.slice(0, 400));
      throw error;
    }

    // Post-process regions
    const imageDims = await getImageDimensions(SAMPLE_IMAGE_PATH);
    const processingResult = postProcessRegions(
      payload.regions,
      imageDims.width,
      imageDims.height,
    );

    if (processingResult.removedCount > 0) {
      console.warn(`⚠️  Removed ${processingResult.removedCount} invalid/suspicious regions`);
      processingResult.reasons.forEach((reason) => {
        console.warn(`  - ${reason}`);
      });
    }

    // Update payload with filtered regions
    payload.regions = processingResult.filteredRegions;

    console.log('✅ Sample Vision analysis succeeded.');
    const strengths = payload.summary?.strengths.length ?? 0;
    const weaknesses = payload.summary?.weaknesses.length ?? 0;
    console.log(
      `Regions detected: ${payload.regions.length} (${processingResult.removedCount} filtered), strengths: ${strengths}, weaknesses: ${weaknesses}`,
    );
  } catch (error) {
    console.error('Vision sample run failed:', error);
    process.exit(1);
  }
}

main();

