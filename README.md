# Gemini Web Clone

A highly accurate, client-side clone of the Google Gemini web interface, built with React, Vite, and the official Google GenAI SDK (@google/genai).

## Features

*   **Authentic UI:** Dark mode, clean typography, and message layout mimicking the real Gemini app.
*   **Chat History:** Full chat history persistence using local storage with a collapsible sidebar.
*   **Multimodal Support:** Upload multiple images via button or paste (clipboard) and chat about them.
*   **Real-time Streaming:** See responses character-by-character as they are generated.
*   **Search Grounding:** Uses Google Search to provide up-to-date information with source citations.
*   **Client-Side Privacy:** Your API key and chat history are stored only in your browser's local storage.

## Updates

*   Updated to use `@google/genai` (v1.37.0+) SDK.
*   Fixed deployment issues related to SDK version resolution.

## Setup Instructions

1.  **Create a Repo:** Create a new repository on GitHub.
2.  **Add Files:** Add all the provided files to your repository in the structure shown.
3.  **Install Dependencies:**
    ```bash
    npm install
    ```
4.  **Run Locally:**
    ```bash
    npm run dev
    ```
5.  **Build for Production:**
    ```bash
    npm run build
    ```

## Deploy to Netlify

1.  Push your code to GitHub.
2.  Log in to Netlify and click "Add new site" > "Import from existing project".
3.  Select your GitHub repository.
4.  **Build Settings:**
    *   **Build Command:** `npm run build`
    *   **Publish Directory:** `dist`
5.  Click **Deploy**.

## Usage

1.  Open the deployed app.
2.  Enter your Gemini API Key (get one at [aistudio.google.com](https://aistudio.google.com/app/apikey)).
3.  Start chatting! 
4.  Use the sidebar to navigate previous conversations or start new ones.