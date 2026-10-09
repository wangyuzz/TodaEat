package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"todayeat/internal/auth"
	"todayeat/internal/config"
	"todayeat/internal/utils"
)

const PhotoSessionCookie = "todayeat_photo_session"

func photoSessions() auth.Sessions {
	options := sessions()
	if options.Secret == "" {
		return options
	}
	// Separate photo signing from administrator signing, and revoke photo
	// sessions whenever either password or the configured signing key changes.
	key := hmac.New(sha256.New, []byte(options.Secret))
	for _, part := range []string{"todayeat-photo-session-v1", config.C.AppPassword, config.C.AdminPassword} {
		key.Write([]byte(part))
		key.Write([]byte{0})
	}
	options.Secret = hex.EncodeToString(key.Sum(nil))
	return options
}

func hasPhotoSession(ctx *gin.Context) bool {
	raw, err := ctx.Cookie(PhotoSessionCookie)
	return err == nil && photoSessions().IsPhoto(raw)
}

// GrantPhotoSession keeps browser image requests working without exposing the
// application password or granting cookie-based access to any API operation.
func GrantPhotoSession(ctx *gin.Context) error {
	if hasPhotoSession(ctx) {
		return nil
	}
	options := photoSessions()
	raw, err := options.IssuePhoto()
	if err != nil {
		return err
	}
	http.SetCookie(ctx.Writer, &http.Cookie{
		Name: PhotoSessionCookie, Value: raw, Path: "/uploads",
		HttpOnly: true, SameSite: http.SameSiteStrictMode,
		Secure: ctx.Request.TLS != nil || ctx.GetHeader("X-Forwarded-Proto") == "https",
		MaxAge: max(1, int(options.Lifetime/time.Second)), Expires: time.Now().Add(options.Lifetime),
	})
	return nil
}

func PhotoAuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		ctx.Header("Cache-Control", "private, no-store")
		ctx.Header("Vary", "Cookie, Authorization, X-App-Token")
		if !hasPhotoSession(ctx) && authorize(ctx, false) != nil {
			utils.Unauthorized(ctx, "请登录后查看照片")
			ctx.Abort()
			return
		}
		ctx.Next()
	}
}
