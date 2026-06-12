// Run: node scripts/migrate-ai-chat.js
// Creates ai_chats and ai_chat_messages tables. Safe to re-run (IF NOT EXISTS).

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function getDbUrl() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const m = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (m && m[1]) return m[1];
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error("DATABASE_URL not found in .env.local or environment.");
}

async function run() {
  const conn = await mysql.createConnection({ uri: getDbUrl(), ssl: { rejectUnauthorized: false } });
  console.log("Connected to database.");

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS ai_chats (
      id         INT          NOT NULL AUTO_INCREMENT,
      user_id    INT          NOT NULL,
      title      VARCHAR(255) NOT NULL DEFAULT 'New chat',
      created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP    NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id),
      CONSTRAINT fk_aichat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_aichat_user (user_id, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log("✓ ai_chats table ready");

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id         INT          NOT NULL AUTO_INCREMENT,
      chat_id    INT          NOT NULL,
      role       ENUM('user','model') NOT NULL,
      content    TEXT         NOT NULL,
      created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id),
      CONSTRAINT fk_aimsg_chat FOREIGN KEY (chat_id) REFERENCES ai_chats(id) ON DELETE CASCADE,
      INDEX idx_aimsg_chat (chat_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log("✓ ai_chat_messages table ready");

  await conn.end();
  console.log("Migration complete.");
}

run().catch(err => { console.error(err); process.exit(1); });
