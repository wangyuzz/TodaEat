package handlers

import (
	"errors"
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"todayeat/internal/models"
)

func TestVisitTransactionRollbackAndDualRatings(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "visits.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	t.Cleanup(func() { sqlDB.Close() })
	if err := db.AutoMigrate(&models.Restaurant{}, &models.Visit{}, &models.Dish{}, &models.MealRecord{}); err != nil {
		t.Fatal(err)
	}
	restaurant := models.Restaurant{Name: "Test", Wish: true}
	if err := db.Create(&restaurant).Error; err != nil {
		t.Fatal(err)
	}
	request := visitRequest{RestaurantID: restaurant.ID, VisitDate: "2026-10-09", Cost: 88,
		Photos: JSONArray(`["/uploads/a.jpg"]`), Items: []visitItemRequest{{DishName: "Manual", MyRating: 3, HerRating: 5}}}
	var visit models.Visit
	if err := db.Transaction(func(tx *gorm.DB) error { return saveVisit(tx, &visit, request) }); err != nil {
		t.Fatal(err)
	}
	var records []models.MealRecord
	db.Where("visit_id = ?", visit.ID).Find(&records)
	if len(records) != 1 || records[0].MyRating != 3 || records[0].HerRating != 5 || records[0].Rating != 3 {
		t.Fatalf("dual ratings not preserved: %+v", records)
	}
	var menu models.Dish
	if err := db.First(&menu, records[0].DishID).Error; err != nil || menu.Name != "Manual" {
		t.Fatalf("manual dish missing: %v", err)
	}
	db.First(&restaurant, restaurant.ID)
	if restaurant.Wish {
		t.Fatal("completed visit should fulfill wish")
	}

	// An invalid second item must roll back the visit edit, deleted old records,
	// and the first newly created manual dish as a single transaction.
	request.Cost = 999
	request.Items = []visitItemRequest{{DishName: "Should roll back"}, {DishID: 999999}}
	err = db.Transaction(func(tx *gorm.DB) error {
		var current models.Visit
		if err := tx.First(&current, visit.ID).Error; err != nil {
			return err
		}
		return saveVisit(tx, &current, request)
	})
	if !errors.Is(err, errInvalidDish) {
		t.Fatalf("expected invalid dish, got %v", err)
	}
	db.First(&visit, visit.ID)
	if visit.Cost != 88 {
		t.Fatalf("failed edit changed visit cost: %d", visit.Cost)
	}
	records = nil
	db.Where("visit_id = ?", visit.ID).Find(&records)
	if len(records) != 1 || records[0].DishName != "Manual" {
		t.Fatalf("failed edit removed original items: %+v", records)
	}
	var count int64
	db.Model(&models.Dish{}).Where("name = ?", "Should roll back").Count(&count)
	if count != 0 {
		t.Fatal("failed edit leaked a menu entry")
	}
}
