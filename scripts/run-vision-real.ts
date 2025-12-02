import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import OpenAI from 'openai';
import { safeParseVisionPayload } from '../src/utils/jsonValidation';
import { buildVisionPrompt, SYSTEM_PROMPT } from '../src/utils/prompt';
import { AnalysisMetadata } from '../src/types';

config();
config({ path: path.resolve(process.cwd(), '.env.test'), override: false });

const apiKey = process.env.OPENAI_API_KEY;
const imagesDir = path.resolve(process.cwd(), 'fixtures/images/real');
const stateDir = path.resolve(process.cwd(), 'artifacts/state');

const metadataVariants: AnalysisMetadata[] = [
  { platform: 'Desktop Web', uiType: 'Dashboard', audience: 'Enterprise Users' },
  { platform: 'Mobile Web', uiType: 'Landing Page', audience: 'General Public' },
  { platform: 'Tablet', uiType: 'E-commerce Product / Checkout', audience: 'General Public' },
  { platform: 'Native iOS', uiType: 'Form / Input Flow', audience: 'Accessibility-Focused' },
  { platform: 'Desktop Web', uiType: 'Marketing Page', audience: 'General Public' },
];

async function run(): Promise<void> {
  if (!apiKey) {
    console.error('OPENAI_API_KEY missing. Configure it via VS Code command or .env.test.');
    process.exit(1);
  }

  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const client = new OpenAI({ apiKey });
  const files = fs
    .readdirSync(imagesDir)
    .filter((file) => file.toLowerCase().endsWith('.png'))
    .slice(0, 5);

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const meta = metadataVariants[i % metadataVariants.length];
    const imagePath = path.join(imagesDir, file);
    const prompt = buildVisionPrompt(meta);
    const base64 = await fs.promises.readFile(imagePath, 'base64');

    console.log(`Analysis ${i + 1}/5 → ${file}`, meta);

    const completion = await client.chat.completions.create({
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
              image_url: { url: `data:image/png;base64,${base64}` },
            } as any,
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (typeof raw !== 'string') {
      console.error('Unexpected response format. Skipping file.');
      continue;
    }
    const payload = safeParseVisionPayload(raw);
    console.log(
      `→ regions=${payload.regions.length}, strengths=${payload.summary?.strengths.length ?? 0}, weaknesses=${payload.summary?.weaknesses.length ?? 0}`,
    );

    fs.writeFileSync(
      path.join(stateDir, `${path.parse(file).name}.json`),
      JSON.stringify({ metadata: meta, ...payload }, null, 2),
    );
  }
}

run().catch((error) => {
  console.error('Real Vision batch failed:', error);
  process.exit(1);
});

