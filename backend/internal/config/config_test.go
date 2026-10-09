package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestReadDefaultsFallbackAndValidation(t *testing.T) {
	credentials := map[string]string{"ADMIN_PASSWORD": "custom-admin", "JWT_SECRET": "test-signing-secret-at-least-32-bytes"}
	defaults, err := Read(func(key string) string { return credentials[key] })
	if err != nil || defaults.Port != "8080" || defaults.MaxUploadSize != 20<<20 || defaults.AppPassword != "custom-admin" {
		t.Fatalf("invalid defaults: %+v, %v", defaults, err)
	}
	values := map[string]string{"ADMIN_PASSWORD": "custom-admin", "JWT_SECRET": credentials["JWT_SECRET"], "MAX_UPLOAD_SIZE_MB": "8", "PORT": "8090"}
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
				return credentials[key]
			})
			if err == nil || !strings.Contains(err.Error(), invalid.key) {
				t.Fatal("invalid setting accepted")
			}
		})
	}
}

func TestReadRejectsUnsafeCredentialsWithoutDisclosingValues(t *testing.T) {
	if _, err := Read(func(string) string { return "" }); err == nil {
		t.Fatal("unconfigured startup accepted")
	}
	for _, test := range []struct{ key, value string }{
		{"ADMIN_PASSWORD", ""}, {"ADMIN_PASSWORD", "short"}, {"ADMIN_PASSWORD", "  CHANGE-ME  "},
		{"APP_PASSWORD", "short"}, {"APP_PASSWORD", "change-me"}, {"APP_PASSWORD", "        "},
		{"JWT_SECRET", ""}, {"JWT_SECRET", "short"}, {"JWT_SECRET", "todayeat-local-development-secret"},
		{"JWT_SECRET", "replace-with-a-random-secret"}, {"JWT_SECRET", strings.Repeat(" ", 32)},
	} {
		t.Run(test.key+"/"+test.value, func(t *testing.T) {
			values := map[string]string{"APP_PASSWORD": "test-app-password", "ADMIN_PASSWORD": "test-admin-password", "JWT_SECRET": "test-signing-secret-at-least-32-bytes"}
			values[test.key] = test.value
			settings, err := Read(func(key string) string { return values[key] })
			if err == nil || settings != (Config{}) || !strings.Contains(err.Error(), test.key) {
				t.Fatalf("unsafe credential accepted: %v", err)
			}
			if test.value != "" && strings.Contains(err.Error(), test.value) {
				t.Fatal("credential disclosed in error")
			}
		})
	}
	values := map[string]string{"ADMIN_PASSWORD": "  自己设置的八字密码  ", "JWT_SECRET": strings.Repeat("x", 32)}
	settings, err := Read(func(key string) string { return values[key] })
	if err != nil || settings.AdminPassword != values["ADMIN_PASSWORD"] || settings.AppPassword != settings.AdminPassword {
		t.Fatal("valid literal password/fallback changed")
	}
	file, err := os.Open("../../../.env.example")
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	entries, err := environmentEntries(file)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := Read(func(key string) string { return entries[key] }); err == nil {
		t.Fatal("example configuration accepted for deployment")
	}
}

func TestUnsafeLoadDoesNotPublishConfiguration(t *testing.T) {
	previous := C
	t.Cleanup(func() { C = previous })
	t.Chdir(t.TempDir())
	for _, key := range []string{"ADMIN_PASSWORD", "APP_PASSWORD", "JWT_SECRET", "TODAYEAT_ATOMIC_TEST"} {
		t.Setenv(key, "")
	}
	if err := os.WriteFile(".env", []byte("ADMIN_PASSWORD=change-me\nTODAYEAT_ATOMIC_TEST=unpublished\n"), 0600); err != nil {
		t.Fatal(err)
	}
	if Load() == nil || C != previous || os.Getenv("TODAYEAT_ATOMIC_TEST") != "" {
		t.Fatal("unsafe configuration was published")
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
