package handlers

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"todayeat/internal/config"
	"todayeat/internal/models"
)

func TestSettingsValidateWholeBatchAndRollbackDatabaseFailure(t *testing.T) {
	db, failure := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "settings.db")), &gorm.Config{})
	if failure != nil {
		t.Fatal(failure)
	}
	pool, _ := db.DB()
	t.Cleanup(func() { pool.Close() })
	if failure = db.AutoMigrate(&models.Setting{}); failure != nil {
		t.Fatal(failure)
	}
	if failure = db.Create(&models.Setting{Key: "app_name", Value: "original"}).Error; failure != nil {
		t.Fatal(failure)
	}
	input := settingsInput{Settings: map[string]json.RawMessage{"app_name": json.RawMessage(`"edited"`), "unsupported": json.RawMessage(`"bad"`)}}
	if _, failure = saveSettings(db, input); failure == nil {
		t.Fatal("unsupported batch accepted")
	}
	if failure = db.Exec(`CREATE TRIGGER reject_tastes BEFORE INSERT ON settings WHEN NEW.key = 'tastes' BEGIN SELECT RAISE(ABORT, 'test failure'); END`).Error; failure != nil {
		t.Fatal(failure)
	}
	delete(input.Settings, "unsupported")
	input.Settings["tastes"] = json.RawMessage(`["sweet"]`)
	if _, failure = saveSettings(db, input); failure == nil {
		t.Fatal("database failure ignored")
	}
	var stored models.Setting
	if failure = db.Where("key = ?", "app_name").First(&stored).Error; failure != nil {
		t.Fatal(failure)
	}
	if stored.Value != "original" {
		t.Fatalf("partial batch committed: %s", stored.Value)
	}
}

func TestAlbumSkipsBrokenPhotosAndIncludesOnlyPhotographedVisitItems(t *testing.T) {
	db, failure := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "album.db")), &gorm.Config{})
	if failure != nil {
		t.Fatal(failure)
	}
	pool, _ := db.DB()
	t.Cleanup(func() { pool.Close() })
	if failure = db.AutoMigrate(&models.Visit{}, &models.MealRecord{}); failure != nil {
		t.Fatal(failure)
	}
	visits := []models.Visit{{VisitDate: "2026-10-01", RestaurantName: "one", Photos: `["a","b"]`}, {VisitDate: "2026-10-02", Photos: `["c"]`}, {VisitDate: "2026-10-03", Photos: `invalid`}, {VisitDate: "2026-10-04", Photos: `null`}}
	if failure = db.Create(&visits).Error; failure != nil {
		t.Fatal(failure)
	}
	items := []models.MealRecord{{VisitID: visits[0].ID, DishName: "first"}, {VisitID: visits[0].ID, DishName: "second"}, {VisitID: visits[2].ID, DishName: "excluded"}}
	if failure = db.Create(&items).Error; failure != nil {
		t.Fatal(failure)
	}
	report, failure := photoAlbum(db)
	if failure != nil {
		t.Fatal(failure)
	}
	if report.TotalDays != 2 || report.TotalPhotos != 3 || report.Days[0].VisitID != visits[1].ID || report.Days[0].Items == nil || len(report.Days[1].Items) != 2 || report.Days[1].Items[1].DishName != "second" {
		t.Fatalf("bad album: %+v", report)
	}
}

func TestStreamedMultipartRejectsOversizedEnvelopesAndMalformedTrailers(t *testing.T) {
	prior := config.C
	t.Cleanup(func() { config.C = prior })
	root := t.TempDir()
	t.Setenv("TMP", root)
	t.Setenv("TEMP", root)
	config.C = config.Config{MaxUploadSize: 1024, UploadDir: filepath.Join(root, "uploads"), BackupDir: filepath.Join(root, "backup"), CompressMaxDim: 100, JpegQuality: 80}
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/image", UploadImage)
	for _, kind := range []string{"oversized image", "oversized field", "malformed trailer"} {
		t.Run(kind, func(t *testing.T) {
			var body bytes.Buffer
			writer := multipart.NewWriter(&body)
			if kind == "oversized field" {
				field, _ := writer.CreateFormField("description")
				field.Write([]byte(strings.Repeat("x", (1<<20)+2048)))
			}
			file, _ := writer.CreateFormFile("image", "test.jpg")
			size := 16
			if kind == "oversized image" {
				size = 2048
			}
			file.Write([]byte(strings.Repeat("x", size)))
			writer.Close()
			data := body.Bytes()
			if kind == "malformed trailer" {
				data = data[:len(data)-20]
			}
			request := httptest.NewRequest("POST", "/image", bytes.NewReader(data))
			request.ContentLength = -1
			request.Header.Set("Content-Type", writer.FormDataContentType())
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != 400 {
				t.Fatalf("HTTP %d: %s", response.Code, response.Body)
			}
			staged, _ := filepath.Glob(filepath.Join(root, "todayeat-upload-*"))
			if len(staged) != 0 {
				t.Fatalf("temporary files leaked: %v", staged)
			}
			if _, failure := os.Stat(config.C.BackupDir); !os.IsNotExist(failure) {
				t.Fatal("rejected request reached permanent storage")
			}
		})
	}
}
