package utils

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"net/http"
)

// ProjectJSON keeps API contracts explicit while views reuse typed model fields.
// RawMessage preserves integer precision and the model's time serialization.
func ProjectJSON(value any, fields []string, extras map[string]any) ([]byte, error) {
	encoded, failure := json.Marshal(value)
	if failure != nil {
		return nil, failure
	}
	var source map[string]json.RawMessage
	if failure = json.Unmarshal(encoded, &source); failure != nil {
		return nil, failure
	}
	projection := make(map[string]json.RawMessage, len(fields)+len(extras))
	for _, name := range fields {
		if raw, present := source[name]; present {
			projection[name] = raw
		}
	}
	for name, value := range extras {
		raw, failure := json.Marshal(value)
		if failure != nil {
			return nil, failure
		}
		projection[name] = raw
	}
	return json.Marshal(projection)
}

type Response struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

func reply(ctx *gin.Context, status, code int, message string, payload any) {
	ctx.JSON(status, Response{Code: code, Message: message, Data: payload})
}
func Success(ctx *gin.Context, payload any)       { reply(ctx, http.StatusOK, 0, "success", payload) }
func SuccessMsg(ctx *gin.Context, message string) { reply(ctx, http.StatusOK, 0, message, nil) }
func Error(ctx *gin.Context, status, code int, message string) {
	reply(ctx, status, code, message, nil)
}

// Retain the JSON error codes consumed by the existing frontend.
func requestError(ctx *gin.Context, status int, message string) {
	Error(ctx, status, status*100, message)
}
func BadRequest(ctx *gin.Context, message string) { requestError(ctx, http.StatusBadRequest, message) }
func Unauthorized(ctx *gin.Context, message string) {
	requestError(ctx, http.StatusUnauthorized, message)
}
func Forbidden(ctx *gin.Context, message string) { requestError(ctx, http.StatusForbidden, message) }
func NotFound(ctx *gin.Context, message string)  { requestError(ctx, http.StatusNotFound, message) }
func InternalError(ctx *gin.Context, message string) {
	requestError(ctx, http.StatusInternalServerError, message)
}

type PaginatedData struct {
	Items    any   `json:"items"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
}

func SuccessPaginated(ctx *gin.Context, items any, total int64, page, size int) {
	Success(ctx, PaginatedData{Items: items, Total: total, Page: page, PageSize: size})
}
