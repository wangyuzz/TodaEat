package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"todayeat/internal/database"
	"todayeat/internal/models"
	"todayeat/internal/services"
	"todayeat/internal/utils"
)

func dishQuery(ctx *gin.Context) *gorm.DB {
	query := database.DB.WithContext(ctx.Request.Context()).Model(&models.Dish{})
	for _, field := range []string{"restaurant_id", "category", "difficulty"} {
		if value := ctx.Query(field); value != "" {
			query = query.Where(field+" = ?", value)
		}
	}
	for field, parameter := range map[string]string{"name": "search", "taste": "taste"} {
		if value := ctx.Query(parameter); value != "" {
			query = query.Where(field+" LIKE ?", "%"+value+"%")
		}
	}
	if value := ctx.Query("enabled"); value != "" {
		query = query.Where("enabled = ?", boolean(value))
	}
	if value := ctx.Query("meal_type"); value != "" {
		query = query.Where("meal_type IN ?", []string{value, "all"})
	}
	return query
}

func GetDishes(ctx *gin.Context) {
	runAction(ctx, func() (any, error) {
		page, size := pagination(ctx)
		if requested, parseErr := strconv.Atoi(ctx.DefaultQuery("pageSize", "20")); parseErr != nil || requested < 1 || requested > 100 {
			size = 20
		}
		selection := dishQuery(ctx)
		var total int64
		if failure := selection.Count(&total).Error; failure != nil {
			return nil, failure
		}
		if ctx.Query("sort") == "random" {
			selection = selection.Order("RANDOM()").Limit(size)
		} else {
			column := ctx.DefaultQuery("sort", "created_at")
			switch column {
			case "created_at", "name", "cook_time", "difficulty", "sort_order":
			default:
				column = "created_at"
			}
			direction := "desc"
			if ctx.Query("order") == "asc" {
				direction = "asc"
			}
			selection = selection.Order(column + " " + direction).Offset((page - 1) * size).Limit(size)
		}
		var menu []models.Dish
		failure := selection.Find(&menu).Error
		return utils.PaginatedData{Items: menu, Total: total, Page: page, PageSize: size}, failure
	})
}

func loadDish(ctx *gin.Context, tx *gorm.DB) (models.Dish, error) {
	identifier, parseErr := actionID(ctx)
	if parseErr != nil {
		return models.Dish{}, parseErr
	}
	var dish models.Dish
	failure := tx.First(&dish, identifier).Error
	return dish, classifyDatabaseError(failure, "菜品不存在")
}

func GetDish(ctx *gin.Context) {
	runAction(ctx, func() (any, error) { return loadDish(ctx, database.DB.WithContext(ctx.Request.Context())) })
}

// The input embeds editable content separately from server-managed identity.
type dishContent struct {
	RestaurantID uint   `json:"restaurant_id"`
	Name         string `json:"name" binding:"required"`
	ImageURL     string `json:"image_url"`
	Images       string `json:"images"`
	VideoURL     string `json:"video_url"`
	Category     string `json:"category"`
	MealType     string `json:"meal_type"`
	Taste        string `json:"taste"`
	Ingredients  string `json:"ingredients"`
	Seasonings   string `json:"seasonings"`
	Steps        string `json:"steps"`
	CookTime     int    `json:"cook_time"`
	Difficulty   string `json:"difficulty"`
	Remark       string `json:"remark"`
	Tags         string `json:"tags"`
	SortOrder    int    `json:"sort_order"`
}

func (input dishContent) update(dish *models.Dish) {
	dish.RestaurantID, dish.Name = input.RestaurantID, input.Name
	dish.ImageURL, dish.Images, dish.VideoURL = input.ImageURL, input.Images, input.VideoURL
	dish.Category, dish.MealType, dish.Taste = input.Category, input.MealType, input.Taste
	dish.Ingredients, dish.Seasonings, dish.Steps = input.Ingredients, input.Seasonings, input.Steps
	dish.CookTime, dish.Difficulty = input.CookTime, input.Difficulty
	dish.Remark, dish.Tags, dish.SortOrder = input.Remark, input.Tags, input.SortOrder
	for target, fallback := range map[*string]string{&dish.MealType: "all", &dish.Difficulty: "easy"} {
		if *target == "" {
			*target = fallback
		}
	}
	for _, collection := range []*string{&dish.Images, &dish.Ingredients, &dish.Seasonings, &dish.Steps, &dish.Tags} {
		if *collection == "" {
			*collection = "[]"
		}
	}
}

func CreateDish(ctx *gin.Context) {
	jsonAction(ctx, "菜名不能为空", func(input dishContent) (any, error) {
		dish := models.Dish{Enabled: true}
		input.update(&dish)
		if failure := database.DB.WithContext(ctx.Request.Context()).Create(&dish).Error; failure != nil {
			return nil, &actionFailure{http.StatusInternalServerError, "创建菜品失败"}
		}
		services.QueueAutoAchievementSync()
		return dish, nil
	})
}

func UpdateDish(ctx *gin.Context) {
	// Keep lookup-before-body validation and make the entire edit atomic.
	runAction(ctx, func() (any, error) {
		var edited models.Dish
		failure := database.DB.WithContext(ctx.Request.Context()).Transaction(func(tx *gorm.DB) error {
			current, lookupErr := loadDish(ctx, tx)
			if lookupErr != nil {
				return lookupErr
			}
			var input dishContent
			if ctx.ShouldBindJSON(&input) != nil {
				return &actionFailure{http.StatusBadRequest, "请求数据无效"}
			}
			input.update(&current)
			if saveErr := tx.Save(&current).Error; saveErr != nil {
				return &actionFailure{http.StatusInternalServerError, "更新菜品失败"}
			}
			edited = current
			return nil
		})
		if failure == nil {
			services.QueueAutoAchievementSync()
		}
		return edited, failure
	})
}

func DeleteDish(ctx *gin.Context) {
	runAction(ctx, func() (any, error) {
		identifier, parseErr := actionID(ctx)
		if parseErr != nil {
			return nil, parseErr
		}
		failure := database.DB.WithContext(ctx.Request.Context()).Delete(&models.Dish{}, identifier).Error
		if failure == nil {
			services.QueueAutoAchievementSync()
		}
		return actionMessage("删除成功"), classifyDatabaseError(failure, "菜品不存在")
	})
}

func modifyDish(ctx *gin.Context, mutation func(*gorm.DB, *models.Dish) error) {
	runAction(ctx, func() (any, error) {
		var result models.Dish
		failure := database.DB.WithContext(ctx.Request.Context()).Transaction(func(tx *gorm.DB) error {
			dish, lookupErr := loadDish(ctx, tx)
			if lookupErr != nil {
				return lookupErr
			}
			if changeErr := mutation(tx, &dish); changeErr != nil {
				return changeErr
			}
			result = dish
			return nil
		})
		if failure == nil {
			services.QueueAutoAchievementSync()
		}
		return result, classifyDatabaseError(failure, "菜品不存在")
	})
}

func ToggleDish(ctx *gin.Context) {
	modifyDish(ctx, func(tx *gorm.DB, dish *models.Dish) error {
		failure := tx.Model(dish).Update("enabled", gorm.Expr("NOT enabled")).Error
		if failure != nil {
			return failure
		}
		return tx.First(dish, dish.ID).Error
	})
}

func CloneDish(ctx *gin.Context) {
	modifyDish(ctx, func(tx *gorm.DB, dish *models.Dish) error {
		dish.ID, dish.Name = 0, dish.Name+" (副本)"
		return tx.Create(dish).Error
	})
}

func GetDishCategoryCounts(ctx *gin.Context) {
	runAction(ctx, func() (any, error) {
		var groups []categoryCount
		failure := database.DB.WithContext(ctx.Request.Context()).Model(&models.Dish{}).Where("enabled = ?", true).
			Select("category, count(*) as count").Group("category").Order("count DESC").Find(&groups).Error
		var count int64
		for _, group := range groups {
			count += group.Count
		}
		return gin.H{"total": count, "categories": groups}, failure
	})
}

type dishBatch struct {
	IDs      []uint `json:"ids"`
	Enabled  bool   `json:"enabled"`
	Category string `json:"category"`
}

func batchDishes(ctx *gin.Context, requiredCategory bool, message string, persist func(*gorm.DB, dishBatch) error) {
	invalid := "请选择菜品"
	if requiredCategory {
		invalid = "请选择菜品并指定分类"
	}
	jsonAction(ctx, invalid, func(input dishBatch) (any, error) {
		if len(input.IDs) == 0 || (requiredCategory && input.Category == "") {
			return nil, &actionFailure{http.StatusBadRequest, invalid}
		}
		query := database.DB.WithContext(ctx.Request.Context()).Model(&models.Dish{}).Where("id IN ?", input.IDs)
		failure := persist(query, input)
		if failure == nil && !requiredCategory {
			services.QueueAutoAchievementSync()
		}
		return actionMessage(message), failure
	})
}
func BatchToggleDishes(ctx *gin.Context) {
	batchDishes(ctx, false, "批量操作成功", func(query *gorm.DB, input dishBatch) error { return query.Update("enabled", input.Enabled).Error })
}
func BatchDeleteDishes(ctx *gin.Context) {
	batchDishes(ctx, false, "批量删除成功", func(query *gorm.DB, input dishBatch) error { return query.Delete(&models.Dish{}).Error })
}
func BatchUpdateCategory(ctx *gin.Context) {
	batchDishes(ctx, true, "批量修改分类成功", func(query *gorm.DB, input dishBatch) error { return query.Update("category", input.Category).Error })
}
