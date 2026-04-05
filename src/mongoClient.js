const { MongoClient } = require("mongodb");
const { mongoUri, mongoDbName } = require("./config");

let clientPromise = null;
let warned = false;

function isMongoConfigured() {
  return Boolean(mongoUri);
}

async function getMongoDb() {
  if (!isMongoConfigured()) return null;

  if (!clientPromise) {
    const client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    clientPromise = client.connect();
  }

  try {
    const client = await clientPromise;
    return client.db(mongoDbName || "allinonw");
  } catch (error) {
    if (!warned) {
      warned = true;
      console.warn("[mongo] connection failed, using JSON fallback:", error.message || error);
    }
    clientPromise = null;
    return null;
  }
}

module.exports = {
  isMongoConfigured,
  getMongoDb
};
