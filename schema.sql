-- ============================================================
-- IP Checker - Database Schema
-- ============================================================
-- Run this once against your MySQL server to create the
-- database and required tables.
--
--   mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS ip_checker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ip_checker;

-- ------------------------------------------------------------
-- Table: agents
-- Stores one row per unique agent_id and tracks how many
-- times its link has been opened.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  agent_id    VARCHAR(64) NOT NULL,
  open_count  INT UNSIGNED NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agent_id (agent_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: visitors
-- Stores each distinct IP address seen for a given agent_id.
-- One row per (agent_id, ip_address) pair -- enforced by the
-- unique key below, which is what makes "Unique vs Duplicate"
-- detection race-condition safe.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visitors (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  agent_id     VARCHAR(64) NOT NULL,
  ip_address   VARCHAR(45) NOT NULL, -- 45 chars = max IPv6 length
  first_visit  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agent_ip (agent_id, ip_address),
  KEY idx_agent_id (agent_id)
) ENGINE=InnoDB;
