package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
	"todayeat/internal/database"
	"todayeat/internal/models"
)

var achievementMu sync.Mutex

// State and database work use separate locks: edits never wait for a slow sync.
// Revision checks retain edits arriving while a snapshot is being calculated.
type achievementWork struct {
	state    sync.Mutex
	runner   sync.Mutex
	timer    *time.Timer
	revision uint64
	dirty    bool
	retries  int
	sync     func() error
	delay    time.Duration
}

var queuedAchievements = achievementWork{sync: SyncAutoAchievements, delay: 300 * time.Millisecond}

func (work *achievementWork) cancelLocked() {
	if work.timer != nil {
		work.timer.Stop()
	}
	work.timer = nil
}

func (work *achievementWork) scheduleLocked(wait time.Duration) {
	work.cancelLocked()
	revision := work.revision
	work.timer = time.AfterFunc(wait, func() { work.execute(revision) })
}

func (work *achievementWork) enqueue() {
	work.state.Lock()
	defer work.state.Unlock()
	work.revision++
	work.dirty, work.retries = true, 0
	work.scheduleLocked(work.delay)
}

func (work *achievementWork) execute(revision uint64) {
	work.runner.Lock()
	defer work.runner.Unlock()
	work.state.Lock()
	if !work.dirty || work.revision != revision || work.timer == nil {
		work.state.Unlock()
		return
	}
	work.timer = nil
	work.state.Unlock()
	failure := work.sync()
	work.state.Lock()
	defer work.state.Unlock()
	if work.revision != revision {
		return
	}
	if failure == nil {
		work.dirty, work.retries = false, 0
		return
	}
	// Keep failed work pending for an explicit flush even after bounded retries.
	work.retries++
	log.Printf("成就同步失败（第 %d 次）: %v", work.retries, failure)
	if work.retries < 3 {
		work.scheduleLocked(time.Duration(work.retries) * time.Second)
	}
}

func (work *achievementWork) flush() error {
	// Acquiring runner waits for an in-flight callback without blocking enqueue.
	work.runner.Lock()
	defer work.runner.Unlock()
	for {
		work.state.Lock()
		work.cancelLocked()
		pending, revision := work.dirty, work.revision
		work.state.Unlock()
		if !pending {
			return nil
		}
		failure := work.sync()
		work.state.Lock()
		if failure != nil {
			work.cancelLocked()
			work.state.Unlock()
			return failure
		}
		if work.revision == revision {
			work.dirty, work.retries = false, 0
		}
		work.state.Unlock()
		// A newer revision requires one more snapshot before shutdown can close DB.
	}
}

func QueueAutoAchievementSync()       { queuedAchievements.enqueue() }
func FlushAutoAchievementSync() error { return queuedAchievements.flush() }

// Load aggregates and narrow photo/date projections instead of full entity tables.
func achievementMetrics(tx *gorm.DB) (map[string]int64, error) {
	metrics := make(map[string]int64)
	var visits struct{ Visit, Restaurants, Cost, Remark, Happy, Love int64 }
	if err := tx.Model(&models.Visit{}).Select(`count(*) AS visit,
 count(DISTINCT restaurant_id) AS restaurants, coalesce(sum(cost), 0) AS cost,
 coalesce(sum(CASE WHEN remark <> '' THEN 1 ELSE 0 END), 0) AS remark,
 coalesce(sum((my_mood = 'happy') + (her_mood = 'happy')), 0) AS happy,
 coalesce(sum((my_mood = 'love') + (her_mood = 'love')), 0) AS love`).Scan(&visits).Error; err != nil {
		return nil, err
	}
	metrics["visit"], metrics["restaurants"], metrics["cost"] = visits.Visit, visits.Restaurants, visits.Cost
	metrics["remark"], metrics["happy"], metrics["love"] = visits.Remark, visits.Happy, visits.Love
	var ratings struct{ Rating, HighRating int64 }
	if err := tx.Model(&models.MealRecord{}).Select(`
 coalesce(sum(CASE WHEN my_rating > 0 OR her_rating > 0 THEN 1 ELSE 0 END), 0) AS rating,
 coalesce(sum((my_rating >= 4) + (her_rating >= 4)), 0) AS high_rating`).Scan(&ratings).Error; err != nil {
		return nil, err
	}
	metrics["rating"], metrics["high_rating"] = ratings.Rating, ratings.HighRating
	for key, query := range map[string]*gorm.DB{
		"wish": tx.Model(&models.Restaurant{}).Where("wish = ?", true),
		"menu": tx.Model(&models.Dish{}),
		"category": tx.Model(&models.Visit{}).
			Joins("JOIN restaurants ON restaurants.id = visits.restaurant_id AND restaurants.deleted_at IS NULL").
			Where("restaurants.category <> ''").Distinct("restaurants.category"),
	} {
		var count int64
		if err := query.Count(&count).Error; err != nil {
			return nil, err
		}
		metrics[key] = count
	}
	for key, group := range map[string]string{"top_restaurant": "restaurant_id", "month": "substr(visit_date, 1, 7)"} {
		query := tx.Model(&models.Visit{}).Select("count(*) AS frequency").Group(group)
		if key == "month" {
			query = query.Where("length(visit_date) >= 7")
		}
		var maximum int64
		if err := tx.Table("(?) AS grouped_visits", query).Select("coalesce(max(frequency), 0)").Scan(&maximum).Error; err != nil {
			return nil, err
		}
		metrics[key] = maximum
	}
	history, failure := historyMetrics(tx)
	if failure != nil {
		return nil, failure
	}
	for name, count := range history {
		metrics[name] = count
	}
	return metrics, nil
}

type visitStreak struct {
	last             time.Time
	current, longest int64
}

func (streak *visitStreak) advance(date string) {
	day, failure := time.Parse(time.DateOnly, date)
	if failure != nil || day.Equal(streak.last) {
		return
	}
	consecutive := day.Equal(streak.last.AddDate(0, 0, 1))
	if consecutive {
		streak.current++
	} else {
		streak.current = 1
	}
	streak.longest = max(streak.longest, streak.current)
	streak.last = day
}

// One ordered cursor feeds photo counters and date streaks. Memory is bounded
// by a single visit even when the history contains years of photos.
func historyMetrics(tx *gorm.DB) (counters map[string]int64, failure error) {
	counters = map[string]int64{"photo_visits": 0, "photo": 0, "streak": 0}
	cursor, failure := tx.Model(&models.Visit{}).Select("visit_date, photos").Order("visit_date ASC").Rows()
	if failure != nil {
		return nil, failure
	}
	defer func() { failure = errors.Join(failure, cursor.Close()) }()
	var streak visitStreak
	for cursor.Next() {
		var date, photos sql.NullString
		if failure = cursor.Scan(&date, &photos); failure != nil {
			return nil, failure
		}
		streak.advance(date.String)
		var images []string
		if json.Unmarshal([]byte(photos.String), &images) == nil && len(images) > 0 {
			counters["photo_visits"]++
			counters["photo"] += int64(len(images))
		}
	}
	counters["streak"] = streak.longest
	return counters, cursor.Err()
}

func longestVisitStreak(sortedDates []string) int64 {
	var streak visitStreak
	for _, date := range sortedDates {
		streak.advance(date)
	}
	return streak.longest
}

// Catalog thresholds are evaluated against named counters; unknown codes stay locked.
func achievementEarned(code string, metrics map[string]int64) bool {
	if metric, first := strings.CutPrefix(code, "first_"); first {
		switch metric {
		case "visit", "wish", "photo", "rating", "remark":
			return metrics[metric] > 0
		default:
			return false
		}
	}
	separator := strings.LastIndexByte(code, '_')
	if separator < 1 {
		return false
	}
	value, known := metrics[code[:separator]]
	threshold, err := strconv.ParseInt(code[separator+1:], 10, 64)
	return known && err == nil && threshold > 0 && value >= threshold
}

func syncAchievements(tx *gorm.DB) error {
	metrics, err := achievementMetrics(tx)
	if err != nil {
		return err
	}
	var pending []models.Achievement
	if err := tx.Where("condition = ?", "auto").Where(`NOT EXISTS
 (SELECT 1 FROM user_achievements WHERE achievement_id = achievements.id)`).Find(&pending).Error; err != nil {
		return err
	}
	newUnlocks := make([]models.UserAchievement, 0, len(pending))
	unlockedAt := time.Now()
	for _, candidate := range pending {
		if achievementEarned(candidate.Code, metrics) {
			newUnlocks = append(newUnlocks, models.UserAchievement{AchievementID: candidate.ID, UnlockedAt: unlockedAt})
		}
	}
	if len(newUnlocks) == 0 {
		return nil
	}
	return tx.CreateInBatches(newUnlocks, 100).Error
}

func SyncAutoAchievements() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return SyncAutoAchievementsContext(ctx)
}

func SyncAutoAchievementsContext(ctx context.Context) error {
	achievementMu.Lock()
	defer achievementMu.Unlock()
	if failure := ctx.Err(); failure != nil {
		return failure
	}
	// Unlock history is append-only: deleting a visit cannot revoke an award.
	return database.DB.WithContext(ctx).Transaction(syncAchievements)
}
