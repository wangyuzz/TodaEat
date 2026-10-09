package middleware

import (
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"strings"
	"time"
	"todayeat/internal/auth"
	"todayeat/internal/config"
	"todayeat/internal/utils"
)

func sessions() auth.Sessions {
	lifetime, err := time.ParseDuration(config.C.JWTExpire)
	if err != nil || lifetime <= 0 {
		lifetime = 24 * time.Hour
	}
	return auth.Sessions{Secret: config.C.JWTSecret, Lifetime: lifetime}
}
func bearer(c *gin.Context) string {
	value, _ := strings.CutPrefix(c.GetHeader("Authorization"), "Bearer ")
	if value == c.GetHeader("Authorization") {
		return ""
	}
	return value
}

// Both permission boundaries evaluate one policy; malformed admin credentials
// still allow a valid application password at the application boundary.
func authorize(ctx *gin.Context, adminOnly bool) error {
	token := bearer(ctx)
	if token != "" && sessions().IsAdmin(token) {
		return nil
	}
	if adminOnly {
		if token == "" {
			return errors.New("未提供认证 Token")
		}
		return errors.New("Token无效或已过期")
	}
	password := ctx.GetHeader("X-App-Token")
	if password == "" {
		return errors.New("请输入应用密码")
	}
	if auth.PasswordMatches(password, config.C.AppPassword) {
		return nil
	}
	return errors.New("应用密码错误")
}

func protect(adminOnly bool) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		if denied := authorize(ctx, adminOnly); denied != nil {
			utils.Unauthorized(ctx, denied.Error())
			ctx.Abort()
			return
		}
		if err := GrantPhotoSession(ctx); err != nil {
			ctx.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		ctx.Next()
	}
}
func AuthMiddleware() gin.HandlerFunc    { return protect(true) }
func AppAuthMiddleware() gin.HandlerFunc { return protect(false) }
func GenerateToken() (string, error)     { return sessions().IssueAdmin() }
func CORSMiddleware() gin.HandlerFunc {
	headers := map[string]string{
		"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Token", "Access-Control-Max-Age": "86400",
	}
	return func(ctx *gin.Context) {
		for name, value := range headers {
			ctx.Header(name, value)
		}
		if ctx.Request.Method == http.MethodOptions {
			ctx.AbortWithStatus(http.StatusNoContent)
			return
		}
		ctx.Next()
	}
}
func CacheControlMiddleware(seconds int) gin.HandlerFunc {
	value := "public, max-age=" + strconv.Itoa(max(0, seconds)) + ", immutable"
	return func(ctx *gin.Context) {
		ctx.Header("Cache-Control", value)
		ctx.Next()
	}
}
