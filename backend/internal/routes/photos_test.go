package routes

import (
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"todayeat/internal/config"
	"todayeat/internal/middleware"
)

func photoRouter(t *testing.T) *gin.Engine {
	t.Helper()
	previous := config.C
	t.Cleanup(func() { config.C = previous })
	config.C = config.Config{
		AppPassword: "test-app-password", AdminPassword: "test-admin-password",
		JWTSecret: "test-signing-secret-at-least-32-bytes", JWTExpire: "1h", UploadDir: t.TempDir(),
	}
	if err := os.WriteFile(filepath.Join(config.C.UploadDir, "test.jpg"), []byte("photo-data"), 0600); err != nil {
		t.Fatal(err)
	}
	router := gin.New()
	Setup(router)
	router.GET("/api/session-check", middleware.AppAuthMiddleware(), func(c *gin.Context) { c.Status(http.StatusOK) })
	return router
}

func photoRequest(router *gin.Engine, method, path, body string, cookie *http.Cookie, headers map[string]string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	if cookie != nil {
		request.AddCookie(cookie)
	}
	for key, value := range headers {
		request.Header.Set(key, value)
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestPhotoAuthenticationAndPermissionIsolation(t *testing.T) {
	router := photoRouter(t)
	for _, method := range []string{"GET", "HEAD"} {
		response := photoRequest(router, method, "/uploads/test.jpg", "", nil, nil)
		if response.Code != 401 || response.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatalf("anonymous %s exposed photo: %d", method, response.Code)
		}
	}
	for _, login := range []struct{ path, password string }{
		{"/api/app/login", config.C.AppPassword}, {"/api/admin/login", config.C.AdminPassword},
	} {
		t.Run(login.path, func(t *testing.T) {
			wrong := photoRequest(router, "POST", login.path, `{"password":"wrong"}`, nil, nil)
			if wrong.Code != 401 || len(wrong.Result().Cookies()) != 0 {
				t.Fatal("failed login issued a photo session")
			}
			response := photoRequest(router, "POST", login.path, `{"password":"`+login.password+`"}`, nil, nil)
			cookies := response.Result().Cookies()
			if response.Code != 200 || len(cookies) != 1 {
				t.Fatalf("login did not issue cookie: %d", response.Code)
			}
			cookie := cookies[0]
			if cookie.Name != middleware.PhotoSessionCookie || cookie.Path != "/uploads" || !cookie.HttpOnly || cookie.SameSite != http.SameSiteStrictMode || cookie.Secure || cookie.MaxAge != 3600 || cookie.Expires.IsZero() {
				t.Fatalf("incorrect photo cookie attributes: %+v", cookie)
			}
			for _, method := range []string{"GET", "HEAD"} {
				response = photoRequest(router, method, "/uploads/test.jpg", "", cookie, nil)
				if response.Code != 200 || method == "GET" && response.Body.String() != "photo-data" || method == "HEAD" && response.Body.Len() != 0 {
					t.Fatalf("authenticated %s broken: %d", method, response.Code)
				}
			}
			response = photoRequest(router, "GET", "/uploads/test.jpg", "", cookie, map[string]string{"Range": "bytes=0-4"})
			if response.Code != 206 || response.Body.String() != "photo" {
				t.Fatal("authenticated photo range request broken")
			}
			for _, path := range []string{"/api/restaurants", "/api/admin/dashboard"} {
				if photoRequest(router, "GET", path, "", cookie, nil).Code != 401 {
					t.Fatal("photo cookie granted API access")
				}
				if photoRequest(router, "GET", path, "", nil, map[string]string{"Authorization": "Bearer " + cookie.Value}).Code != 401 {
					t.Fatal("photo token granted API access")
				}
			}
			cookie.Value += "tampered"
			if photoRequest(router, "GET", "/uploads/test.jpg", "", cookie, nil).Code != 401 {
				t.Fatal("tampered photo cookie accepted")
			}
		})
	}
	admin, err := middleware.GenerateToken()
	if err != nil {
		t.Fatal(err)
	}
	for _, headers := range []map[string]string{
		{"X-App-Token": config.C.AppPassword}, {"Authorization": "Bearer " + admin},
	} {
		if photoRequest(router, "GET", "/uploads/test.jpg", "", nil, headers).Code != 200 {
			t.Fatal("existing header photo access broken")
		}
	}
}

func TestPhotoSessionRotationAndHTTPS(t *testing.T) {
	router := photoRouter(t)
	login := func(path string, headers map[string]string) *http.Cookie {
		t.Helper()
		response := photoRequest(router, "POST", path, `{"password":"`+config.C.AppPassword+`"}`, nil, headers)
		if response.Code != 200 || len(response.Result().Cookies()) != 1 {
			t.Fatalf("photo session not issued: %d", response.Code)
		}
		return response.Result().Cookies()[0]
	}
	if !login("https://example.test/api/app/login", nil).Secure || !login("/api/app/login", map[string]string{"X-Forwarded-Proto": "https"}).Secure {
		t.Fatal("HTTPS photo cookie is not secure")
	}
	for _, field := range []string{"app", "admin", "secret"} {
		t.Run(field, func(t *testing.T) {
			cookie := login("/api/app/login", nil)
			previous := config.C
			switch field {
			case "app":
				config.C.AppPassword += "-rotated"
			case "admin":
				config.C.AdminPassword += "-rotated"
			case "secret":
				config.C.JWTSecret += "-rotated"
			}
			response := photoRequest(router, "GET", "/uploads/test.jpg", "", cookie, nil)
			config.C = previous
			if response.Code != 401 {
				t.Fatal("credential rotation did not revoke photo session")
			}
		})
	}
}

func TestBrowserImagesAndExistingAPICredentialsReceivePhotoSession(t *testing.T) {
	router := photoRouter(t)
	server := httptest.NewServer(router)
	defer server.Close()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	client := &http.Client{Jar: jar}
	for _, path := range []string{"/api/app/login", "/api/session-check"} {
		jar, _ = cookiejar.New(nil)
		client.Jar = jar
		method, body := "POST", `{"password":"`+config.C.AppPassword+`"}`
		if path == "/api/session-check" {
			method, body = "GET", ""
		}
		request, err := http.NewRequest(method, server.URL+path, strings.NewReader(body))
		if err != nil {
			t.Fatal(err)
		}
		request.Header.Set("Content-Type", "application/json")
		request.Header.Set("X-App-Token", config.C.AppPassword)
		response, err := client.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if response.StatusCode != 200 || len(response.Cookies()) != 1 {
			t.Fatal("login or existing API credentials did not grant photo session")
		}
		// A real browser image sends only its scoped cookie, without API headers.
		response, err = client.Get(server.URL + "/uploads/test.jpg")
		if err != nil {
			t.Fatal(err)
		}
		data, err := io.ReadAll(response.Body)
		response.Body.Close()
		if err != nil || response.StatusCode != 200 || string(data) != "photo-data" {
			t.Fatal("browser image request failed")
		}
		response, err = client.Get(server.URL + "/api/session-check")
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if response.StatusCode != 401 || len(response.Request.Cookies()) != 0 {
			t.Fatal("browser photo cookie escaped its path or granted API access")
		}
	}
}
