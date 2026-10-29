require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const bcrypt = require("bcryptjs");
const { User, connectDatabase } = require("./database");

async function seed() {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("DEMO_PASSWORD must be set to at least 8 characters before seeding demo accounts");
  }

  await connectDatabase();
  const accounts = [
    { id: 1, name: "Mahnoor", email: "mahnoor@example.com" },
    { id: 2, name: "Alex", email: "alex@example.com" },
  ];

  for (const account of accounts) {
    await User.updateOne(
      { email: account.email },
      {
        $set: {
          id: account.id,
          name: account.name,
          password_hash: await bcrypt.hash(password, 12),
        },
        $setOnInsert: { email: account.email },
      },
      { upsert: true }
    );
  }

  console.log("Demo accounts are ready");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
