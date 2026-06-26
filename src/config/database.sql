CREATE DATABASE IF NOT EXISTS replystar;
USE replystar;

CREATE TABLE IF NOT EXISTS businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100),
  link_slug VARCHAR(100) NOT NULL UNIQUE,
  plan VARCHAR(50) DEFAULT 'trial',
  ai_tone VARCHAR(100) DEFAULT 'profesional y amigable',
  google_account_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  platform VARCHAR(50) DEFAULT 'replystar',
  reviewer_name VARCHAR(255),
  rating INT NOT NULL,
  comment TEXT,
  is_public TINYINT(1) DEFAULT 0,
  replied TINYINT(1) DEFAULT 0,
  reply TEXT,
  reply_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS review_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  month VARCHAR(7),
  total_reviews INT DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  positive INT DEFAULT 0,
  negative INT DEFAULT 0,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);
