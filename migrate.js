const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const sql = `
    CREATE TABLE IF NOT EXISTS agency_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      agency_name VARCHAR(255) NOT NULL DEFAULT 'ThePieCraft',
      agency_logo_url TEXT,
      base_currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      razorpay_key_id TEXT,
      razorpay_key_secret TEXT,
      smtp_host VARCHAR(255),
      smtp_port INT DEFAULT 465,
      smtp_user VARCHAR(255),
      smtp_pass TEXT,
      smtp_from VARCHAR(255),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  await connection.query(sql);
  
  // check if row exists, if not insert 1 row
  const [rows] = await connection.query('SELECT * FROM agency_settings LIMIT 1');
  if (rows.length === 0) {
    await connection.query('INSERT INTO agency_settings (agency_name) VALUES ("ThePieCraft")');
    console.log("Seeded default settings row");
  }
  
  console.log('Table agency_settings created successfully');
  await connection.end();
}
main().catch(console.error);
