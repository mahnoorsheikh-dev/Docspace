const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  User,
  Document,
  DocumentShare,
  connectDatabase,
} = require("./database");
const { EMPTY_CONTENT, validContent, normalizeTitle } = require("./document-utils");
const { authenticate } = require("./middleware/authenticate");

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173").split(",").map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

function authCookieOptions() {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  };
}

function signUser(user) {
  return jwt.sign({ sub: String(user._id), userId: user.id }, process.env.JWT_SECRET, { expiresIn: "8h" });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function publicDocument(doc, extra = {}) {
  const item = doc.toObject ? doc.toObject() : doc;

  return {
    id: item._id.toString(),
    title: item.title,
    content: item.content,
    owner_id: item.owner_id,
    created_at: item.created_at,
    updated_at: item.updated_at,
    ...extra,
  };
}

async function getUser(req) {
  return req.user || null;
}

async function claimPendingShares(email, user) {
  if (!email || !user) return;
  await DocumentShare.updateMany(
    { invited_email: String(email).trim().toLowerCase() },
    { $set: { user_id: user.id }, $unset: { invited_email: "" } }
  );
}

async function getAccess(documentId, userId) {
  if (!/^[a-f\d]{24}$/i.test(String(documentId))) return null;

  const document = await Document.findById(documentId);
  if (!document) return null;

  if (document.owner_id === userId) {
    return { document, permission: "owner" };
  }

  const share = await DocumentShare.findOne({
    document_id: document._id,
    user_id: userId,
  }).lean();

  return share ? { document, permission: share.permission } : null;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "DocSpace API" });
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: "Authentication is not configured" });

    const name = typeof req.body.name === "string" ? req.body.name.trim().slice(0, 80) : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return res.status(400).json({ error: "Enter a name, valid email, and password of at least 8 characters" });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const highest = await User.findOne().sort({ id: -1 }).select("id").lean();
    const user = await User.create({
      id: (highest?.id || 0) + 1,
      name,
      email,
      password_hash: await bcrypt.hash(password, 12),
    });
    await claimPendingShares(email, user);
    const token = signUser(user);
    res.cookie("docspace_token", token, authCookieOptions());
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) return res.status(500).json({ error: "Authentication is not configured" });
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const user = await User.findOne({ email }).select("+password_hash");

    if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await claimPendingShares(email, user);
    const token = signUser(user);
    res.cookie("docspace_token", token, authCookieOptions());
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post("/api/auth/logout", authenticate, (req, res) => {
  res.clearCookie("docspace_token", { ...authCookieOptions(), maxAge: undefined });
  res.json({ message: "Logged out" });
});

app.use("/api/documents", authenticate);

app.get("/api/users", authenticate, async (req, res, next) => {
  try {
    const users = await User.find({}, { _id: 0, id: 1, name: 1, email: 1 })
      .sort({ id: 1 })
      .lean();

    res.json(users);
  } catch (error) {
    next(error);
  }
});

app.get("/api/documents", async (req, res, next) => {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unknown demo user" });
    }

    const owned = await Document.find({ owner_id: user.id }).lean();
    const shares = await DocumentShare.find({ user_id: user.id }).lean();
    const sharedIds = shares.map((share) => share.document_id);

    const sharedDocs = await Document.find({
      _id: { $in: sharedIds },
    }).lean();

    const shareByDocument = new Map(
      shares.map((share) => [share.document_id.toString(), share.permission])
    );

    const documents = [
      ...owned.map((doc) =>
        publicDocument(doc, { access_type: "owned", permission: "owner" })
      ),
      ...sharedDocs.map((doc) =>
        publicDocument(doc, {
          access_type: "shared",
          permission: shareByDocument.get(doc._id.toString()),
        })
      ),
    ].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    res.json(documents);
  } catch (error) {
    next(error);
  }
});

app.post("/api/documents", async (req, res, next) => {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unknown demo user" });
    }

    const title = normalizeTitle(req.body.title);

    const content = req.body.content ?? EMPTY_CONTENT;

    if (!validContent(content)) {
      return res.status(400).json({
        error: "Content must be a JSON object",
      });
    }

    const doc = await Document.create({
      title,
      content,
      owner_id: user.id,
    });

    res.status(201).json(publicDocument(doc));
  } catch (error) {
    next(error);
  }
});

app.get("/api/documents/:id", async (req, res, next) => {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unknown demo user" });
    }

    const access = await getAccess(req.params.id, user.id);
    if (!access) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(
      publicDocument(access.document, { permission: access.permission })
    );
  } catch (error) {
    next(error);
  }
});

app.put("/api/documents/:id", async (req, res, next) => {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unknown demo user" });
    }

    const access = await getAccess(req.params.id, user.id);
    if (!access) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (access.permission === "viewer") {
      return res.status(403).json({ error: "View-only access" });
    }

    const { title, content } = req.body;

    if (
      title !== undefined &&
      (typeof title !== "string" ||
        title.trim().length === 0 ||
        title.length > 200)
    ) {
      return res.status(400).json({
        error: "Title must be 1–200 characters",
      });
    }

    if (content !== undefined && !validContent(content)) {
      return res.status(400).json({
        error: "Content must be a JSON object",
      });
    }

    if (title !== undefined) access.document.title = title.trim();
    if (content !== undefined) access.document.content = content;

    access.document.updated_at = new Date();
    await access.document.save();

    res.json(publicDocument(access.document));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/documents/:id", async (req, res, next) => {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unknown demo user" });
    }

    const access = await getAccess(req.params.id, user.id);
    if (!access) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (access.permission !== "owner") {
      return res.status(403).json({
        error: "Only the owner can delete this document",
      });
    }

    await DocumentShare.deleteMany({ document_id: access.document._id });
    await access.document.deleteOne();

    res.json({ message: "Document deleted" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/documents/:id/shares", async (req, res, next) => {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unknown demo user" });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (document.owner_id !== user.id) {
      return res.status(403).json({
        error: "Only the owner can manage sharing",
      });
    }

    const shares = await DocumentShare.find({
      document_id: document._id,
    }).lean();

    const users = await User.find({
      id: { $in: shares.map((share) => share.user_id) },
    }).lean();

    res.json(
      shares.map((share) => {
        const recipient = share.user_id
          ? users.find((u) => u.id === share.user_id)
          : null;
        return {
          id: share.user_id || share._id.toString(),
          name: recipient?.name || share.invited_email || "Invited user",
          email: recipient?.email || share.invited_email,
          permission: share.permission,
          pending: !recipient && Boolean(share.invited_email),
          invite_url: `${process.env.APP_URL || "http://localhost:5173"}/`,
        };
      })
    );
  } catch (error) {
    next(error);
  }
});

app.post("/api/documents/:id/shares", async (req, res, next) => {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unknown demo user" });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (document.owner_id !== user.id) {
      return res.status(403).json({
        error: "Only the owner can share this document",
      });
    }

    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const permission = req.body.permission || "editor";

    if (!["viewer", "editor"].includes(permission)) {
      return res.status(400).json({
        error: "Permission must be viewer or editor",
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }

    const recipient = await User.findOne({ email });
    if (recipient?.id === user.id) {
      return res.status(400).json({ error: "You already own this document" });
    }

    if (recipient) {
      await DocumentShare.findOneAndUpdate(
        { document_id: document._id, user_id: recipient.id },
        { $set: { permission }, $unset: { invited_email: "" } },
        { upsert: true, new: true, runValidators: true }
      );
    } else {
      await DocumentShare.findOneAndUpdate(
        { document_id: document._id, invited_email: email },
        { $set: { permission }, $unset: { user_id: "" } },
        { upsert: true, new: true, runValidators: true }
      );
    }

    res.status(201).json({
      message: recipient ? "Document shared" : "Invitation saved for this email",
      email,
      permission,
      pending: !recipient,
      invite_url: `${process.env.APP_URL || "http://localhost:5173"}/`,
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/documents/:id/shares/:userId", async (req, res, next) => {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unknown demo user" });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (document.owner_id !== user.id) {
      return res.status(403).json({
        error: "Only the owner can remove sharing",
      });
    }

    const recipient = req.params.userId;
    if (/^[a-f\d]{24}$/i.test(recipient)) {
      await DocumentShare.deleteOne({
        document_id: document._id,
        _id: recipient,
      });
    } else {
      await DocumentShare.deleteOne({
        document_id: document._id,
        user_id: Number(recipient),
      });
    }

    res.json({ message: "Sharing access removed" });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`DocSpace API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Could not start DocSpace API:", error.message);
    process.exit(1);
  }
}

startServer();
