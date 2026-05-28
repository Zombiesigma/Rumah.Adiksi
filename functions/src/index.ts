
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// List of known social media crawler user agents
const BOT_AGENTS = [
  "facebookexternalhit",
  "Twitterbot",
  "linkedinbot",
  "pinterest",
  "WhatsApp",
  "TelegramBot",
];

// Default meta tags, in case something goes wrong
const DEFAULT_TITLE = "Rumah Adiksi Kreatif";
const DEFAULT_DESCRIPTION = "Inisiatif pemuda kreatif Pelabuhan Ratu untuk mereklamasi bakat, membentuk kecanduan positif melalui seni, budaya, dan komunitas.";
const DEFAULT_IMAGE = "https://rumahadiksi.web.id/logo.png"; // URL to your main logo

/**
 * Generates a basic HTML page with dynamic Open Graph (OG) meta tags.
 */
const generateHtml = (title: string, description: string, image: string, url: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <meta name="description" content="${description}">
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="${description}">
      <meta property="og:image" content="${image}">
      <meta property="og:url" content="${url}">
      <meta property="og:type" content="website">
      <meta name="twitter:card" content="summary_large_image">
    </head>
    <body>
      <!-- Redirect user to the actual content -->
       <script>
         window.location.href = "${url}";
       </script>
    </body>
    </html>
  `;
};

/**
 * The main Cloud Function to handle dynamic meta tags for social sharing.
 */
export const dynamicMetaTagServer = functions.https.onRequest(async (req, res) => {
  const userAgent = req.headers["user-agent"] || "";
  const isBot = BOT_AGENTS.some(agent => userAgent.toLowerCase().includes(agent.toLowerCase()));

  const requestPath = req.path.split("/"); // e.g., ["", "shop", "item-id"]
  const contentType = requestPath[1];
  const contentId = requestPath[2];

  // Construct the full URL for redirection
  const originalUrl = `https://rumahadiksi.web.id/${contentType}/${contentId}`;

  // If it's not a bot, just redirect to the main app to handle routing
  if (!isBot) {
    res.redirect(originalUrl);
    return;
  }

  // If it IS a bot, fetch data and serve meta tags
  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let image = DEFAULT_IMAGE;

  try {
    let collectionName = "";
    if (contentType === "shop") collectionName = "shopItems";
    else if (contentType === "gallery") collectionName = "artworks";
    else if (contentType === "events") collectionalectionName = "events";

    if (collectionName) {
      const doc = await db.collection(collectionName).doc(contentId).get();
      if (doc.exists) {
        const data = doc.data()!;
        title = data.name || data.title || DEFAULT_TITLE;
        description = data.description || DEFAULT_DESCRIPTION;
        image = data.imageUrl || DEFAULT_IMAGE;
      }
    }
  } catch (error) {
    console.error("Error fetching document:", error);
    // On error, we'll just serve default tags
  }

  // Generate and send the HTML response
  const html = generateHtml(title, description, image, originalUrl);
  res.status(200).send(html);
});
