import path from 'path';
import { config } from 'dotenv';
import OpenAI from 'openai';

config();
config({ path: path.resolve(process.cwd(), '.env.test'), override: false });

const apiKey = process.env.OPENAI_API_KEY;

async function main(): Promise<void> {
  if (!apiKey) {
    console.error(
      'OPENAI_API_KEY is not set. Add it to VS Code SecretStorage or .env.test.',
    );
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  try {
    const models = await client.models.list();
    const preferredModel = models.data.find((model) =>
      model.id.includes('gpt-4o'),
    );

    console.log('✅ OpenAI API key verified.');
    if (preferredModel) {
      console.log(`Preferred model available: ${preferredModel.id}`);
    } else {
      console.log(
        'No gpt-4o* models visible. Ensure your account has Vision access.',
      );
    }
  } catch (error) {
    console.error('OpenAI API check failed:', error);
    process.exit(1);
  }
}

main();

