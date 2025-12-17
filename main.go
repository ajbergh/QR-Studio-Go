/*
================================================================================
QR STUDIO - WAILS APPLICATION ENTRY POINT
================================================================================

File: main.go
Description: Main entry point for the QR Studio desktop application built with
             Wails v2. This file initializes the Wails runtime, configures the
             application window, and binds the Go backend services to the
             React frontend.

Architecture:
  - Frontend: React + TypeScript + Vite (preserved from web version)
  - Backend: Go with SQLite for persistent storage
  - Bridge: Wails v2 IPC for frontend-backend communication

Dependencies:
  - github.com/wailsapp/wails/v2 - Desktop application framework
  - qr-studio/backend - Application backend services

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

Usage:
  Development: wails dev
  Production:  wails build

================================================================================
*/

package main

import (
	"embed"
	"io/fs"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"

	"qr-studio/backend"
)

// assets embeds the frontend build output directory.
// Wails serves these static files to the webview at runtime.
// The embed directive includes all files from the frontend/dist folder.
//
//go:embed all:frontend/dist
var assets embed.FS

// main is the application entry point.
// It initializes the Wails runtime with configuration options and
// starts the desktop application with the embedded React frontend.
//
// Configuration includes:
//   - Window title, dimensions, and behavior
//   - Asset server for serving the React frontend
//   - Backend bindings for frontend-to-Go communication
//   - Windows-specific options (theme, WebView2 settings)
//
// Returns: Exits with error code 1 if Wails fails to start
func main() {
	// Create the main application instance.
	// The App struct contains all backend services and lifecycle hooks.
	app := backend.NewApp()

	// Create a sub-filesystem for the embedded assets.
	// Since we embed "all:frontend/dist", the files are at frontend/dist/...
	// We need to get a sub-filesystem rooted at "frontend/dist"
	frontendAssets, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		log.Fatalf("Failed to create frontend sub-filesystem: %v", err)
	}

	// Configure and run the Wails application.
	// All options are documented at: https://wails.io/docs/reference/options
	err = wails.Run(&options.App{
		// Window title displayed in the title bar and taskbar
		Title: "QR Studio",

		// Initial window dimensions (in pixels)
		// These match common desktop application sizes for optimal UX
		Width:  1280,
		Height: 800,

		// Minimum window dimensions to prevent UI breakage
		MinWidth:  900,
		MinHeight: 600,

		// Disable default Wails context menu (we use custom UI)
		DisableResize:            false,
		Fullscreen:               false,
		Frameless:                false,
		StartHidden:              false,
		HideWindowOnClose:        false,
		BackgroundColour:         &options.RGBA{R: 255, G: 255, B: 255, A: 255},
		AlwaysOnTop:              false,
		EnableDefaultContextMenu: false,

		// Asset server configuration for serving the React frontend
		AssetServer: &assetserver.Options{
			// Sub-filesystem containing frontend build output (frontend/dist)
			Assets: frontendAssets,
		},

		// Application lifecycle hooks
		// These methods are called at specific points in the app lifecycle
		OnStartup:     app.Startup,     // Called when the app starts
		OnDomReady:    app.DomReady,    // Called when the frontend DOM is ready
		OnShutdown:    app.Shutdown,    // Called when the app is closing
		OnBeforeClose: app.BeforeClose, // Called before the window closes

		// Backend bindings - these methods become available to the frontend
		// via the generated wailsjs bindings (frontend/wailsjs/)
		Bind: []interface{}{
			app,
		},

		// Windows-specific configuration
		Windows: &windows.Options{
			// Use WebView2 for rendering (required on Windows)
			WebviewIsTransparent:              false,
			WindowIsTranslucent:               false,
			DisableWindowIcon:                 false,
			DisableFramelessWindowDecorations: false,

			// WebView2 user data folder location
			// Empty string uses default location in AppData
			WebviewUserDataPath: "",

			// Follow system theme for light/dark mode
			Theme: windows.SystemDefault,

			// Custom messages for installer scenarios
			CustomTheme: nil,
		},
	})

	// Handle Wails startup errors
	if err != nil {
		println("Error:", err.Error())
	}
}
