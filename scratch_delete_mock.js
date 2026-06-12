const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({ uri: 'mysql://u257795766_admin:Thepiecraftmarketing%40123@srv2209.hstgr.io:3306/u257795766_crm' });
  await connection.execute("DELETE FROM documents WHERE url IS NULL AND name != '.folder-keep'");
  console.log("Mock documents deleted");
  process.exit(0);
}
run();
