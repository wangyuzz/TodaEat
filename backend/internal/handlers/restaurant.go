package handlers

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"strings"
	"todayeat/internal/database"
	"todayeat/internal/models"
	"todayeat/internal/services"
	"todayeat/internal/utils"
)

type restaurantRequest struct {
	Name      string    `json:"name" binding:"required"`
	Category  string    `json:"category"`
	Address   string    `json:"address"`
	CoverURL  string    `json:"cover_url"`
	Images    JSONArray `json:"images"`
	Tags      JSONArray `json:"tags"`
	Signature string    `json:"signature"`
	Wish      bool      `json:"wish"`
	SortOrder int       `json:"sort_order"`
	Remark    string    `json:"remark"`
}

func (r restaurantRequest) apply(m *models.Restaurant) {
	m.Name = strings.TrimSpace(r.Name)
	m.Category = r.Category
	m.Address = r.Address
	m.CoverURL = r.CoverURL
	m.Images = array(r.Images)
	m.Tags = array(r.Tags)
	m.Signature = r.Signature
	m.Wish = r.Wish
	m.SortOrder = r.SortOrder
	m.Remark = r.Remark
}
func restaurantQuery(c *gin.Context) *gorm.DB {
	q := database.DB.Model(&models.Restaurant{})
	if s := c.Query("category"); s != "" {
		q = q.Where("category = ?", s)
	}
	if s := c.Query("search"); s != "" {
		s = "%" + s + "%"
		q = q.Where("name LIKE ? OR address LIKE ? OR signature LIKE ? OR tags LIKE ?", s, s, s, s)
	}
	for _, key := range []string{"wish", "enabled"} {
		if s := c.Query(key); s != "" {
			q = q.Where(key+" = ?", boolean(s))
		}
	}
	return q
}
func attachRestaurantDisplayImages(items []models.Restaurant) error {
	var visits []models.Visit
	ids := make([]uint, 0, len(items))
	for _, r := range items {
		ids = append(ids, r.ID)
	}
	if len(ids) == 0 {
		return nil
	}
	if err := database.DB.Where("restaurant_id IN ?", ids).Order("visit_date desc, id desc").Find(&visits).Error; err != nil {
		return err
	}
	photos := map[uint]string{}
	for _, v := range visits {
		if photos[v.RestaurantID] == "" {
			for _, p := range stringArray(v.Photos) {
				if isImageURL(p) {
					photos[v.RestaurantID] = p
					break
				}
			}
		}
	}
	for i := range items {
		r := &items[i]
		r.DisplayImageURL = photos[r.ID]
		if r.DisplayImageURL == "" && isImageURL(r.CoverURL) {
			r.DisplayImageURL = r.CoverURL
		}
		if r.DisplayImageURL == "" {
			for _, p := range stringArray(r.Images) {
				if isImageURL(p) {
					r.DisplayImageURL = p
					break
				}
			}
		}
	}
	return nil
}
func GetRestaurants(c *gin.Context) {
	p, s := pagination(c)
	q := restaurantQuery(c)
	var total int64
	if dbError(c, q.Count(&total).Error, "") {
		return
	}
	items := []models.Restaurant{}
	q = sortQuery(c, q, map[string]bool{"created_at": true, "updated_at": true, "name": true, "sort_order": true})
	if dbError(c, q.Offset((p-1)*s).Limit(s).Find(&items).Error, "") {
		return
	}
	if dbError(c, attachRestaurantDisplayImages(items), "") {
		return
	}
	utils.SuccessPaginated(c, items, total, p, s)
}

type categoryCount struct {
	Category string `json:"category"`
	Count    int64  `json:"count"`
}

func GetRestaurantCategoryCounts(c *gin.Context) {
	items := []categoryCount{}
	var total int64
	if dbError(c, database.DB.Model(&models.Restaurant{}).Select("category, count(*) as count").Group("category").Order("count desc, category asc").Scan(&items).Error, "") {
		return
	}
	for _, i := range items {
		total += i.Count
	}
	utils.Success(c, gin.H{"categories": items, "total": total})
}
func GetRestaurant(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	var r models.Restaurant
	if dbError(c, database.DB.First(&r, id).Error, "餐厅不存在") {
		return
	}
	list := []models.Restaurant{r}
	if dbError(c, attachRestaurantDisplayImages(list), "") {
		return
	}
	var stats struct {
		VisitCount int64   `json:"visit_count"`
		TotalCost  int64   `json:"total_cost"`
		MyAvg      float64 `json:"my_avg"`
		HerAvg     float64 `json:"her_avg"`
	}
	if dbError(c, database.DB.Model(&models.Visit{}).Where("restaurant_id = ?", id).Select("count(*) as visit_count, coalesce(sum(cost),0) as total_cost").Scan(&stats).Error, "") {
		return
	}
	var ratings struct {
		MyAvg  float64
		HerAvg float64
	}
	if dbError(c, database.DB.Model(&models.MealRecord{}).Where("restaurant_id = ?", id).Select("coalesce(avg(nullif(my_rating,0)),0) as my_avg, coalesce(avg(nullif(her_rating,0)),0) as her_avg").Scan(&ratings).Error, "") {
		return
	}
	var last string
	if dbError(c, database.DB.Model(&models.Visit{}).Where("restaurant_id = ?", id).Select("coalesce(max(visit_date),'')").Scan(&last).Error, "") {
		return
	}
	utils.Success(c, gin.H{"restaurant": list[0], "visit_count": stats.VisitCount, "total_cost": stats.TotalCost, "my_avg": ratings.MyAvg, "her_avg": ratings.HerAvg, "last_visited": last})
}
func GetRestaurantDishes(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	items := []models.Dish{}
	if dbError(c, database.DB.Where("restaurant_id = ? AND enabled = ?", id, true).Order("sort_order asc, id asc").Find(&items).Error, "") {
		return
	}
	utils.Success(c, items)
}
func GetRestaurantVisits(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	items := []models.Visit{}
	if dbError(c, database.DB.Where("restaurant_id = ?", id).Order("visit_date desc, id desc").Find(&items).Error, "") {
		return
	}
	result, err := visitDetails(database.DB, items)
	if dbError(c, err, "") {
		return
	}
	utils.Success(c, result)
}
func ToggleRestaurantWish(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		var r models.Restaurant
		if err := tx.First(&r, id).Error; err != nil {
			return err
		}
		return tx.Model(&r).Update("wish", !r.Wish).Error
	}); dbError(c, err, "餐厅不存在") {
		return
	}
	services.QueueAutoAchievementSync()
	var r models.Restaurant
	if dbError(c, database.DB.First(&r, id).Error, "餐厅不存在") {
		return
	}
	utils.Success(c, r)
}
func CreateRestaurant(c *gin.Context) {
	var req restaurantRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		utils.BadRequest(c, "请填写有效店名和数组字段")
		return
	}
	r := models.Restaurant{Enabled: true}
	req.apply(&r)
	if dbError(c, database.DB.Create(&r).Error, "") {
		return
	}
	services.QueueAutoAchievementSync()
	utils.Success(c, r)
}
func UpdateRestaurant(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	var r models.Restaurant
	if dbError(c, database.DB.First(&r, id).Error, "餐厅不存在") {
		return
	}
	var req restaurantRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		utils.BadRequest(c, "请填写有效店名和数组字段")
		return
	}
	req.apply(&r)
	if dbError(c, database.DB.Save(&r).Error, "") {
		return
	}
	services.QueueAutoAchievementSync()
	utils.Success(c, r)
}
func DeleteRestaurant(c *gin.Context) {
	id, ok := paramID(c)
	if !ok {
		return
	}
	// Match the deployment: soft-delete the restaurant and retain its menu/history.
	err := database.DB.Delete(&models.Restaurant{}, id).Error
	if dbError(c, err, "餐厅不存在") {
		return
	}
	services.QueueAutoAchievementSync()
	utils.SuccessMsg(c, "删除成功")
}
