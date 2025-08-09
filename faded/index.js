/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const express = require("express");
const path = require("path");
const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");

// Set global options for cost control
setGlobalOptions({maxInstances: 10});

// Create Express app
const app = express();

// Serve static files from the parent directory (where HTML files are located)
app.use(express.static(path.join(__dirname, "..")));

// Serve the main portal page as the default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "faded_skies_portal-5.html"));
});

// Serve the admin portal
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..",
      "fadedskies admin almost complete .html"));
});

// Handle all other routes by serving the main portal
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "faded_skies_portal-5.html"));
});

// Export the Express app as a Firebase function
exports.fadedwholsale = onRequest(app);
