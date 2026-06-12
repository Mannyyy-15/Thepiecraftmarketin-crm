const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({ uri: 'mysql://u257795766_admin:Thepiecraftmarketing%40123@srv2209.hstgr.io:3306/u257795766_crm' });
  
  await conn.execute('DELETE FROM meta_campaigns');
  console.log('Deleted meta campaigns');
  
  const mockTitles = [
    'Setup ad account & business manager access',
    'Configure pixel & conversion tracking',
    'Create campaign structure & ad sets',
    'Design ad creatives & copy',
    'Launch campaign & verify delivery',
    'First week performance review',
    'Monthly optimization & reporting',
    'Discovery & project brief finalization',
    'Wireframes & design mockups',
    'Design approval from client',
    'Frontend development',
    'Responsive & mobile optimization',
    'Backend / CMS integration',
    'Testing & bug fixes',
    'Client review & feedback round',
    'Final launch & deployment'
  ];
  
  const placeholders = mockTitles.map(() => '?').join(',');
  const query = `DELETE FROM tasks WHERE title IN (${placeholders})`;
  
  const [result] = await conn.execute(query, mockTitles);
  console.log('Deleted auto-generated tasks:', result.affectedRows);
  
  process.exit(0);
}

run();
