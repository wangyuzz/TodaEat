// Default catalog recovered by starting the original binary with an empty DB.
package dishes

import (
	_ "embed"
	"encoding/json"
	"todayeat/internal/models"
)

//go:embed seeds.json
var catalog []byte

type RestaurantSeed struct {
	Restaurant models.Restaurant `json:"restaurant"`
	Dishes     []models.Dish     `json:"dishes"`
}

func DefaultRestaurantSeeds() ([]RestaurantSeed, error) {
	var seeds []RestaurantSeed
	err := json.Unmarshal(catalog, &seeds)
	return seeds, err
}
