package services

import (
	"errors"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"todayeat/internal/models"
)

func TestQueuedSyncRetainsFailedWorkAndEditsDuringSync(t *testing.T) {
	calls := 0
	work := achievementWork{delay: time.Hour}
	work.sync = func() error {
		calls++
		if calls == 1 {
			return errors.New("temporary failure")
		}
		return nil
	}
	work.enqueue()
	if work.flush() == nil {
		t.Fatal("flush swallowed a failure")
	}
	if !work.dirty || work.timer != nil {
		t.Fatal("failed work was lost or left a timer running")
	}
	if failure := work.flush(); failure != nil || work.dirty || calls != 2 {
		t.Fatalf("retry failed: %v", failure)
	}
	work.sync = func() error {
		calls++
		if calls == 3 {
			work.enqueue()
		}
		return nil
	}
	work.enqueue()
	if failure := work.flush(); failure != nil || calls != 4 || work.dirty {
		t.Fatalf("edit arriving during sync was lost: calls=%d error=%v", calls, failure)
	}
}

func TestAchievementAggregatesAndPermanentUnlocks(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "achievements.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	connection, _ := db.DB()
	t.Cleanup(func() { connection.Close() })
	if err := db.AutoMigrate(&models.Visit{}, &models.Restaurant{}, &models.Dish{}, &models.MealRecord{}, &models.Achievement{}, &models.UserAchievement{}); err != nil {
		t.Fatal(err)
	}
	check := func(err error) {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
	}
	empty, err := achievementMetrics(db)
	check(err)
	for key, value := range empty {
		if value != 0 {
			t.Fatalf("empty %s = %d", key, value)
		}
	}
	restaurants := []models.Restaurant{
		{Name: "A", Category: "火锅", Wish: true},
		{Name: "B", Category: "日料", Wish: true},
		{Name: "Deleted", Category: "西餐", Wish: true},
	}
	check(db.Create(&restaurants).Error)
	check(db.Delete(&restaurants[2]).Error)
	dishes := []models.Dish{{Name: "Active"}, {Name: "Disabled"}, {Name: "Deleted"}}
	check(db.Create(&dishes).Error)
	check(db.Model(&dishes[1]).Update("enabled", false).Error)
	check(db.Delete(&dishes[2]).Error)
	visits := make([]models.Visit, 10)
	start := time.Date(2026, 9, 28, 0, 0, 0, 0, time.UTC)
	for index := range visits {
		visits[index] = models.Visit{
			VisitDate:    start.AddDate(0, 0, index%7).Format(time.DateOnly),
			RestaurantID: restaurants[index%3].ID, Cost: 100,
			MyMood: "happy", HerMood: "love", Photos: `["a.jpg","b.jpg"]`, Remark: "memory",
		}
	}
	check(db.Create(&visits).Error)
	records := []models.MealRecord{
		{DishID: dishes[0].ID, DishName: "A", MyRating: 4, HerRating: 5},
		{DishID: dishes[1].ID, DishName: "B", MyRating: 0, HerRating: 3},
		{DishID: dishes[2].ID, DishName: "C", MyRating: 0, HerRating: 0},
	}
	check(db.Create(&records).Error)
	metrics, err := achievementMetrics(db)
	check(err)
	expected := map[string]int64{
		"visit": 10, "restaurants": 3, "cost": 1000, "remark": 10, "happy": 10, "love": 10,
		"rating": 2, "high_rating": 2, "wish": 2, "menu": 2, "category": 2,
		"top_restaurant": 4, "month": 6, "photo_visits": 10, "photo": 20, "streak": 7,
	}
	if !reflect.DeepEqual(metrics, expected) {
		t.Fatalf("aggregates: got %#v, want %#v", metrics, expected)
	}
	awards := []models.Achievement{
		{Code: "first_visit", Name: "First", Description: "First", Condition: "auto"},
		{Code: "streak_7", Name: "Week", Description: "Week", Condition: "auto"},
		{Code: "high_rating_10", Name: "Ratings", Description: "Ratings", Condition: "auto"},
		{Code: "visit_3", Name: "Manual", Description: "Manual", Condition: "manual"},
		{Code: "unknown_1", Name: "Unknown", Description: "Unknown", Condition: "auto"},
	}
	check(db.Create(&awards).Error)
	check(db.Transaction(syncAchievements))
	check(db.Transaction(syncAchievements))
	var unlocked []models.UserAchievement
	check(db.Order("achievement_id").Find(&unlocked).Error)
	if len(unlocked) != 2 || unlocked[0].AchievementID != awards[0].ID || unlocked[1].AchievementID != awards[1].ID {
		t.Fatalf("unexpected unlocks or duplicate sync: %+v", unlocked)
	}
	check(db.Where("id > 0").Delete(&models.Visit{}).Error)
	check(db.Transaction(syncAchievements))
	var retained []models.UserAchievement
	check(db.Order("achievement_id").Find(&retained).Error)
	if !reflect.DeepEqual(unlocked, retained) {
		t.Fatal("deleting visits changed unlock history")
	}
	check(db.Migrator().DropTable(&models.MealRecord{}))
	if db.Transaction(syncAchievements) == nil {
		t.Fatal("missing source table must fail the sync")
	}
}

func TestStreakSkipsMalformedDatesAndResetsAcrossGaps(t *testing.T) {
	if got := longestVisitStreak([]string{"2026-09-30", "2026-10-01", "2026-10-03", "2026-10-04", "2026-10-05", "invalid"}); got != 3 {
		t.Fatalf("streak = %d", got)
	}
	for _, code := range []string{"first_unknown", "streak_0", "streak_bad", "streak_-1", "missing_1"} {
		if achievementEarned(code, map[string]int64{"streak": 7}) {
			t.Fatalf("invalid code unlocked: %s", code)
		}
	}
}
