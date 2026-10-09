package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"todayeat/internal/models"
	"todayeat/internal/services"
)

var GetAppInfo = databaseHandler(appInfo)

func appInfo(db *gorm.DB) (any, error) {
	var name string
	failure := db.Model(&models.Setting{}).
		Where("key = ?", "app_name").Limit(1).Pluck("value", &name).Error
	if failure != nil {
		return nil, &actionFailure{http.StatusInternalServerError, "读取设置失败"}
	}
	if name == "" {
		name = "今天吃什么"
	}
	return gin.H{"app_name": name}, nil
}

func settingValue(value string) any {
	raw := strings.TrimSpace(value)
	if len(raw) != 0 && (raw[0] == '[' || raw[0] == '{') && json.Valid([]byte(raw)) {
		return json.RawMessage(raw)
	}
	return value
}

var GetSettings = databaseHandler(settingsReport)

func settingsReport(db *gorm.DB) (any, error) {
	var stored []models.Setting
	failure := db.
		Where("key NOT IN ?", []string{"admin_password", "app_password", "week_plan_cache"}).Find(&stored).Error
	visible := make(map[string]any, len(stored))
	for _, setting := range stored {
		visible[setting.Key] = settingValue(setting.Value)
	}
	return visible, failure
}

type settingsInput struct {
	Settings map[string]json.RawMessage `json:"settings" binding:"required"`
}

func normalizedSettings(input settingsInput) ([]models.Setting, error) {
	names := make([]string, 0, len(input.Settings))
	for name := range input.Settings {
		names = append(names, name)
	}
	sort.Strings(names)
	updates := make([]models.Setting, 0, len(names))
	for _, name := range names {
		raw := input.Settings[name]
		var text string
		if json.Unmarshal(raw, &text) != nil {
			text = string(raw)
		}
		switch name {
		case "app_name":
			text = strings.TrimSpace(text)
			if text == "" {
				text = "今天吃什么"
			}
		case "categories", "tastes":
			var entries []string
			if json.Unmarshal([]byte(text), &entries) != nil {
				return nil, &actionFailure{http.StatusBadRequest, "分类和口味必须是字符串数组"}
			}
		default:
			return nil, &actionFailure{http.StatusBadRequest, "不支持的设置项"}
		}
		updates = append(updates, models.Setting{Key: name, Value: text})
	}
	return updates, nil
}

var UpdateSettings = databaseJSONHandler("设置数据无效", saveSettings)

func saveSettings(db *gorm.DB, input settingsInput) (any, error) {
	updates, failure := normalizedSettings(input)
	if failure != nil {
		return nil, failure
	}
	if len(updates) > 0 {
		failure = db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "key"}}, DoUpdates: clause.AssignmentColumns([]string{"value", "updated_at"}),
		}).CreateInBatches(updates, 100).Error
	}
	return actionMessage("更新成功"), failure
}

type achievementView struct {
	models.Achievement
	IsUnlocked bool       `json:"is_unlocked"`
	EarnedAt   *time.Time `json:"-"`
}

var GetAchievements = databaseHandler(achievementCards)

func achievementCards(db *gorm.DB) (any, error) {
	if failure := services.SyncAutoAchievementsContext(db.Statement.Context); failure != nil {
		return nil, failure
	}
	cards := []achievementView{}
	failure := db.Model(&models.Achievement{}).
		Joins(`LEFT JOIN user_achievements AS earned ON earned.id =
                (SELECT max(id) FROM user_achievements WHERE achievement_id = achievements.id)`).
		Select(`achievements.*, earned.unlocked_at AS earned_at,
                (earned.id IS NOT NULL) AS is_unlocked`).Order("achievements.id ASC").Scan(&cards).Error
	for index := range cards {
		if cards[index].EarnedAt != nil {
			cards[index].UnlockedAt = cards[index].EarnedAt
		}
	}
	return cards, failure
}

// Read the dashboard in one transaction so all cards describe the same snapshot.
var GetDashboard = databaseHandler(func(db *gorm.DB) (any, error) {
	return dashboardSnapshot(db, time.Now())
})

type dashboardTrend struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}
type dashboardDish struct {
	DishID   uint   `json:"dish_id"`
	DishName string `json:"dish_name"`
	Count    int64  `json:"count"`
}
type dashboardRecord struct {
	ID       uint   `json:"id"`
	DishID   uint   `json:"dish_id"`
	DishName string `json:"dish_name"`
	MealType string `json:"meal_type"`
	MealDate string `json:"meal_date"`
	Mood     string `json:"mood"`
	Rating   int    `json:"rating"`
}
type dashboardReport struct {
	TotalDishes    int64             `json:"total_dishes"`
	EnabledDishes  int64             `json:"enabled_dishes"`
	DisabledDishes int64             `json:"disabled_dishes"`
	TodayRecords   int64             `json:"today_records"`
	TotalRecords   int64             `json:"total_records"`
	WeekTrend      []dashboardTrend  `json:"week_trend"`
	CategoryCounts []categoryCount   `json:"category_counts"`
	TopDishes      []dashboardDish   `json:"top_dishes"`
	RecentRecords  []dashboardRecord `json:"recent_records"`
}

func dashboardSnapshot(db *gorm.DB, now time.Time) (dashboardReport, error) {
	report := dashboardReport{
		WeekTrend: make([]dashboardTrend, 7), CategoryCounts: []categoryCount{},
		TopDishes: []dashboardDish{}, RecentRecords: []dashboardRecord{},
	}
	today := now.Format(time.DateOnly)
	firstDay := now.AddDate(0, 0, -6).Format(time.DateOnly)
	err := db.Transaction(func(tx *gorm.DB) error {
		var dishes struct{ Total, Enabled int64 }
		if err := tx.Model(&models.Dish{}).Select(`count(*) AS total,
            coalesce(sum(CASE WHEN enabled THEN 1 ELSE 0 END), 0) AS enabled`).Scan(&dishes).Error; err != nil {
			return err
		}
		report.TotalDishes, report.EnabledDishes = dishes.Total, dishes.Enabled
		report.DisabledDishes = dishes.Total - dishes.Enabled
		var records struct{ Total, Today int64 }
		if err := tx.Model(&models.MealRecord{}).Select(`count(*) AS total,
            coalesce(sum(CASE WHEN meal_date = ? THEN 1 ELSE 0 END), 0) AS today`, today).Scan(&records).Error; err != nil {
			return err
		}
		report.TotalRecords, report.TodayRecords = records.Total, records.Today
		var daily []dashboardTrend
		if err := tx.Model(&models.MealRecord{}).Select("meal_date AS date, count(*) AS count").
			Where("meal_date BETWEEN ? AND ?", firstDay, today).Group("meal_date").Scan(&daily).Error; err != nil {
			return err
		}
		counts := make(map[string]int64, len(daily))
		for _, day := range daily {
			counts[day.Date] = day.Count
		}
		for index := range report.WeekTrend {
			date := now.AddDate(0, 0, index-6).Format(time.DateOnly)
			report.WeekTrend[index] = dashboardTrend{Date: date, Count: counts[date]}
		}
		if err := tx.Model(&models.Dish{}).Select("category, count(*) AS count").
			Where("enabled = ?", true).Group("category").Order("count DESC").Scan(&report.CategoryCounts).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.MealRecord{}).Select("dish_id, max(dish_name) AS dish_name, count(*) AS count").
			Group("dish_id").Order("count DESC").Limit(8).Scan(&report.TopDishes).Error; err != nil {
			return err
		}
		return tx.Model(&models.MealRecord{}).Select("id,dish_id,dish_name,meal_type,meal_date,mood,rating").
			Order("meal_date DESC, id DESC").Limit(10).Find(&report.RecentRecords).Error
	})
	return report, err
}
