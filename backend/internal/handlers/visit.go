package handlers

import (
	"errors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"strings"
	"time"
	"todayeat/internal/database"
	"todayeat/internal/models"
	"todayeat/internal/services"
	"todayeat/internal/utils"
)

var errInvalidDish = errors.New("菜品不存在或不属于这家餐厅")

type visitItemRequest struct {
	DishID    uint   `json:"dish_id"`
	DishName  string `json:"dish_name"`
	MyRating  int    `json:"my_rating"`
	HerRating int    `json:"her_rating"`
}
type visitRequest struct {
	VisitDate    string             `json:"visit_date" binding:"required"`
	RestaurantID uint               `json:"restaurant_id" binding:"required"`
	Cost         int                `json:"cost"`
	MyMood       string             `json:"my_mood"`
	HerMood      string             `json:"her_mood"`
	Remark       string             `json:"remark"`
	Photos       JSONArray          `json:"photos"`
	Items        []visitItemRequest `json:"items"`
}

func (req visitRequest) validate() error {
	if _, err := time.Parse("2006-01-02", req.VisitDate); err != nil {
		return errors.New("日期格式无效")
	}
	if req.Cost < 0 {
		return errors.New("花费不能为负数")
	}
	moods := map[string]bool{"": true, "happy": true, "love": true, "full": true, "ok": true, "meh": true}
	if !moods[req.MyMood] || !moods[req.HerMood] {
		return errors.New("心情无效")
	}
	for _, i := range req.Items {
		if i.MyRating < 0 || i.MyRating > 5 || i.HerRating < 0 || i.HerRating > 5 {
			return errors.New("评分应为0到5")
		}
		if i.DishID == 0 && strings.TrimSpace(i.DishName) == "" {
			return errors.New("菜名不能为空")
		}
	}
	var photos []string
	if err := jsonStrings(array(req.Photos), &photos); err != nil {
		return err
	}
	return nil
}

type visitDetail struct {
	models.Visit
	Items []models.MealRecord `json:"items"`
}

// An explicit marshal is necessary: embedding Visit.MarshalJSON would hide Items.
func (d visitDetail) MarshalJSON() ([]byte, error) { return marshalVisitDetail(d) }
func visitDetails(tx *gorm.DB, visits []models.Visit) ([]visitDetail, error) {
	result := make([]visitDetail, 0, len(visits))
	ids := make([]uint, 0, len(visits))
	for _, v := range visits {
		ids = append(ids, v.ID)
	}
	items := []models.MealRecord{}
	if len(ids) > 0 {
		if err := tx.Where("visit_id IN ?", ids).Order("id asc").Find(&items).Error; err != nil {
			return nil, err
		}
	}
	grouped := map[uint][]models.MealRecord{}
	for _, i := range items {
		grouped[i.VisitID] = append(grouped[i.VisitID], i)
	}
	for _, v := range visits {
		records := grouped[v.ID]
		if records == nil {
			records = []models.MealRecord{}
		}
		result = append(result, visitDetail{v, records})
	}
	return result, nil
}
func saveVisit(tx *gorm.DB, v *models.Visit, req visitRequest) error {
	var restaurant models.Restaurant
	if err := tx.Unscoped().First(&restaurant, req.RestaurantID).Error; err != nil {
		return err
	}
	v.RestaurantID = restaurant.ID
	v.RestaurantName = restaurant.Name
	v.VisitDate = req.VisitDate
	v.Cost = req.Cost
	v.MyMood = req.MyMood
	v.HerMood = req.HerMood
	v.Remark = strings.TrimSpace(req.Remark)
	v.Photos = array(req.Photos)
	if err := tx.Save(v).Error; err != nil {
		return err
	}
	if err := tx.Where("visit_id = ?", v.ID).Delete(&models.MealRecord{}).Error; err != nil {
		return err
	}
	for _, i := range req.Items {
		name := strings.TrimSpace(i.DishName)
		dishID := i.DishID
		if dishID != 0 {
			var d models.Dish
			if err := tx.First(&d, dishID).Error; err != nil {
				return errInvalidDish
			}
			if d.RestaurantID != restaurant.ID {
				return errInvalidDish
			}
			if name == "" {
				name = d.Name
			}
		}
		// The deployed handler creates a menu entry for a manually entered dish.
		if dishID == 0 {
			var dish models.Dish
			err := tx.Where("restaurant_id = ? AND name = ?", restaurant.ID, name).First(&dish).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				dish = models.Dish{RestaurantID: restaurant.ID, Name: name, Enabled: true}
				if err := tx.Create(&dish).Error; err != nil {
					return err
				}
			} else if err != nil {
				return err
			}
			dishID = dish.ID
		}
		rec := models.MealRecord{VisitID: v.ID, RestaurantID: restaurant.ID, DishID: dishID, DishName: name, MealDate: v.VisitDate, MyRating: i.MyRating, HerRating: i.HerRating, Rating: i.MyRating}
		if err := tx.Create(&rec).Error; err != nil {
			return err
		}
	}
	// A completed visit fulfills the restaurant wish.
	return tx.Model(&restaurant).Update("wish", false).Error
}
func writeVisit(c *gin.Context, update bool) {
	var req visitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "打卡数据无效")
		return
	}
	if err := req.validate(); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	var v models.Visit
	if update {
		id, ok := paramID(c)
		if !ok {
			return
		}
		v.ID = id
	}
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if update {
			if err := tx.First(&v, v.ID).Error; err != nil {
				return err
			}
		}
		return saveVisit(tx, &v, req)
	})
	if err == errInvalidDish {
		utils.BadRequest(c, err.Error())
		return
	}
	if dbError(c, err, "餐厅或打卡不存在") {
		return
	}
	services.QueueAutoAchievementSync()
	result, err := visitDetails(database.DB, []models.Visit{v})
	if dbError(c, err, "") {
		return
	}
	utils.Success(c, result[0])
}
func CreateVisit(c *gin.Context) { writeVisit(c, false) }
func UpdateVisit(c *gin.Context) { writeVisit(c, true) }
func GetVisit(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	var v models.Visit
	if dbError(c, database.DB.First(&v, id).Error, "打卡不存在") {
		return
	}
	result, err := visitDetails(database.DB, []models.Visit{v})
	if dbError(c, err, "") {
		return
	}
	utils.Success(c, result[0])
}
func GetVisits(c *gin.Context) {
	p, s := pagination(c)
	if c.Query("pageSize") == "" {
		s = 30
	}
	q := database.DB.Model(&models.Visit{})
	for _, k := range []string{"restaurant_id", "visit_date"} {
		if v := c.Query(k); v != "" {
			q = q.Where(k+" = ?", v)
		}
	}
	if v := c.Query("date_from"); v != "" {
		q = q.Where("visit_date >= ?", v)
	}
	if v := c.Query("date_to"); v != "" {
		q = q.Where("visit_date <= ?", v)
	}
	var total int64
	if dbError(c, q.Count(&total).Error, "") {
		return
	}
	items := []models.Visit{}
	if dbError(c, q.Order("visit_date desc, id desc").Offset((p-1)*s).Limit(s).Find(&items).Error, "") {
		return
	}
	result, err := visitDetails(database.DB, items)
	if dbError(c, err, "") {
		return
	}
	utils.SuccessPaginated(c, result, total, p, s)
}
func DeleteVisit(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var v models.Visit
		if err := tx.First(&v, id).Error; err != nil {
			return err
		}
		if err := tx.Where("visit_id = ?", id).Delete(&models.MealRecord{}).Error; err != nil {
			return err
		}
		return tx.Delete(&v).Error
	})
	if dbError(c, err, "打卡不存在") {
		return
	}
	services.QueueAutoAchievementSync()
	utils.Success(c, nil)
}
func GetVisitStats(c *gin.Context) {
	var stats struct {
		TotalVisits         int64 `json:"total_visits"`
		DistinctRestaurants int64 `json:"distinct_restaurants"`
		TotalCost           int64 `json:"total_cost"`
	}
	if dbError(c, database.DB.Model(&models.Visit{}).Select("count(*) as total_visits, count(distinct restaurant_id) as distinct_restaurants, coalesce(sum(cost),0) as total_cost").Scan(&stats).Error, "") {
		return
	}
	var wishes int64
	if dbError(c, database.DB.Model(&models.Restaurant{}).Where("wish = ?", true).Count(&wishes).Error, "") {
		return
	}
	type popular struct {
		RestaurantID   uint   `json:"restaurant_id"`
		RestaurantName string `json:"restaurant_name"`
		Count          int64  `json:"count"`
	}
	most := []popular{}
	if dbError(c, database.DB.Model(&models.Visit{}).Select("restaurant_id, restaurant_name, count(*) as count").Group("restaurant_id").Order("count desc, restaurant_id asc").Limit(5).Scan(&most).Error, "") {
		return
	}
	var first, priciest models.Visit
	database.DB.Order("visit_date asc, id asc").Limit(1).Find(&first)
	database.DB.Order("cost desc, visit_date desc, id desc").Limit(1).Find(&priciest)
	utils.Success(c, gin.H{"total_visits": stats.TotalVisits, "distinct_restaurants": stats.DistinctRestaurants, "total_cost": stats.TotalCost, "wish_count": wishes, "most_visited": most, "first_visit": gin.H{"restaurant_name": first.RestaurantName, "visit_date": first.VisitDate}, "priciest_visit": gin.H{"restaurant_name": priciest.RestaurantName, "visit_date": priciest.VisitDate, "cost": priciest.Cost}})
}
