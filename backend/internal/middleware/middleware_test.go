package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"todayeat/internal/config"
)

func TestAuthenticationBoundaries(t *testing.T) {
	gin.SetMode(gin.TestMode)
	previous := config.C
	t.Cleanup(func() { config.C = previous })
	config.C = config.Config{AppPassword: "app-test", JWTSecret: "test-secret", JWTExpire: "1h"}
	valid, err := GenerateToken()
	if err != nil {
		t.Fatal(err)
	}
	expired, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"exp": time.Now().Add(-time.Hour).Unix()}).SignedString([]byte(config.C.JWTSecret))
	wrongKey, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"exp": time.Now().Add(time.Hour).Unix()}).SignedString([]byte("another-secret"))
	wrongRole, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"role": "user", "exp": time.Now().Add(time.Hour).Unix()}).SignedString([]byte(config.C.JWTSecret))
	missingExpiry, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"role": "admin"}).SignedString([]byte(config.C.JWTSecret))
	wrongAlgorithm, _ := jwt.NewWithClaims(jwt.SigningMethodHS512, jwt.MapClaims{"role": "admin", "exp": time.Now().Add(time.Hour).Unix()}).SignedString([]byte(config.C.JWTSecret))
	r := gin.New()
	r.GET("/app", AppAuthMiddleware(), func(c *gin.Context) { c.Status(http.StatusOK) })
	r.GET("/admin", AuthMiddleware(), func(c *gin.Context) { c.Status(http.StatusOK) })
	for _, tc := range []struct {
		name, path, app, token string
		status                 int
	}{
		{"missing", "/app", "", "", 401}, {"wrong password", "/app", "wrong", "", 401},
		{"app password", "/app", "app-test", "", 200}, {"app cannot administer", "/admin", "app-test", "", 401},
		{"admin app access", "/app", "", valid, 200}, {"admin", "/admin", "", valid, 200},
		{"expired", "/admin", "", expired, 401}, {"wrong signature", "/admin", "", wrongKey, 401},
		{"wrong role", "/admin", "", wrongRole, 401}, {"missing expiry", "/admin", "", missingExpiry, 401},
		{"wrong algorithm", "/admin", "", wrongAlgorithm, 401},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tc.path, nil)
			req.Header.Set("X-App-Token", tc.app)
			if tc.token != "" {
				req.Header.Set("Authorization", "Bearer "+tc.token)
			}
			response := httptest.NewRecorder()
			r.ServeHTTP(response, req)
			if response.Code != tc.status {
				t.Fatalf("got %d, want %d", response.Code, tc.status)
			}
		})
	}
}
