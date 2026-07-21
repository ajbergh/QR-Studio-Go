package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
)

// NewDatabaseHardened opens the application database with a single SQLite
// connection. SQLite pragmas such as foreign_keys and busy_timeout are
// connection-scoped, so constraining the pool guarantees they remain active for
// every operation performed by the desktop application.
func NewDatabaseHardened() (*Database, error) {
	dbPath, err := getDatabasePath()
	if err != nil {
		return nil, fmt.Errorf("failed to get database path: %w", err)
	}
	return NewDatabaseAt(dbPath)
}

// NewDatabaseAt is the testable form of NewDatabaseHardened.
func NewDatabaseAt(dbPath string) (*Database, error) {
	if dbPath == "" {
		return nil, fmt.Errorf("database path is required")
	}

	if err := os.MkdirAll(filepath.Dir(dbPath), 0700); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// A local desktop app does not benefit from a pool of independent SQLite
	// connections, and a single connection makes connection-scoped pragmas
	// deterministic.
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	if err := configureDatabase(db); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to configure database: %w", err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Database{db: db, path: dbPath}, nil
}
