package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestReadDefaultsFallbackAndValidation(t *testing.T) {
	defaults, err := Read(func(string) string { return "" })
	if err != nil || defaults.Port != "8080" || defaults.MaxUploadSize != 20<<20 || defaults.AppPassword != "change-me" {
		t.Fatalf("invalid defaults: %+v, %v", defaults, err)
	}
	values := map[string]string{"ADMIN_PASSWORD": "custom-admin", "MAX_UPLOAD_SIZE_MB": "8", "PORT": "8090"}
	settings, err := Read(func(key string) string { return values[key] })
	if err != nil || settings.AppPassword != "custom-admin" || settings.MaxUploadSize != 8<<20 || settings.Port != "8090" {
		t.Fatalf("overrides/fallback lost: %+v, %v", settings, err)
	}
	for _, invalid := range []struct{ key, value string }{
		{"PORT", "0"}, {"PORT", "65536"}, {"PORT", "abc"},
		{"JPEG_QUALITY", "101"}, {"COMPRESS_MAX_DIM", "0"}, {"MAX_UPLOAD_SIZE_MB", "-1"},
		{"MAX_UPLOAD_SIZE_MB", "9223372036854775807"}, {"REPEAT_DAYS", "-2"}, {"JWT_EXPIRE", "-1h"}, {"JWT_EXPIRE", "invalid"},
	} {
		t.Run(invalid.key+invalid.value, func(t *testing.T) {
			_, err := Read(func(key string) string {
				if key == invalid.key {
					return invalid.value
				}
				return ""
			})
			if err == nil {
				t.Fatal("invalid setting accepted")
			}
		})
	}
}

func TestEnvironmentParsingAndFailedLoadDoNotPublishValues(t *testing.T) {
	entries, failure := environmentEntries(strings.NewReader("\ufeffFIRST=\nFIRST=chosen # comment\nFIRST=ignored\nexport SECOND='literal # value' # comment\nLONG=" + strings.Repeat("x", 70_000) + "\n"))
	if failure != nil || entries["FIRST"] != "chosen" || entries["SECOND"] != "literal # value" || len(entries["LONG"]) != 70_000 {
		t.Fatalf("parse failed: %v", failure)
	}
	for _, invalid := range []string{"1BAD=value", "BROKEN='no end", "VALUE=\"quoted\" extra", "VALUE=zero\x00byte"} {
		if _, failure = environmentEntries(strings.NewReader(invalid)); failure == nil {
			t.Fatalf("accepted malformed line %q", invalid)
		}
	}
	previous := C
	t.Cleanup(func() { C = previous })
	t.Chdir(t.TempDir())
	t.Setenv("PORT", "")
	t.Setenv("TODAYEAT_ATOMIC_TEST", "")
	if failure = os.WriteFile(".env", []byte("PORT=invalid\nTODAYEAT_ATOMIC_TEST=unpublished\n"), 0600); failure != nil {
		t.Fatal(failure)
	}
	if Load() == nil || C != previous || os.Getenv("TODAYEAT_ATOMIC_TEST") != "" {
		t.Fatal("invalid configuration was published")
	}
}

func TestEnvironmentFileKeepsProcessOverrides(t *testing.T) {
	t.Setenv("TODAYEAT_TEST_EXISTING", "from-process")
	t.Setenv("TODAYEAT_TEST_QUOTED", "")
	filename := filepath.Join(t.TempDir(), "env")
	text := "TODAYEAT_TEST_EXISTING=from-file\nexport TODAYEAT_TEST_QUOTED='value with spaces'\n# comment\nignored-line\n"
	if err := os.WriteFile(filename, []byte(text), 0600); err != nil {
		t.Fatal(err)
	}
	file, err := os.Open(filename)
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	if err := readEnvironment(file); err != nil {
		t.Fatal(err)
	}
	if os.Getenv("TODAYEAT_TEST_EXISTING") != "from-process" || os.Getenv("TODAYEAT_TEST_QUOTED") != "value with spaces" {
		t.Fatal("environment priority or quoted values changed")
	}
}
