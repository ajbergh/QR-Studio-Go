package database

import (
	"path/filepath"
	"runtime"
	"testing"
)

func TestDatabasePathHonorsXDGConfigHome(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("XDG_CONFIG_HOME is a Linux convention")
	}
	configDir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", configDir)
	path, err := getDatabasePath()
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(configDir, "QRStudio", "qr-studio.db")
	if path != want {
		t.Fatalf("database path = %q, want %q", path, want)
	}
}
