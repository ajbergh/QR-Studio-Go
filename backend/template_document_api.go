package backend

import (
	"encoding/base64"
	"time"
)

// TemplateDocument avoids framework-specific []byte serialization ambiguity by
// carrying binary images as explicit base64 strings across the Wails boundary.
type TemplateDocument struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	SettingsJSON     string    `json:"settingsJson"`
	LogoBase64       string    `json:"logoBase64,omitempty"`
	BackgroundBase64 string    `json:"backgroundBase64,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

func (a *DesktopAPI) GetTemplateDocument(id string) (*TemplateDocument, error) {
	if err := a.ensureReady(); err != nil {
		return nil, err
	}
	template, err := a.runtime.templateService.GetTemplate(id)
	if err != nil {
		return nil, err
	}
	document := &TemplateDocument{
		ID:           template.ID,
		Name:         template.Name,
		SettingsJSON: template.SettingsJSON,
		CreatedAt:    template.CreatedAt,
		UpdatedAt:    template.UpdatedAt,
	}
	if len(template.LogoData) > 0 {
		document.LogoBase64 = base64.StdEncoding.EncodeToString(template.LogoData)
	}
	if len(template.BackgroundData) > 0 {
		document.BackgroundBase64 = base64.StdEncoding.EncodeToString(template.BackgroundData)
	}
	return document, nil
}
