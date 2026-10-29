
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password_hash: { type: String, select: false },
}, { timestamps: true });

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: "Untitled document",
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: { type: "doc", content: [{ type: "paragraph" }] },
  },
  owner_id: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const shareSchema = new mongoose.Schema(
  {
    document_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Document",
    },
    user_id: { type: Number, required: false, default: null },
    invited_email: {
      type: String,
      lowercase: true,
      trim: true,
      required: false,
      default: null,
    },
    permission: {
      type: String,
      enum: ["viewer", "editor"],
      default: "editor",
    },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

shareSchema.index(
  { document_id: 1, user_id: 1 },
  { unique: true, sparse: true }
);
shareSchema.index(
  { document_id: 1, invited_email: 1 },
  { unique: true, sparse: true }
);

const User = mongoose.model("User", userSchema);
const Document = mongoose.model("Document", documentSchema);
const DocumentShare = mongoose.model("DocumentShare", shareSchema);

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from the .env file");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas");

  // Create the two demo users if they don't exist.
  await User.updateOne(
    { id: 1 },
    { $setOnInsert: { id: 1, name: "Mahnoor", email: "mahnoor@example.com" } },
    { upsert: true }
  );

  await User.updateOne(
    { id: 2 },
    { $setOnInsert: { id: 2, name: "Alex", email: "alex@example.com" } },
    { upsert: true }
  );

  console.log("Demo users are ready");
}

module.exports = {
  mongoose,
  User,
  Document,
  DocumentShare,
  connectDatabase,
};
