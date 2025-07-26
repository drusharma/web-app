# Policy Management System

A simple applicant and policy management system with PostgreSQL backend.

## Setup

1. Create a PostgreSQL database with the following tables:

```sql
CREATE TABLE applicant (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dot DATE,
    address TEXT
);

CREATE TABLE policy (
    id SERIAL PRIMARY KEY,
    applicant_id INTEGER REFERENCES applicant(id) ON DELETE CASCADE,
    business_lines VARCHAR(255),
    policy_no VARCHAR(255) UNIQUE,
    effective_date DATE,
    expiration_date DATE
);
