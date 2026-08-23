package main

import (
	"embed"
	"io/fs"
	"log"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"

	"qr-studio/backend"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	frontendAssets, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		log.Printf("failed to create frontend asset filesystem: %v", err)
		os.Exit(1)
	}

	appRuntime := backend.NewRuntime()

	err = wails.Run(&options.App{
		Title:                    "QR Studio",
		Width:                    1280,
		Height:                   800,
		MinWidth:                 900,
		MinHeight:                600,
		BackgroundColour:         &options.RGBA{R: 248, G: 250, B: 252, A: 255},
		EnableDefaultContextMenu: false,
		AssetServer: &assetserver.Options{
			Assets: frontendAssets,
		},
		OnStartup:     appRuntime.Startup,
		OnDomReady:    appRuntime.DomReady,
		OnShutdown:    appRuntime.Shutdown,
		OnBeforeClose: appRuntime.BeforeClose,
		// Bind the curated API rather than the lifecycle object. This prevents the
		// webview from receiving arbitrary read/write filesystem methods.
		Bind: []interface{}{appRuntime.API()},
		Windows: &windows.Options{
			WebviewIsTransparent:              false,
			WindowIsTranslucent:               false,
			DisableWindowIcon:                 false,
			DisableFramelessWindowDecorations: false,
			Theme:                             windows.SystemDefault,
		},
	})
	if err != nil {
		log.Printf("QR Studio failed to start: %v", err)
		os.Exit(1)
	}
}
