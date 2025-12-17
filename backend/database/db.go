/*
================================================================================
QR STUDIO - DATABASE CONNECTION MANAGER
================================================================================

File: backend/database/db.go
Description: SQLite database connection management for QR Studio. Handles
             database initialization, connection lifecycle, and provides
             the base connection for all service operations.

Features:
  - Automatic database file creation in user's app data directory
  - Connection pooling and lifecycle management
  - WAL mode for better concurrent access
  - Foreign key enforcement enabled
  - Pure Go SQLite driver (no CGO required)

Database Location:
  - Windows: %APPDATA%\QRStudio\qr-studio.db
  - Linux:   ~/.config/QRStudio/qr-studio.db
  - macOS:   ~/Library/Application Support/QRStudio/qr-studio.db

Dependencies:
  - modernc.org/sqlite - Pure Go SQLite driver

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	_ "modernc.org/sqlite"
)

// Database wraps the SQL database connection and provides
// connection management and utility methods.
//
// Fields:
//   - db: The underlying SQL database connection
//   - path: Path to the SQLite database file
type Database struct {
	// db is the underlying SQL database connection.
	// Used by services for executing queries.
	db *sql.DB

	// path is the filesystem path to the SQLite database file.
	// Stored for logging and debugging purposes.
	path string
}

// NewDatabase creates a new Database instance with an open connection.
// The database file is created in the user's app data directory if it
// doesn't exist.
//
// Returns:
//   - *Database: Initialized database with open connection
//   - error: Error if database creation or connection fails
//
// Database Configuration:
//   - Journal mode: WAL (Write-Ahead Logging) for better performance
//   - Foreign keys: Enabled for referential integrity
//   - Synchronous: NORMAL for balance of safety and speed
func NewDatabase() (*Database, error) {
	// Get the database file path
	dbPath, err := getDatabasePath()
	if err != nil {
		return nil, fmt.Errorf("failed to get database path: %w", err)
	}

	// Ensure the directory exists
	dbDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	// Open the database connection
	// The modernc.org/sqlite driver uses "sqlite" as the driver name
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure the database connection
	if err := configureDatabase(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to configure database: %w", err)
	}

	// Verify the connection works
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Database{
		db:   db,
		path: dbPath,
	}, nil
}

// getDatabasePath returns the path to the SQLite database file.
// The path is OS-specific, following platform conventions.
//
// Returns:
//   - string: Full path to the database file
//   - error: Error if app data directory cannot be determined
func getDatabasePath() (string, error) {
	var appDataDir string

	switch runtime.GOOS {
	case "windows":
		// Windows: Use APPDATA environment variable
		appDataDir = os.Getenv("APPDATA")
		if appDataDir == "" {
			return "", fmt.Errorf("APPDATA environment variable not set")
		}
	case "darwin":
		// macOS: Use ~/Library/Application Support
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", fmt.Errorf("failed to get home directory: %w", err)
		}
		appDataDir = filepath.Join(homeDir, "Library", "Application Support")
	default:
		// Linux and others: Use ~/.config
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", fmt.Errorf("failed to get home directory: %w", err)
		}
		appDataDir = filepath.Join(homeDir, ".config")
	}

	// Create the application-specific directory path
	return filepath.Join(appDataDir, "QRStudio", "qr-studio.db"), nil
}

// configureDatabase sets up SQLite pragmas for optimal performance
// and data integrity.
//
// Parameters:
//   - db: The database connection to configure
//
// Returns:
//   - error: Error if any pragma configuration fails
//
// Pragmas Set:
//   - journal_mode=WAL: Write-Ahead Logging for better concurrency
//   - foreign_keys=ON: Enable foreign key constraint enforcement
//   - synchronous=NORMAL: Balance between safety and performance
//   - busy_timeout=5000: Wait up to 5 seconds for locked database
func configureDatabase(db *sql.DB) error {
	pragmas := []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA foreign_keys=ON",
		"PRAGMA synchronous=NORMAL",
		"PRAGMA busy_timeout=5000",
	}

	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			return fmt.Errorf("failed to execute pragma '%s': %w", pragma, err)
		}
	}

	return nil
}

// Migrate runs all database migrations to ensure the schema is up to date.
// Migrations are idempotent and can be run multiple times safely.
//
// Returns:
//   - error: Error if any migration fails
//
// See: migrations.go for the actual migration definitions
func (d *Database) Migrate() error {
	return runMigrations(d.db)
}

// GetDB returns the underlying SQL database connection.
// Used by services that need direct database access.
//
// Returns:
//   - *sql.DB: The underlying database connection
func (d *Database) GetDB() *sql.DB {
	return d.db
}

// GetPath returns the filesystem path to the database file.
// Useful for logging and debugging.
//
// Returns:
//   - string: Full path to the SQLite database file
func (d *Database) GetPath() string {
	return d.path
}

// Close closes the database connection.
// Should be called during application shutdown.
//
// Returns:
//   - error: Error if closing fails (typically safe to ignore)
func (d *Database) Close() error {
	if d.db != nil {
		return d.db.Close()
	}
	return nil
}
