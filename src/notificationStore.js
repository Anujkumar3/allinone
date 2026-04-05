/**
 * In-app notification store.
 * Data: { notifications: [{ id, userEmail, type, title, message, createdAt, readAt }] }
 */
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { getMongoDb } = require("./mongoClient");

async function readNotifications(filePath) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.notifications) ? data.notifications : [];
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

async function writeNotifications(filePath, notifications) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Keep latest 500
  const trimmed = notifications.slice(-500);
  await fsp.writeFile(filePath, JSON.stringify({ notifications: trimmed }, null, 2), "utf8");
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function getCollection() {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection("notifications");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function createNotification(filePath, { userEmail, type, title, message }) {
  const notification = {
    id: generateId(),
    userEmail: normalizeEmail(userEmail),
    type: type || "info",
    title: String(title || ""),
    message: String(message || ""),
    createdAt: new Date().toISOString(),
    readAt: null
  };

  const collection = await getCollection();
  if (collection) {
    await collection.insertOne(notification);
    return notification;
  }

  const notifications = await readNotifications(filePath);
  notifications.push(notification);
  await writeNotifications(filePath, notifications);
  return notification;
}

async function createBulkNotifications(filePath, items) {
  const now = new Date().toISOString();
  const created = items.map((item) => ({
    id: generateId(),
    userEmail: normalizeEmail(item.userEmail),
    type: item.type || "info",
    title: String(item.title || ""),
    message: String(item.message || ""),
    createdAt: now,
    readAt: null
  }));

  const collection = await getCollection();
  if (collection) {
    if (created.length > 0) {
      await collection.insertMany(created, { ordered: false });
    }
    return created;
  }

  const notifications = await readNotifications(filePath);
  notifications.push(...created);
  await writeNotifications(filePath, notifications);
  return created;
}

async function getForUser(filePath, userEmail, { unreadOnly = false } = {}) {
  const email = normalizeEmail(userEmail);
  const collection = await getCollection();
  if (collection) {
    const query = { userEmail: email };
    if (unreadOnly) query.readAt = null;
    const rows = await collection.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return rows.map(({ _id, ...rest }) => rest);
  }

  const all = (await readNotifications(filePath))
    .filter((n) => normalizeEmail(n.userEmail) === email);
  const filtered = unreadOnly ? all.filter((n) => !n.readAt) : all;
  // Return newest first, max 50
  return filtered.slice(-50).reverse();
}

async function getUnreadCount(filePath, userEmail) {
  const email = normalizeEmail(userEmail);
  const collection = await getCollection();
  if (collection) {
    return collection.countDocuments({ userEmail: email, readAt: null });
  }
  return (await readNotifications(filePath)).filter(
    (n) => normalizeEmail(n.userEmail) === email && !n.readAt
  ).length;
}

async function markAllReadForUser(filePath, userEmail) {
  const email = normalizeEmail(userEmail);
  const readAt = new Date().toISOString();

  const collection = await getCollection();
  if (collection) {
    await collection.updateMany(
      { userEmail: email, readAt: null },
      { $set: { readAt } }
    );
    return;
  }

  const notifications = await readNotifications(filePath);
  notifications.forEach((n) => {
    if (normalizeEmail(n.userEmail) === email && !n.readAt) {
      n.readAt = readAt;
    }
  });
  await writeNotifications(filePath, notifications);
}

async function markReadById(filePath, userEmail, ids) {
  const email = normalizeEmail(userEmail);
  const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
  const readAt = new Date().toISOString();

  const collection = await getCollection();
  if (collection) {
    await collection.updateMany(
      { userEmail: email, readAt: null, id: { $in: Array.from(idSet) } },
      { $set: { readAt } }
    );
    return;
  }

  const notifications = await readNotifications(filePath);
  notifications.forEach((n) => {
    if (normalizeEmail(n.userEmail) === email && !n.readAt && idSet.has(n.id)) {
      n.readAt = readAt;
    }
  });
  await writeNotifications(filePath, notifications);
}

module.exports = {
  createNotification,
  createBulkNotifications,
  getForUser,
  getUnreadCount,
  markAllReadForUser,
  markReadById
};
