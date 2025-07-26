require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Applicants endpoints
app.get('/api/applicants', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM applicant';
    const params = [];
    
    if (search) {
      query += ' WHERE name ILIKE $1 OR address ILIKE $1';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY name';
    const result = await pool.query(query, params);
    
    // Get policies for each applicant
    const applicantsWithPolicies = await Promise.all(result.rows.map(async applicant => {
      const policies = await pool.query(
        'SELECT * FROM policy WHERE applicant_id = $1',
        [applicant.id]
      );
      return { ...applicant, policies: policies.rows };
    }));
    
    res.json(applicantsWithPolicies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/applicants', async (req, res) => {
  try {
    const { name, dot, address } = req.body;
    const result = await pool.query(
      'INSERT INTO applicant (name, dot, address) VALUES ($1, $2, $3) RETURNING *',
      [name, dot, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/applicants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dot, address } = req.body;
    const result = await pool.query(
      'UPDATE applicant SET name = $1, dot = $2, address = $3 WHERE id = $4 RETURNING *',
      [name, dot, address, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/applicants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM applicant WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Policies endpoints
app.get('/api/applicants/:id/policies', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM policy WHERE applicant_id = $1 ORDER BY effective_date DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/applicants/:id/policies', async (req, res) => {
  try {
    const { id } = req.params;
    const { business_lines, policy_no, effective_date, expiration_date } = req.body;
    const result = await pool.query(
      'INSERT INTO policy (applicant_id, business_lines, policy_no, effective_date, expiration_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, business_lines, policy_no, effective_date, expiration_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
