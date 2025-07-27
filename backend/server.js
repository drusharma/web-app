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
    console.log('Attempting to fetch applicants from database'); // Debug log
    
    // Simple query without the JSON aggregation first
    const testQuery = await client.query('SELECT id, name FROM applicant LIMIT 1');
    console.log('Test query successful:', testQuery.rows);

    // Main query
    const { search } = req.query;
    let query = 'SELECT * FROM applicant';
    const params = [];
    
    if (search) {
      query += ' WHERE name ILIKE $1 OR address ILIKE $1';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY name';
    
    const result = await client.query(query, params);
    console.log(`Found ${result.rows.length} applicants`); // Debug log
    
    // Get policies separately (more reliable than json_agg)
    const applicantsWithPolicies = await Promise.all(
      result.rows.map(async applicant => {
        const policies = await client.query(
          'SELECT * FROM policy WHERE applicant_id = $1',
          [applicant.id]
        );
        return { ...applicant, policies: policies.rows };
      })
    );

    res.json(applicantsWithPolicies);
  } catch (err) {
    console.error('DATABASE ERROR:', err);
    res.status(500).json({ 
      error: 'Failed to load applicants',
      details: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        stack: err.stack,
        query: err.query
      } : null
    });
  } finally {
    client.release();
  }
});

// [Keep all your other existing endpoints exactly as they are]

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
