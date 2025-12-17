/*
================================================================================
QR STUDIO - DATABASE MIGRATIONS
================================================================================

File: backend/database/migrations.go
Description: Database schema migrations for QR Studio. Defines the SQLite
             schema and handles version upgrades. Migrations are idempotent
             and can be run multiple times safely.

Tables:
  - schema_version: Tracks applied migrations
  - settings: User preferences and app configuration
  - templates: Saved QR code templates with styling
  - history: Generation history for analytics (optional)

Migration Strategy:
  - Each migration has a unique version number
  - Migrations are applied in order
  - Applied migrations are recorded in schema_version table
  - IF NOT EXISTS clauses make migrations idempotent

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

package database

import (
	"database/sql"
	"fmt"
)

// Migration represents a single database migration.
// Each migration has a version number and SQL statement to execute.
//
// Fields:
//   - Version: Unique version number (executed in order)
//   - Description: Human-readable description of the migration
//   - SQL: SQL statement(s) to execute
type Migration struct {
	Version     int
	Description string
	SQL         string
}

// migrations defines all database migrations in order.
// New migrations should be appended to this slice with incrementing versions.
//
// IMPORTANT: Never modify existing migrations that have been deployed.
// Always add new migrations for schema changes.
var migrations = []Migration{
	{
		Version:     1,
		Description: "Create schema_version table",
		SQL: `
			CREATE TABLE IF NOT EXISTS schema_version (
				version INTEGER PRIMARY KEY,
				applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				description TEXT
			);
		`,
	},
	{
		Version:     2,
		Description: "Create settings table",
		SQL: `
			CREATE TABLE IF NOT EXISTS settings (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);
		`,
	},
	{
		Version:     3,
		Description: "Create templates table",
		SQL: `
			CREATE TABLE IF NOT EXISTS templates (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				settings_json TEXT NOT NULL,
				logo_data BLOB,
				background_data BLOB,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);
			
			CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
			CREATE INDEX IF NOT EXISTS idx_templates_created ON templates(created_at);
		`,
	},
	{
		Version:     4,
		Description: "Create history table",
		SQL: `
			CREATE TABLE IF NOT EXISTS history (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				template_id TEXT,
				data_type TEXT,
				data_content TEXT,
				exported_path TEXT,
				export_format TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
			);
			
			CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at);
			CREATE INDEX IF NOT EXISTS idx_history_template ON history(template_id);
		`,
	},
	{
		Version:     5,
		Description: "Add default settings",
		SQL: `
			INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'system');
			INSERT OR IGNORE INTO settings (key, value) VALUES ('default_export_format', 'png');
			INSERT OR IGNORE INTO settings (key, value) VALUES ('default_qr_size', '1000');
			INSERT OR IGNORE INTO settings (key, value) VALUES ('show_history', 'true');
			INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_save_templates', 'false');
		`,
	},
}

// runMigrations executes all pending database migrations.
// Migrations that have already been applied (recorded in schema_version) are skipped.
//
// Parameters:
//   - db: Database connection to run migrations on
//
// Returns:
//   - error: Error if any migration fails
//
// Process:
//  1. Create schema_version table if it doesn't exist
//  2. Get the current schema version
//  3. Apply all migrations with version > current version
//  4. Record each applied migration in schema_version
func runMigrations(db *sql.DB) error {
	// Ensure schema_version table exists (migration 1)
	// This is done outside the transaction to avoid bootstrap issues
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_version (
			version INTEGER PRIMARY KEY,
			applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			description TEXT
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create schema_version table: %w", err)
	}

	// Get current schema version
	currentVersion, err := getCurrentVersion(db)
	if err != nil {
		return fmt.Errorf("failed to get current schema version: %w", err)
	}

	// Apply pending migrations
	for _, migration := range migrations {
		if migration.Version <= currentVersion {
			// Already applied, skip
			continue
		}

		// Apply migration in a transaction
		if err := applyMigration(db, migration); err != nil {
			return fmt.Errorf("failed to apply migration %d (%s): %w",
				migration.Version, migration.Description, err)
		}

		fmt.Printf("Applied migration %d: %s\n", migration.Version, migration.Description)
	}

	return nil
}

// getCurrentVersion returns the highest applied migration version.
// Returns 0 if no migrations have been applied yet.
//
// Parameters:
//   - db: Database connection
//
// Returns:
//   - int: Highest applied migration version
//   - error: Error if query fails
func getCurrentVersion(db *sql.DB) (int, error) {
	var version int
	err := db.QueryRow("SELECT COALESCE(MAX(version), 0) FROM schema_version").Scan(&version)
	if err != nil {
		return 0, err
	}
	return version, nil
}

// applyMigration executes a single migration within a transaction.
// Records the migration in schema_version after successful execution.
//
// Parameters:
//   - db: Database connection
//   - migration: Migration to apply
//
// Returns:
//   - error: Error if migration or recording fails
func applyMigration(db *sql.DB, migration Migration) error {
	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() // Rollback if not committed

	// Execute migration SQL
	if _, err := tx.Exec(migration.SQL); err != nil {
		return fmt.Errorf("failed to execute migration SQL: %w", err)
	}

	// Record migration in schema_version
	_, err = tx.Exec(
		"INSERT INTO schema_version (version, description) VALUES (?, ?)",
		migration.Version,
		migration.Description,
	)
	if err != nil {
		return fmt.Errorf("failed to record migration: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetMigrationCount returns the total number of defined migrations.
// Useful for testing and debugging.
//
// Returns:
//   - int: Number of defined migrations
func GetMigrationCount() int {
	return len(migrations)
}
