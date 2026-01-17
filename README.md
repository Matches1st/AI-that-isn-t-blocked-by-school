# Gemini Web Clone

A highly accurate, client-side clone of the Google Gemini web interface, built with React, Vite, and the official Google GenAI SDK (@google/genai).

## Features

*   **Authentic UI:** Dark mode, clean typography, and message layout mimicking the real Gemini app.
*   **Chat History:** Full chat history persistence using local storage with a collapsible sidebar.
*   **Multimodal Support:** Upload multiple images via button or paste (clipboard) and chat about them.
*   **Real-time Streaming:** See responses character-by-character as they are generated.
*   **Search Grounding:** Uses Google Search to provide up-to-date information with source citations.
*   **Client-Side Privacy:** Your API key and chat history are stored only in your browser's local storage.

## Setup Instructions

1.  **Clone/Create Repo:** Create a new repository and add these files.
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Run Locally:**
    ```bash
    npm run dev
    ```
4.  **Build for Production:**
    ```bash
    npm run build
    ```

## Deployment & API Keys

### Important: API Key Restrictions
When deploying to services like **Netlify** or **Vercel**, your API calls will fail if your API key has HTTP Referrer restrictions that do not match your deployed domain.

**To fix "Access Denied" or "403" errors:**
1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Click on your API key to edit it.
3.  **Option A (Easiest):** Set "Client restriction" to **None**. This allows the key to work on localhost and any deployed URL.
4.  **Option B (Secure):** Set "Client restriction" to **Websites** and add your specific Netlify domain (e.g., `https://your-app.netlify.app/*`) AND `http://localhost:*` (for development).

### Troubleshooting
*   **"I'm sorry, something went wrong":** This usually means your API Key is restricted. Use the "Test Key" button on the login screen to verify. Check the browser console (F12) for the exact error message (e.g., 403 Forbidden).
*   **429 Error:** You have exceeded the free tier rate limits (RPM/TPM). Wait a minute and try again.
*   **Model not found:** The app defaults to `gemini-1.5-flash` which is widely available. If you changed the code to use a restricted model, revert it.

## Deploy to Netlify

1.  Push your code to GitHub.
2.  Log in to Netlify and click "Add new site" > "Import from existing project".
3.  Select your GitHub repository.
4.  **Build Settings:**
    *   **Build Command:** `npm run build`
    *   **Publish Directory:** `dist`
5.  Click **Deploy**.