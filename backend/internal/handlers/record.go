package handlers

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/url"
	"path"
	"strings"
	"todayeat/internal/database"
	"todayeat/internal/models"
	"todayeat/internal/services"
	"todayeat/internal/utils"
)

func isImageURL(candidate string) bool {
	parsed, failure := url.Parse(candidate)
	if failure != nil {
		return false
	}
	if strings.HasPrefix(candidate, "/uploads/") || parsed.Scheme == "http" || parsed.Scheme == "https" {
		return true
	}
	switch strings.ToLower(path.Ext(parsed.Path)) {
	case ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg":
		return true
	default:
		return false
	}
}

type recordResponse struct {
	models.MealRecord
	DishImageURL string
	DishEmoji    string
}

func (record recordResponse) MarshalJSON() ([]byte, error) {
	return utils.ProjectJSON(record.MealRecord, []string{
		"id", "dish_id", "dish_name", "meal_type", "meal_date", "rating", "remark", "mood", "photo", "created_at",
	}, map[string]any{"dish_image_url": record.DishImageURL, "dish_emoji": record.DishEmoji})
}

// Categories and fallbacks measured against the deployed application.
var recordCategoryEmojis = map[string]string{
	"火锅": "🥘", "日料": "🍣", "烧烤": "🍢", "西餐": "🍝", "中餐": "🍜",
	"快餐": "🍔", "甜品": "🍰", "酒馆": "🍻", "小吃": "🥟", "其他": "🍽️",
}

type recordRow struct {
	Record   recordResponse `gorm:"embedded"`
	Images   string
	Category string
}

// Resolve each record and its historical dish in the same query. Deleted dishes
// are deliberately included, so old memories retain their image and category.
func recordPage(db *gorm.DB, filters map[string]string, page, size int) ([]recordResponse, int64, error) {
	query := db.Model(&models.MealRecord{})
	for parameter, predicate := range map[string]string{
		"meal_type": "meal_records.meal_type = ?",
		"date_from": "meal_records.meal_date >= ?",
		"date_to":   "meal_records.meal_date <= ?",
	} {
		if value := filters[parameter]; value != "" {
			query = query.Where(predicate, value)
		}
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []recordRow
	err := query.Joins("LEFT JOIN dishes ON dishes.id = meal_records.dish_id").
		Select(`meal_records.*, dishes.image_url AS dish_image_url, dishes.images AS images,
            dishes.category AS category`).
		Order("meal_records.meal_date DESC, meal_records.created_at DESC").
		Offset((page - 1) * size).Limit(size).Scan(&rows).Error
	if err != nil {
		return nil, 0, err
	}
	result := make([]recordResponse, len(rows))
	for index, row := range rows {
		display := row.Record
		image, emoji := recordArtwork(display.DishImageURL, row.Images, row.Category)
		display.DishImageURL, display.DishEmoji = image, emoji
		result[index] = display
	}
	return result, total, nil
}

func recordArtwork(primary, images, category string) (string, string) {
	emoji := recordCategoryEmojis[category]
	if emoji == "" {
		emoji = "🍽️"
		if primary != "" && !isImageURL(primary) {
			emoji = primary
		}
	}
	if isImageURL(primary) {
		return primary, emoji
	}
	for _, candidate := range stringArray(images) {
		if isImageURL(candidate) {
			return candidate, emoji
		}
	}
	return "", emoji
}

func GetRecords(ctx *gin.Context) {
	runAction(ctx, func() (any, error) {
		page, size := pagination(ctx)
		filters := map[string]string{
			"meal_type": ctx.Query("meal_type"), "date_from": ctx.Query("date_from"), "date_to": ctx.Query("date_to"),
		}
		records, total, failure := recordPage(database.DB.WithContext(ctx.Request.Context()), filters, page, size)
		return utils.PaginatedData{Items: records, Total: total, Page: page, PageSize: size}, failure
	})
}

func DeleteRecord(ctx *gin.Context) {
	runAction(ctx, func() (any, error) {
		identifier, failure := actionID(ctx)
		if failure != nil {
			return nil, failure
		}
		deletion := database.DB.WithContext(ctx.Request.Context()).Delete(&models.MealRecord{}, identifier)
		if deletion.Error != nil {
			return nil, deletion.Error
		}
		if deletion.RowsAffected == 0 {
			return nil, classifyDatabaseError(gorm.ErrRecordNotFound, "记录不存在")
		}
		services.QueueAutoAchievementSync()
		return actionMessage("删除成功"), nil
	})
}

type albumItem struct {
	VisitID   uint   `json:"-"`
	DishID    uint   `json:"dish_id"`
	DishName  string `json:"dish_name"`
	MyRating  int    `json:"my_rating"`
	HerRating int    `json:"her_rating"`
}
type albumDay struct {
	VisitID        uint        `json:"visit_id"`
	VisitDate      string      `json:"visit_date"`
	RestaurantID   uint        `json:"restaurant_id"`
	RestaurantName string      `json:"restaurant_name"`
	Cost           int         `json:"cost"`
	MyMood         string      `json:"my_mood"`
	HerMood        string      `json:"her_mood"`
	Remark         string      `json:"remark"`
	Photos         []string    `json:"photos"`
	PhotoCount     int         `json:"photo_count"`
	Items          []albumItem `json:"items"`
}
type albumReport struct {
	Days        []albumDay `json:"days"`
	TotalDays   int        `json:"total_days"`
	TotalPhotos int        `json:"total_photos"`
}

func photoAlbum(db *gorm.DB) (albumReport, error) {
	report := albumReport{Days: []albumDay{}}
	failure := db.Transaction(func(tx *gorm.DB) error {
		var visits []models.Visit
		query := tx.Select("id, visit_date, restaurant_id, restaurant_name, cost, my_mood, her_mood, remark, photos").
			Where("photos IS NOT NULL AND photos NOT IN ?", []string{"", "[]", "null"}).Order("visit_date DESC, id DESC")
		if failure := query.Find(&visits).Error; failure != nil {
			return failure
		}
		identifiers := make([]uint, 0, len(visits))
		for _, visit := range visits {
			pictures := stringArray(visit.Photos)
			if len(pictures) != 0 {
				report.Days = append(report.Days, albumDay{
					VisitID: visit.ID, VisitDate: visit.VisitDate, RestaurantID: visit.RestaurantID, RestaurantName: visit.RestaurantName,
					Cost: visit.Cost, MyMood: visit.MyMood, HerMood: visit.HerMood, Remark: visit.Remark,
					Photos: pictures, PhotoCount: len(pictures), Items: []albumItem{},
				})
				identifiers = append(identifiers, visit.ID)
				report.TotalPhotos += len(pictures)
			}
		}
		if len(identifiers) == 0 {
			return nil
		}
		var items []albumItem
		if failure := tx.Model(&models.MealRecord{}).Select("visit_id, dish_id, dish_name, my_rating, her_rating").
			Where("visit_id IN ?", identifiers).Order("id ASC").Scan(&items).Error; failure != nil {
			return failure
		}
		grouped := make(map[uint][]albumItem)
		for _, item := range items {
			grouped[item.VisitID] = append(grouped[item.VisitID], item)
		}
		for index := range report.Days {
			if dishes := grouped[report.Days[index].VisitID]; len(dishes) > 0 {
				report.Days[index].Items = dishes
			}
		}
		return nil
	})
	report.TotalDays = len(report.Days)
	return report, failure
}

func GetPhotoWall(ctx *gin.Context) {
	runAction(ctx, func() (any, error) { return photoAlbum(database.DB.WithContext(ctx.Request.Context())) })
}
