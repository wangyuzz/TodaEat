// Reconstructed from the deployed SQLite schema and JSON consumers.
package models

import (
	"encoding/json"
	"gorm.io/gorm"
	"time"
)

type Restaurant struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	Name            string         `json:"name" gorm:"not null"`
	Category        string         `json:"category"`
	Address         string         `json:"address"`
	CoverURL        string         `json:"cover_url"`
	Images          string         `json:"images" gorm:"default:'[]'"`
	Tags            string         `json:"tags" gorm:"default:'[]'"`
	Signature       string         `json:"signature"`
	Wish            bool           `json:"wish" gorm:"default:false"`
	Enabled         bool           `json:"enabled" gorm:"default:true"`
	SortOrder       int            `json:"sort_order" gorm:"default:0"`
	Remark          string         `json:"remark"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DisplayImageURL string         `json:"display_image_url" gorm:"-"`
}

func JSONField(s string) json.RawMessage {
	if s == "" || !json.Valid([]byte(s)) {
		return json.RawMessage("[]")
	}
	return json.RawMessage(s)
}
func (r Restaurant) MarshalJSON() ([]byte, error) {
	type alias Restaurant
	return json.Marshal(struct {
		alias
		Images json.RawMessage `json:"images"`
		Tags   json.RawMessage `json:"tags"`
	}{alias(r), JSONField(r.Images), JSONField(r.Tags)})
}

type Dish struct {
	ID           uint           `json:"id" gorm:"primaryKey;index:todayeat_menu_by_restaurant_order,priority:3"`
	RestaurantID uint           `json:"restaurant_id" gorm:"index;index:todayeat_menu_by_restaurant_order,priority:1"`
	Name         string         `json:"name" gorm:"not null"`
	ImageURL     string         `json:"image_url"`
	Images       string         `json:"images" gorm:"default:'[]'"`
	VideoURL     string         `json:"video_url"`
	Category     string         `json:"category"`
	MealType     string         `json:"meal_type" gorm:"default:'all'"`
	Taste        string         `json:"taste"`
	Ingredients  string         `json:"ingredients" gorm:"default:'[]'"`
	Seasonings   string         `json:"seasonings" gorm:"default:'[]'"`
	Steps        string         `json:"steps" gorm:"default:'[]'"`
	CookTime     int            `json:"cook_time" gorm:"default:0"`
	Difficulty   string         `json:"difficulty" gorm:"default:'easy'"`
	Remark       string         `json:"remark"`
	Enabled      bool           `json:"enabled" gorm:"default:true"`
	Tags         string         `json:"tags" gorm:"default:'[]'"`
	SortOrder    int            `json:"sort_order" gorm:"default:0;index:todayeat_menu_by_restaurant_order,priority:2"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

func (d Dish) MarshalJSON() ([]byte, error) {
	type alias Dish
	return json.Marshal(struct {
		alias
		Images      json.RawMessage `json:"images"`
		Ingredients json.RawMessage `json:"ingredients"`
		Seasonings  json.RawMessage `json:"seasonings"`
		Steps       json.RawMessage `json:"steps"`
		Tags        json.RawMessage `json:"tags"`
	}{alias(d), JSONField(d.Images), JSONField(d.Ingredients), JSONField(d.Seasonings), JSONField(d.Steps), JSONField(d.Tags)})
}

type Visit struct {
	ID             uint      `json:"id" gorm:"primaryKey;index:todayeat_visits_by_date,priority:2;index:todayeat_visits_by_restaurant_date,priority:3"`
	VisitDate      string    `json:"visit_date" gorm:"not null;index;index:todayeat_visits_by_date,priority:1;index:todayeat_visits_by_restaurant_date,priority:2"`
	RestaurantID   uint      `json:"restaurant_id" gorm:"not null;index;index:todayeat_visits_by_restaurant_date,priority:1"`
	RestaurantName string    `json:"restaurant_name"`
	Cost           int       `json:"cost" gorm:"default:0"`
	MyMood         string    `json:"my_mood"`
	HerMood        string    `json:"her_mood"`
	Remark         string    `json:"remark"`
	Photos         string    `json:"photos" gorm:"default:'[]'"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (v Visit) MarshalJSON() ([]byte, error) {
	type alias Visit
	return json.Marshal(struct {
		alias
		Photos json.RawMessage `json:"photos"`
	}{alias(v), JSONField(v.Photos)})
}

type MealRecord struct {
	ID           uint      `json:"id" gorm:"primaryKey;index:todayeat_visit_items_by_id,priority:2"`
	VisitID      uint      `json:"visit_id" gorm:"index;index:todayeat_visit_items_by_id,priority:1"`
	RestaurantID uint      `json:"restaurant_id" gorm:"index"`
	MyRating     int       `json:"my_rating" gorm:"default:0"`
	HerRating    int       `json:"her_rating" gorm:"default:0"`
	DishID       uint      `json:"dish_id" gorm:"not null;index"`
	DishName     string    `json:"dish_name" gorm:"not null"`
	MealType     string    `json:"meal_type" gorm:"not null;index:todayeat_records_by_type_date,priority:1"`
	MealDate     string    `json:"meal_date" gorm:"not null;index;index:todayeat_records_by_date,priority:1;index:todayeat_records_by_type_date,priority:2"`
	Rating       int       `json:"rating" gorm:"default:0"`
	Remark       string    `json:"remark"`
	Mood         string    `json:"mood"`
	Photo        string    `json:"photo"`
	CreatedAt    time.Time `json:"created_at" gorm:"index:todayeat_records_by_date,priority:2;index:todayeat_records_by_type_date,priority:3"`
}
type Achievement struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	Code        string     `json:"code" gorm:"not null;unique"`
	Name        string     `json:"name" gorm:"not null"`
	Description string     `json:"description" gorm:"not null"`
	Icon        string     `json:"icon"`
	Condition   string     `json:"condition" gorm:"not null"`
	UnlockedAt  *time.Time `json:"unlocked_at"`
	CreatedAt   time.Time  `json:"created_at"`
}
type UserAchievement struct {
	ID            uint      `json:"id" gorm:"primaryKey;index:todayeat_latest_award_unlock,priority:2"`
	AchievementID uint      `json:"achievement_id" gorm:"not null;index;index:todayeat_latest_award_unlock,priority:1"`
	UnlockedAt    time.Time `json:"unlocked_at"`
}
type Setting struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Key       string    `json:"key" gorm:"not null;unique"`
	Value     string    `json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
