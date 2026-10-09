package handlers

import (
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
	"strconv"
	"strings"
	"todayeat/internal/database"
	"todayeat/internal/utils"
)

// Business operations return data or a classified failure; HTTP encoding stays
// in one place, so validation and persistence cannot emit conflicting replies.
type actionFailure struct {
	Status  int
	Message string
}

func (failure *actionFailure) Error() string { return failure.Message }

type actionMessage string

func runAction(ctx *gin.Context, operation func() (any, error)) {
	payload, failure := operation()
	if failure != nil {
		var classified *actionFailure
		if errors.As(failure, &classified) {
			utils.Error(ctx, classified.Status, classified.Status*100, classified.Message)
		} else {
			utils.InternalError(ctx, "数据库操作失败")
		}
	} else if message, ok := payload.(actionMessage); ok {
		utils.SuccessMsg(ctx, string(message))
	} else {
		utils.Success(ctx, payload)
	}
}

func jsonAction[T any](ctx *gin.Context, invalid string, operation func(T) (any, error)) {
	runAction(ctx, func() (any, error) {
		var input T
		if ctx.ShouldBindJSON(&input) != nil {
			return nil, &actionFailure{http.StatusBadRequest, invalid}
		}
		return operation(input)
	})
}

// Adapters pass a request-scoped database into pure operations. Domain code
// does not need a Gin context or a global database to read or update settings.
func databaseHandler(operation func(*gorm.DB) (any, error)) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		runAction(ctx, func() (any, error) {
			return operation(database.DB.WithContext(ctx.Request.Context()))
		})
	}
}

func databaseJSONHandler[T any](invalid string, operation func(*gorm.DB, T) (any, error)) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		jsonAction(ctx, invalid, func(input T) (any, error) {
			return operation(database.DB.WithContext(ctx.Request.Context()), input)
		})
	}
}

func jsonHandler[T any](invalid string, operation func(T) (any, error)) gin.HandlerFunc {
	return func(ctx *gin.Context) { jsonAction(ctx, invalid, operation) }
}

func classifyDatabaseError(failure error, missing string) error {
	if errors.Is(failure, gorm.ErrRecordNotFound) {
		return &actionFailure{http.StatusNotFound, missing}
	}
	return failure
}

func actionID(ctx *gin.Context) (uint, error) {
	identifier, failure := strconv.ParseUint(ctx.Param("id"), 10, strconv.IntSize)
	if failure != nil || identifier == 0 {
		return 0, &actionFailure{http.StatusBadRequest, "ID无效"}
	}
	return uint(identifier), nil
}

func pagination(c *gin.Context) (int, int) {
	p, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	s, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	if p < 1 {
		p = 1
	}
	if s < 1 {
		s = 20
	}
	if s > 100 {
		s = 100
	}
	return p, s
}
func boolean(s string) bool { return s == "true" || s == "1" }
func sortQuery(c *gin.Context, q *gorm.DB, allowed map[string]bool) *gorm.DB {
	sort := c.DefaultQuery("sort", "created_at")
	if sort == "random" {
		return q.Order("RANDOM()")
	}
	if !allowed[sort] {
		sort = "created_at"
	}
	order := strings.ToLower(c.DefaultQuery("order", "desc"))
	if order != "asc" {
		order = "desc"
	}
	return q.Order(sort + " " + order).Order("id desc")
}

// JSONArray accepts both original stringified arrays and native JSON arrays.
type JSONArray string

func (a *JSONArray) UnmarshalJSON(b []byte) error {
	var s string
	if json.Unmarshal(b, &s) == nil {
		b = []byte(s)
	}
	if string(b) == "null" || len(b) == 0 {
		*a = "[]"
		return nil
	}
	var values []json.RawMessage
	if err := json.Unmarshal(b, &values); err != nil {
		return errors.New("需要JSON数组")
	}
	*a = JSONArray(b)
	return nil
}
func array(s JSONArray) string {
	if s == "" {
		return "[]"
	}
	return string(s)
}
func stringArray(s string) []string {
	result := []string{}
	_ = json.Unmarshal([]byte(s), &result)
	return result
}
func dbError(c *gin.Context, err error, message string) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		utils.NotFound(c, message)
	} else {
		utils.InternalError(c, "数据库操作失败")
	}
	return true
}
func paramID(c *gin.Context) (uint, bool) {
	n, e := strconv.ParseUint(c.Param("id"), 10, 64)
	if e != nil || n == 0 {
		utils.BadRequest(c, "ID无效")
		return 0, false
	}
	return uint(n), true
}
