# Privacy Policy

## Data Collection and Storage

AgentUX is designed with privacy in mind. This extension:

- **Does NOT collect or transmit any personal data** to external servers (except OpenAI API calls as described below)
- **Stores all data locally** on your machine
- **Does NOT track usage** or send telemetry

## OpenAI API Usage

When you use AgentUX to analyze screenshots:

1. **Screenshots are sent to OpenAI's Vision API** for analysis. This is necessary for the extension's core functionality.
2. **Screenshots are NOT stored by OpenAI** beyond the immediate API request (as per OpenAI's data usage policies).
3. **API keys are stored securely** using VS Code's SecretStorage API, encrypted and stored locally on your machine.
4. **No screenshots are cached** or stored permanently by the extension beyond temporary analysis state.

## Local Storage

The extension stores the following data locally on your machine:

- **API Keys**: Stored securely in VS Code's SecretStorage (encrypted, local only)
- **Analysis State**: Temporary state during active analysis sessions (cleared when VS Code closes)
- **Cached Screenshots**: Screenshots are copied to `globalStorageUri/screenshots/` for webview display purposes only

## Data Retention

- **Analysis results**: Stored only in VS Code's extension state, cleared when VS Code closes
- **Cached screenshots**: Stored in extension's global storage folder, can be manually deleted
- **API Keys**: Persisted until you explicitly remove them via the "Set OpenAI API Key" command

## Third-Party Services

AgentUX uses:
- **OpenAI API**: Screenshots are sent to OpenAI for Vision analysis. Review OpenAI's privacy policy: https://openai.com/policies/privacy-policy

## Your Rights

You have full control over:
- When screenshots are analyzed (you explicitly trigger analysis)
- API key storage (you can remove keys at any time)
- Cached data (you can delete the extension's storage folder)

## Contact

For privacy concerns or questions, please refer to the extension's repository or contact the publisher.

