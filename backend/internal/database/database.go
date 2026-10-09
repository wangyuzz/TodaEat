package database

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"todayeat/internal/config"
	"todayeat/internal/dishes"
	"todayeat/internal/models"
)

var DB *gorm.DB

//go:embed defaults.json
var defaultCatalog []byte

func openSQLite(filename string) (*gorm.DB, error) {
	if failure := os.MkdirAll(filepath.Dir(filename), 0755); failure != nil {
		return nil, failure
	}
	connection, failure := gorm.Open(sqlite.Open(filename), &gorm.Config{})
	if failure != nil {
		return nil, failure
	}
	pool, failure := connection.DB()
	if failure != nil {
		return nil, failure
	}
	pool.SetMaxOpenConns(1)
	for _, statement := range []string{"PRAGMA journal_mode=WAL", "PRAGMA synchronous=NORMAL", "PRAGMA busy_timeout=5000"} {
		if failure = connection.Exec(statement).Error; failure != nil {
			pool.Close()
			return nil, failure
		}
	}
	return connection, nil
}

func Init() error {
	candidate, failure := openSQLite(config.C.DBPath)
	if failure != nil {
		return failure
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	failure = prepareSQLite(candidate.WithContext(ctx))
	if failure != nil {
		pool, _ := candidate.DB()
		pool.Close()
		return failure
	}
	// Publish only a fully initialized handle. Failed startup leaves the old handle intact.
	DB = candidate
	return nil
}

// Schema upgrades and catalog installation form one commit. A failed seed or
// index cannot leave half an upgrade in a database containing user history.
func prepareSQLite(connection *gorm.DB) error {
	var checks []string
	if failure := connection.Raw("PRAGMA quick_check(1)").Scan(&checks).Error; failure != nil {
		return fmt.Errorf("check database integrity: %w", failure)
	}
	if len(checks) != 1 || checks[0] != "ok" {
		return errors.New("database integrity check failed")
	}
	return connection.Transaction(func(tx *gorm.DB) error {
		entities := []any{&models.Restaurant{}, &models.Visit{}, &models.Dish{}, &models.MealRecord{}, &models.Achievement{}, &models.UserAchievement{}, &models.Setting{}}
		if failure := tx.AutoMigrate(entities...); failure != nil {
			return fmt.Errorf("migrate schema: %w", failure)
		}
		if failure := installDefaults(tx); failure != nil {
			return fmt.Errorf("install defaults: %w", failure)
		}
		return nil
	})
}

func installDefaults(tx *gorm.DB) error {
	var catalog struct {
		Settings     map[string]string    `json:"settings"`
		Achievements []models.Achievement `json:"achievements"`
	}
	if failure := json.Unmarshal(defaultCatalog, &catalog); failure != nil {
		return failure
	}
	keys := make([]string, 0, len(catalog.Settings))
	for key := range catalog.Settings {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	settings := make([]models.Setting, len(keys))
	for index, key := range keys {
		settings[index] = models.Setting{Key: key, Value: catalog.Settings[key]}
	}
	preserve := func(column string) clause.OnConflict {
		return clause.OnConflict{Columns: []clause.Column{{Name: column}}, DoNothing: true}
	}
	if len(settings) > 0 {
		if failure := tx.Clauses(preserve("key")).CreateInBatches(settings, 100).Error; failure != nil {
			return failure
		}
	}
	if len(catalog.Achievements) > 0 {
		if failure := tx.Clauses(preserve("code")).CreateInBatches(catalog.Achievements, 100).Error; failure != nil {
			return failure
		}
	}
	var seeded string
	if failure := tx.Model(&models.Setting{}).Where("key = ?", "default_restaurants_seeded").Limit(1).Pluck("value", &seeded).Error; failure != nil {
		return failure
	}
	if seeded == "true" {
		return nil
	}
	var historicalCount int64
	if failure := tx.Unscoped().Model(&models.Restaurant{}).Count(&historicalCount).Error; failure != nil {
		return failure
	}
	if historicalCount == 0 {
		menu, failure := dishes.DefaultRestaurantSeeds()
		if failure != nil {
			return failure
		}
		for _, entry := range menu {
			if failure := tx.Create(&entry.Restaurant).Error; failure != nil {
				return failure
			}
			for index := range entry.Dishes {
				entry.Dishes[index].RestaurantID = entry.Restaurant.ID
			}
			if len(entry.Dishes) > 0 {
				if failure := tx.CreateInBatches(entry.Dishes, 100).Error; failure != nil {
					return failure
				}
			}
		}
	}
	return tx.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "key"}}, DoUpdates: clause.Assignments(map[string]any{"value": "true"}),
	}).Create(&models.Setting{Key: "default_restaurants_seeded", Value: "true"}).Error
}
