require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Enhanced DB connection
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Increased pool size
  idleTimeoutMillis: 30000
});

// Verify DB connection on startup
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  }
})();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Improved applicants endpoint
app.get('/api/applicants', async (req, res) => {
  const client = await pool.connect();
  try {
    const { search } = req.query;
    let query = `
      SELECT 
        a.*,
        (SELECT json_agg(p) FROM policy p WHERE p.applicant_id = a.id) AS policies
      FROM applicant a
    `;
    
    if (search) {
      query += ` WHERE a.name ILIKE $1 OR a.address ILIKE $1`;
    }
    
    query += ' ORDER BY a.name';
    
    const result = await client.query(
      query,
      search ? [`%${search}%`] : []
    );
    
    res.json(result.rows.map(row => ({
      ...row,
      policies: row.policies || [] // Ensure policies is always an array
    })));
  } catch (err) {
    console.error('DB Query Error:', err);
    res.status(500).json({ 
      error: 'Failed to load applicants',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    client.release();
  }
});

// [Keep all your other existing endpoints exactly as they are]

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
