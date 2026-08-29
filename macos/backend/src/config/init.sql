-- Schema for CP Contest Generator.
-- Safe to run repeatedly: every statement is idempotent.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture TEXT,
    handle VARCHAR(100) UNIQUE,
    rating INTEGER,
    max_rating INTEGER,
    rank VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    user_rating_at_start INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    is_ended BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS contest_problems (
    id SERIAL PRIMARY KEY,
    contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    contest_id_cf INTEGER NOT NULL,
    problem_index VARCHAR(10) NOT NULL,
    problem_name VARCHAR(255) NOT NULL,
    rating INTEGER,
    tags TEXT[] NOT NULL DEFAULT '{}',
    position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS contest_reports (
    id SERIAL PRIMARY KEY,
    contest_id INTEGER UNIQUE NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    report JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Columns added after the first release. ADD COLUMN IF NOT EXISTS keeps
-- existing databases upgradeable without a dedicated migration tool.
ALTER TABLE users            ADD COLUMN IF NOT EXISTS max_rating INTEGER;
ALTER TABLE users            ADD COLUMN IF NOT EXISTS rank VARCHAR(50);
ALTER TABLE contests         ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE contests         ADD COLUMN IF NOT EXISTS user_rating_at_start INTEGER;
ALTER TABLE contest_problems ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- contest_problems.rating was NOT NULL, which rejected the unrated problems
-- Codeforces occasionally returns.
ALTER TABLE contest_problems ALTER COLUMN rating DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contests_user_id          ON contests(user_id);
CREATE INDEX IF NOT EXISTS idx_contests_created_at       ON contests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contest_problems_contest  ON contest_problems(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_reports_contest   ON contest_reports(contest_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contest_problems_unique
    ON contest_problems(contest_id, contest_id_cf, problem_index);
