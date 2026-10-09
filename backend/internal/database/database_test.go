package database

import (
	"os"
	"path/filepath"
	"testing"

	"todayeat/internal/config"
	"todayeat/internal/models"
)

func TestFailedInitializationRollsBackSchemaAndKeepsExistingHandle(t *testing.T) {
	previousConfig, previousDB, previousCatalog := config.C, DB, defaultCatalog
	t.Cleanup(func() { config.C, DB, defaultCatalog = previousConfig, previousDB, previousCatalog })
	root := t.TempDir()
	config.C.DBPath = filepath.Join(root, "healthy.db")
	if failure := Init(); failure != nil {
		t.Fatal(failure)
	}
	healthy := DB
	pool, _ := healthy.DB()
	t.Cleanup(func() { pool.Close() })
	for _, index := range []string{"todayeat_records_by_date", "todayeat_records_by_type_date", "todayeat_visit_items_by_id"} {
		if !DB.Migrator().HasIndex(&models.MealRecord{}, index) {
			t.Fatalf("missing query index %s", index)
		}
	}
	config.C.DBPath = filepath.Join(root, "failed.db")
	defaultCatalog = []byte("invalid")
	if Init() == nil || DB != healthy {
		t.Fatal("failed candidate replaced the working handle")
	}
	candidate, failure := openSQLite(config.C.DBPath)
	if failure != nil {
		t.Fatal(failure)
	}
	failedPool, _ := candidate.DB()
	defer failedPool.Close()
	if candidate.Migrator().HasTable(&models.Visit{}) {
		t.Fatal("failed startup left a partially migrated schema")
	}
	if failure = pool.Ping(); failure != nil {
		t.Fatalf("existing handle was closed: %v", failure)
	}
	if _, failure = os.Stat(config.C.DBPath); failure != nil {
		t.Fatal(failure)
	}
}

func TestInitializePreservesDataAndDoesNotReseedDeletedRestaurants(t *testing.T) {
	previousConfig, previousDB := config.C, DB
	t.Cleanup(func() { config.C, DB = previousConfig, previousDB })
	config.C.DBPath = filepath.Join(t.TempDir(), "todayeat.db")
	open := func() {
		t.Helper()
		if err := Init(); err != nil {
			t.Fatal(err)
		}
	}
	closeDB := func() {
		t.Helper()
		db, err := DB.DB()
		if err != nil {
			t.Fatal(err)
		}
		if err := db.Close(); err != nil {
			t.Fatal(err)
		}
	}
	open()
	var restaurants, dishes int64
	DB.Model(&models.Restaurant{}).Count(&restaurants)
	DB.Model(&models.Dish{}).Count(&dishes)
	if restaurants != 9 || dishes != 38 {
		t.Fatalf("unexpected fresh seeds: %d restaurants, %d dishes", restaurants, dishes)
	}
	if err := DB.Model(&models.Setting{}).Where("key = ?", "app_name").Update("value", "My name").Error; err != nil {
		t.Fatal(err)
	}
	if err := DB.Where("1 = 1").Delete(&models.Restaurant{}).Error; err != nil {
		t.Fatal(err)
	}
	visit := models.Visit{RestaurantID: 1, RestaurantName: "History", VisitDate: "2026-10-09", Cost: 123}
	if err := DB.Create(&visit).Error; err != nil {
		t.Fatal(err)
	}
	closeDB()
	open()
	defer closeDB()
	DB.Model(&models.Restaurant{}).Count(&restaurants)
	if restaurants != 0 {
		t.Fatal("restarting resurrected deleted restaurants")
	}
	var setting models.Setting
	DB.Where("key = ?", "app_name").First(&setting)
	if setting.Value != "My name" {
		t.Fatal("initialization overwrote user settings")
	}
	var restored models.Visit
	if err := DB.First(&restored, visit.ID).Error; err != nil || restored.Cost != 123 {
		t.Fatalf("history was not persisted: %v", err)
	}
}
