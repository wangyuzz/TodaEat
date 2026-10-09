package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"todayeat/internal/database"
	"todayeat/internal/models"
)

func TestDishQueriesFilterBeforePaginationAndHandleErrors(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "menu.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	previousDB := database.DB
	database.DB = db
	sqlDB, _ := db.DB()
	t.Cleanup(func() { sqlDB.Close(); database.DB = previousDB })
	if err := db.AutoMigrate(&models.Dish{}); err != nil {
		t.Fatal(err)
	}
	entries := []models.Dish{
		{Name: "A", RestaurantID: 1, Category: "火锅", MealType: "lunch", Enabled: true},
		{Name: "B", RestaurantID: 1, Category: "火锅", MealType: "all", Enabled: true},
		{Name: "C", RestaurantID: 2, Category: "火锅", MealType: "all", Enabled: true},
		{Name: "D", RestaurantID: 1, Category: "火锅", MealType: "all", Enabled: true},
		{Name: "E", RestaurantID: 1, Category: "火锅", MealType: "all", DeletedAt: gorm.DeletedAt{Time: time.Now(), Valid: true}},
	}
	if err := db.Create(&entries).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&entries[3]).Update("enabled", false).Error; err != nil {
		t.Fatal(err)
	}
	router := gin.New()
	router.GET("/dishes", GetDishes)
	type result struct {
		Code int
		Data struct {
			Items    []struct{ Name string }
			Total    int64
			PageSize int `json:"page_size"`
		}
	}
	request := func(query string) (int, result) {
		t.Helper()
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest("GET", "/dishes?"+query, nil))
		var body result
		if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		return response.Code, body
	}
	filter := "restaurant_id=1&category=%E7%81%AB%E9%94%85&enabled=true&meal_type=lunch"
	status, page := request(filter + "&sort=name&order=asc&page=2&pageSize=1")
	if status != 200 || page.Data.Total != 2 || len(page.Data.Items) != 1 || page.Data.Items[0].Name != "B" {
		t.Fatalf("pagination/filter mismatch: %+v", page)
	}
	status, random := request(filter + "&sort=random&page=99&pageSize=1")
	if status != 200 || random.Data.Total != 2 || len(random.Data.Items) != 1 || (random.Data.Items[0].Name != "A" && random.Data.Items[0].Name != "B") {
		t.Fatalf("random selection escaped filters: %+v", random)
	}
	_, fallback := request(filter + "&pageSize=101")
	if fallback.Data.PageSize != 20 {
		t.Fatal("page-size compatibility changed")
	}
	if err := sqlDB.Close(); err != nil {
		t.Fatal(err)
	}
	status, failed := request(filter)
	if status != 500 || failed.Code != 50000 {
		t.Fatal("database failure was reported as successful empty data")
	}
}
