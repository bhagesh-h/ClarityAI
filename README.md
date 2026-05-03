<img src="./public/logo.svg" width="500">

# Clarity AI - Content Synthesis Extension

Clarity AI is a professional, high-performance browser extension designed to help you consume the web faster by synthesizing complex information. It provides instant summaries, deep explanations, and intelligent action items for any webpage, email, or video.

## Features

### Advanced AI Synthesis

Instantly transform long articles, complex documentation, or research papers into concise, actionable summaries.

- **Key Points & Claims**: Automatically identifies the most important arguments and factual claims.
- **Open Questions**: Highlights what the content *doesn't* answer or where it's ambiguous.
- **Action Items**: Extracts concrete next steps from emails or instruction manuals.

### Multi-Provider Ecosystem (The Vault)

Configure and switch between multiple state-of-the-art AI providers. Your credentials for each provider are stored securely in your local "Vault."

- **Google Gemini**: Native support for Gemini 1.5 Pro and Flash.
- **OpenRouter**: Access any open-source or proprietary model (Llama 3, Mistral, GPT-4, etc.) via a single API.
- **Anthropic & OpenAI**: Full compatibility with Claude 3.5 and GPT-4o.
- **Local AI (Ollama)**: Connect to your local Ollama instance (e.g., `llama3`, `mistral`).
  - *Requirement*: You must set the environment variable `OLLAMA_ORIGINS=*` on your machine to allow the extension to communicate with the local server.

### Token Optimization Engine

Optimized for speed and cost-efficiency.

- **Smart Truncation**: Automatically manages content length to prevent "token blowouts."
- **Noise Filter**: Strips navigation, footers, ads, and scripts before analysis.
- **Cleaner Extraction**: Normalizes text and reduces character count without losing context.

### Platform-Specific Intelligence

Tailored extraction logic for specialized content:

- **YouTube**: Direct transcript extraction and video metadata analysis.
- **Gmail**: Optimized for mail threads, stripping signature blocks and conversation noise.
- **Social Media**: Focused extraction for LinkedIn, Reddit, and GitHub.

## Setup and Installation

### 1. Build the Extension

Since this is a modern React/Vite application, you must compile it before it can be loaded into Chrome:

```bash
# Install dependencies
npm install

# Build the production bundle
npm run build
```

This will create a `dist` folder in your root directory.

### 2. Load into Your Browser

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked**.
4. Select the `dist` folder created in step 1.
5. Pin **Clarity AI** from your extension menu.

## Configuration

1. Click the **Clarity AI** icon in your toolbar.
2. Select your preferred **AI Network** (e.g., Google Gemini, OpenRouter, Ollama).
3. Enter your **API Key** (stored locally only).
4. Click **Validate & Save**.
   - *Note: Your settings for each provider are saved separately in your local vault.*

## Technical Architecture

- **Framework**: React 18 with Vite.
- **State Management**: Zustand with persistent storage orchestration (supporting both `chrome.storage` and `localStorage`).
- **Styling**: Tailwind CSS + Lucide Icons.
- **Communication**: Service Worker Architecture. All AI requests are proxied through a background service worker (`background.ts`) to bypass Content Security Policy (CSP) and Mixed Content restrictions on certain websites.
- **Animations**: Framer Motion for high-fidelity UI transitions.

## Security & Privacy

- **Local Storage**: All API keys and configurations are stored in your browser's local storage or extension storage. They are never sent to a central Clarity AI server.
- **Direct Connect**: The extension communicates directly with your chosen AI provider's API endpoint.
- **Data Exposure**: Only the text content of the *currently active tab* is sent to the AI provider for analysis when you trigger the extension.

© 2026 Clarity AI Extension. Created by BHAGESH.
