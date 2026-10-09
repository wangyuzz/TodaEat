package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"todayeat/internal/auth"
	"todayeat/internal/config"
	"todayeat/internal/middleware"
)

type passwordInput struct {
	Password string `json:"password" binding:"required"`
}

func passwordGrant(ctx *gin.Context, expected, rejected string, grant func() (any, error)) {
	jsonAction(ctx, "密码不能为空", func(input passwordInput) (any, error) {
		if !auth.PasswordMatches(input.Password, expected) {
			return nil, &actionFailure{http.StatusUnauthorized, rejected}
		}
		payload, failure := grant()
		if failure != nil {
			return nil, &actionFailure{http.StatusInternalServerError, "生成Token失败"}
		}
		return payload, nil
	})
}

func AppLogin(ctx *gin.Context) {
	passwordGrant(ctx, config.C.AppPassword, "应用密码错误", func() (any, error) { return gin.H{"verified": true}, nil })
}
func Login(ctx *gin.Context) {
	passwordGrant(ctx, config.C.AdminPassword, "密码错误", func() (any, error) {
		credential, failure := middleware.GenerateToken()
		return gin.H{"token": credential}, failure
	})
}
