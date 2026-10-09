package routes

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"todayeat/internal/config"
)

func TestRootedStaticFilesPreserveRangesAndRejectDirectoryListings(t *testing.T) {
	t.Chdir(t.TempDir())
	os.MkdirAll("static/assets", 0755)
	os.WriteFile("static/index.html", []byte("shell"), 0600)
	os.WriteFile("static/assets/app-12345678.js", []byte("abcdefgh"), 0600)
	router := gin.New()
	router.NoRoute(rootedFiles{directory: "static", spa: true}.frontend)
	for _, test := range []struct {
		path, method, body string
		status             int
	}{
		{"/restaurants", "GET", "shell", 200}, {"/assets/missing.js", "GET", "", 404}, {"/assets/app-12345678.js", "HEAD", "", 200}, {"/api/missing", "GET", "", 404}, {"/../outside.txt", "GET", "", 404},
	} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(test.method, test.path, nil))
		if response.Code != test.status || test.status == 200 && response.Body.String() != test.body {
			t.Fatalf("%s: HTTP %d %s", test.path, response.Code, response.Body)
		}
	}
	request := httptest.NewRequest("GET", "/assets/app-12345678.js", nil)
	request.Header.Set("Range", "bytes=2-4")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != 206 || response.Body.String() != "cde" || !strings.Contains(response.Header().Get("Cache-Control"), "immutable") {
		t.Fatalf("range/cache regression: %d %s", response.Code, response.Body)
	}
	root := t.TempDir()
	os.Mkdir(filepath.Join(root, "folder"), 0755)
	upload := gin.New()
	upload.GET("/uploads/*path", rootedFiles{directory: root}.upload)
	response = httptest.NewRecorder()
	upload.ServeHTTP(response, httptest.NewRequest("GET", "/uploads/folder/", nil))
	if response.Code != 404 {
		t.Fatal("upload directory listing exposed")
	}
}

func TestEveryProtectedRouteRejectsMissingOrInsufficientCredentials(t *testing.T) {
	previous := config.C
	t.Cleanup(func() { config.C = previous })
	config.C = config.Config{AppPassword: "test-app", JWTSecret: "test-secret", UploadDir: t.TempDir()}
	router := gin.New()
	Setup(router)
	counts := map[access]int{}
	for _, endpoint := range endpoints() {
		counts[endpoint.Access]++
		if endpoint.Access == publicAccess {
			continue
		}
		t.Run(endpoint.Method+endpoint.Path, func(t *testing.T) {
			path := "/api" + strings.ReplaceAll(endpoint.Path, ":id", "1")
			request := httptest.NewRequest(endpoint.Method, path, nil)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != http.StatusUnauthorized {
				t.Fatalf("unprotected or missing route: HTTP %d", response.Code)
			}
			if endpoint.Access == adminAccess {
				request = httptest.NewRequest(endpoint.Method, path, nil)
				request.Header.Set("X-App-Token", "test-app")
				response = httptest.NewRecorder()
				router.ServeHTTP(response, request)
				if response.Code != http.StatusUnauthorized {
					t.Fatalf("app password allowed admin operation: HTTP %d", response.Code)
				}
			}
		})
	}
	if counts[publicAccess] != 3 || counts[appAccess] != 26 || counts[adminAccess] != 10 {
		t.Fatalf("API inventory changed: %v", counts)
	}
}
