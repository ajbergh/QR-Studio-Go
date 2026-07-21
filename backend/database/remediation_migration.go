package database

// Version 6 completes the 1.1 remediation. Legacy history rows may contain raw
// QR payloads (including Wi-Fi credentials) and absolute file paths, so the
// migration deliberately redacts them rather than carrying sensitive data into
// the hardened history UI.
func init() {
	migrations = append(migrations, Migration{
		Version:     6,
		Description: "Add missing defaults and redact legacy export history",
		SQL: `
			INSERT OR IGNORE INTO settings (key, value) VALUES ('default_error_correction', 'Q');
			INSERT OR IGNORE INTO settings (key, value) VALUES ('filename_template', '{label}_{date}');
			UPDATE history
			SET data_content = CASE
				WHEN data_content IS NULL OR trim(data_content) = '' THEN 'Legacy export'
				ELSE substr(data_content, 1, 80)
			END,
			exported_path = '';
		`,
	})
}
