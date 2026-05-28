<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7abfead7-cc82-4421-addf-5f7899af60a5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. This app uploads images to GitHub first and will fallback to ImageKit if GitHub is unavailable or unconfigured.
   - `IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id`
   - `IMAGEKIT_PRIVATE_KEY=private_xxx`
   - `IMAGEKIT_FOLDER=/optional/folder`
4. Run the app:
   `npm run dev`
