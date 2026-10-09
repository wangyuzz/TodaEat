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

func TestAchievementCardsRetainLatestLegacyUnlock(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "legacy.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	connection, _ := db.DB()
	previous := database.DB
	database.DB = db
	t.Cleanup(func() { connection.Close(); database.DB = previous })
	check := func(err error) {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
	}
	check(db.AutoMigrate(&models.Restaurant{}, &models.Visit{}, &models.Dish{}, &models.MealRecord{}, &models.Achievement{}, &models.UserAchievement{}))
	earlier := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	later := earlier.Add(24 * time.Hour)
	awards := []models.Achievement{
		{Code: "manual_1", Name: "Earned", Description: "Earned", Condition: "manual"},
		{Code: "manual_2", Name: "Legacy", Description: "Legacy", Condition: "manual", UnlockedAt: &earlier},
	}
	check(db.Create(&awards).Error)
	check(db.Create(&[]models.UserAchievement{
		{AchievementID: awards[0].ID, UnlockedAt: earlier},
		{AchievementID: awards[0].ID, UnlockedAt: later},
	}).Error)
	router := gin.New()
	router.GET("/achievements", GetAchievements)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest("GET", "/achievements", nil))
	var body struct {
		Data []struct {
			ID         uint       `json:"id"`
			IsUnlocked bool       `json:"is_unlocked"`
			UnlockedAt *time.Time `json:"unlocked_at"`
		}
	}
	check(json.Unmarshal(response.Body.Bytes(), &body))
	if response.Code != 200 || len(body.Data) != 2 {
		t.Fatalf("invalid cards: %s", response.Body)
	}
	if card := body.Data[0]; !card.IsUnlocked || card.UnlockedAt == nil || !card.UnlockedAt.Equal(later) {
		t.Fatalf("latest legacy unlock lost: %+v", card)
	}
	if card := body.Data[1]; card.IsUnlocked || card.UnlockedAt == nil || !card.UnlockedAt.Equal(earlier) {
		t.Fatalf("legacy catalog timestamp changed: %+v", card)
	}
}

func TestReportsPreserveHistoryPaginationAndEmptyDays(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "reports.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	connection, _ := db.DB()
	t.Cleanup(func() { connection.Close() })
	check := func(err error) {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
	}
	check(db.AutoMigrate(&models.Dish{}, &models.MealRecord{}))
	now := time.Date(2026, 10, 9, 0, 1, 0, 0, time.FixedZone("Shanghai", 8*3600))
	empty, err := dashboardSnapshot(db, now)
	check(err)
	if empty.TotalRecords != 0 || len(empty.WeekTrend) != 7 || empty.TopDishes == nil || empty.RecentRecords == nil {
		t.Fatalf("invalid empty dashboard: %+v", empty)
	}
	dishes := []models.Dish{
		{Name: "Deleted memory", ImageURL: "🍕", Images: `["not-image","/uploads/a.jpg"]`, Category: "火锅"},
		{Name: "Disabled", ImageURL: "https://example.com/b.png", Category: "日料"},
		{Name: "Active", ImageURL: "🥗", Images: "invalid"},
	}
	check(db.Create(&dishes).Error)
	check(db.Delete(&dishes[0]).Error)
	check(db.Model(&dishes[1]).Update("enabled", false).Error)
	entries := []models.MealRecord{
		{DishID: dishes[0].ID, DishName: "Historical name", MealType: "dinner", MealDate: "2026-10-09", Rating: 4},
		{DishID: dishes[1].ID, DishName: "Disabled", MealType: "lunch", MealDate: "2026-10-07", Rating: 5},
		{DishID: 999999, DishName: "Missing dish", MealType: "dinner", MealDate: "2026-10-03"},
		{DishID: dishes[2].ID, DishName: "Old meal", MealType: "dinner", MealDate: "2026-10-02"},
	}
	check(db.Create(&entries).Error)
	page, total, err := recordPage(db, map[string]string{"meal_type": "dinner", "date_from": "2026-10-03"}, 1, 1)
	check(err)
	if total != 2 || len(page) != 1 || page[0].ID != entries[0].ID || page[0].DishImageURL != "/uploads/a.jpg" || page[0].DishEmoji != "🥘" || page[0].DishName != "Historical name" {
		t.Fatalf("deleted dish/filter/page regression: %+v, total=%d", page, total)
	}
	page, total, err = recordPage(db, map[string]string{"meal_type": "dinner", "date_from": "2026-10-03"}, 2, 1)
	check(err)
	if total != 2 || len(page) != 1 || page[0].DishName != "Missing dish" || page[0].DishImageURL != "" || page[0].DishEmoji != "🍽️" {
		t.Fatalf("missing dish should retain record: %+v", page)
	}
	page, _, err = recordPage(db, nil, 99, 20)
	check(err)
	if page == nil || len(page) != 0 {
		t.Fatal("empty page must serialize as []")
	}
	report, err := dashboardSnapshot(db, now)
	check(err)
	if report.TotalDishes != 2 || report.EnabledDishes != 1 || report.DisabledDishes != 1 || report.TotalRecords != 4 || report.TodayRecords != 1 {
		t.Fatalf("dashboard counts: %+v", report)
	}
	for index, count := range []int64{1, 0, 0, 0, 1, 0, 1} {
		day := report.WeekTrend[index]
		if day.Count != count || day.Date != now.AddDate(0, 0, index-6).Format(time.DateOnly) {
			t.Fatalf("trend: %+v", report.WeekTrend)
		}
	}
	if len(report.CategoryCounts) != 1 || report.CategoryCounts[0].Category != "" || len(report.RecentRecords) != 4 {
		t.Fatalf("dashboard grouping: %+v", report)
	}
	check(connection.Close())
	if _, err := dashboardSnapshot(db, now); err == nil {
		t.Fatal("dashboard masked database failure")
	}
	if _, _, err := recordPage(db, nil, 1, 20); err == nil {
		t.Fatal("record page masked database failure")
	}
}
