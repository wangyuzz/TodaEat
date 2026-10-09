package routes

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"todayeat/internal/config"
	"todayeat/internal/handlers"
	"todayeat/internal/middleware"
	"todayeat/internal/utils"
)

func Setup(r *gin.Engine) {
	// Spill larger envelopes to temporary storage instead of retaining each
	// configured upload limit in memory for every concurrent request.
	r.MaxMultipartMemory = 1 << 20
	r.Use(middleware.CORSMiddleware())
	uploads := rootedFiles{directory: config.C.UploadDir}
	r.GET("/uploads/*path", middleware.PhotoAuthMiddleware(), uploads.upload)
	r.HEAD("/uploads/*path", middleware.PhotoAuthMiddleware(), uploads.upload)
	groups := map[access]*gin.RouterGroup{
		publicAccess: r.Group("/api"),
		appAccess:    r.Group("/api", middleware.AppAuthMiddleware()),
		adminAccess:  r.Group("/api", middleware.AuthMiddleware()),
	}
	for _, endpoint := range endpoints() {
		groups[endpoint.Access].Handle(endpoint.Method, endpoint.Path, endpoint.Handler)
	}
	r.NoRoute(rootedFiles{directory: "static", spa: true}.frontend)
}

// OpenRoot confines both normal paths and symlinks to the selected directory.
// Files stay open for ServeContent so range/conditional requests use the same
// file that was checked, avoiding a stat-then-open replacement race.
type rootedFiles struct {
	directory string
	spa       bool
}

var fingerprintedAsset = regexp.MustCompile(`^/assets/[^/]+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$`)

func localFilename(requestPath string) (string, bool) {
	name := filepath.FromSlash(strings.TrimPrefix(requestPath, "/"))
	if name == "" {
		return "index.html", true
	}
	return name, filepath.IsLocal(name) && !strings.ContainsRune(name, '\x00')
}

func regularFile(root *os.Root, name string) (*os.File, os.FileInfo, error) {
	file, failure := root.Open(name)
	if failure != nil {
		return nil, nil, failure
	}
	info, failure := file.Stat()
	if failure == nil && !info.Mode().IsRegular() {
		failure = os.ErrNotExist
	}
	if failure != nil {
		file.Close()
		return nil, nil, failure
	}
	return file, info, nil
}

func (files rootedFiles) serve(ctx *gin.Context, requestPath string) {
	if ctx.Request.Method != http.MethodGet && ctx.Request.Method != http.MethodHead {
		ctx.Status(http.StatusNotFound)
		return
	}
	name, valid := localFilename(requestPath)
	if !valid {
		ctx.Status(http.StatusNotFound)
		return
	}
	root, failure := os.OpenRoot(files.directory)
	if failure != nil {
		ctx.Status(http.StatusNotFound)
		return
	}
	defer root.Close()
	file, info, failure := regularFile(root, name)
	// Only clean extensionless client routes can fall back to the SPA shell.
	clientRoute := !strings.HasPrefix(requestPath, "/assets/") && filepath.Ext(name) == ""
	if failure != nil && files.spa && clientRoute {
		file, info, failure = regularFile(root, "index.html")
	}
	if failure != nil {
		ctx.Status(http.StatusNotFound)
		return
	}
	defer file.Close()
	ctx.Header("X-Content-Type-Options", "nosniff")
	if files.spa {
		cache := "no-cache"
		if fingerprintedAsset.MatchString(requestPath) {
			cache = "public, max-age=31536000, immutable"
		}
		ctx.Header("Cache-Control", cache)
	}
	ctx.Status(http.StatusOK)
	http.ServeContent(ctx.Writer, ctx.Request, info.Name(), info.ModTime(), file)
}

func (files rootedFiles) upload(ctx *gin.Context) { files.serve(ctx, ctx.Param("path")) }

func (files rootedFiles) frontend(ctx *gin.Context) {
	requested := ctx.Request.URL.Path
	if requested == "/api" || strings.HasPrefix(requested, "/api/") {
		utils.NotFound(ctx, "接口不存在")
		return
	}
	if requested == "/uploads" || strings.HasPrefix(requested, "/uploads/") {
		ctx.Status(http.StatusNotFound)
		return
	}
	files.serve(ctx, requested)
}

// Keep each API's permission next to its method and path for easier auditing.
type access uint8

const (
	publicAccess access = iota
	appAccess
	adminAccess
)

type endpoint struct {
	Method  string
	Path    string
	Handler gin.HandlerFunc
	Access  access
}

func endpoints() []endpoint {
	return []endpoint{
		{"POST", "/app/login", handlers.AppLogin, publicAccess},
		{"POST", "/admin/login", handlers.Login, publicAccess},
		{"GET", "/app-info", handlers.GetAppInfo, publicAccess},
		{"GET", "/restaurants", handlers.GetRestaurants, appAccess},
		{"GET", "/restaurants/category-counts", handlers.GetRestaurantCategoryCounts, appAccess},
		{"GET", "/restaurants/:id", handlers.GetRestaurant, appAccess},
		{"GET", "/restaurants/:id/dishes", handlers.GetRestaurantDishes, appAccess},
		{"GET", "/restaurants/:id/visits", handlers.GetRestaurantVisits, appAccess},
		{"POST", "/restaurants/:id/wish", handlers.ToggleRestaurantWish, appAccess},
		{"POST", "/restaurants", handlers.CreateRestaurant, appAccess},
		{"PUT", "/restaurants/:id", handlers.UpdateRestaurant, appAccess},
		{"DELETE", "/restaurants/:id", handlers.DeleteRestaurant, appAccess},
		{"GET", "/visits", handlers.GetVisits, appAccess},
		{"GET", "/visits/stats", handlers.GetVisitStats, appAccess},
		{"GET", "/visits/:id", handlers.GetVisit, appAccess},
		{"POST", "/visits", handlers.CreateVisit, appAccess},
		{"PUT", "/visits/:id", handlers.UpdateVisit, appAccess},
		{"DELETE", "/visits/:id", handlers.DeleteVisit, appAccess},
		{"GET", "/dishes", handlers.GetDishes, appAccess},
		{"GET", "/dishes/category-counts", handlers.GetDishCategoryCounts, appAccess},
		{"GET", "/dishes/:id", handlers.GetDish, appAccess},
		{"GET", "/records", handlers.GetRecords, appAccess},
		{"DELETE", "/records/:id", handlers.DeleteRecord, appAccess},
		{"GET", "/achievements", handlers.GetAchievements, appAccess},
		{"GET", "/photo-wall", handlers.GetPhotoWall, appAccess},
		{"GET", "/settings", handlers.GetSettings, appAccess},
		{"GET", "/locations/search", handlers.SearchLocations, appAccess},
		{"POST", "/upload/image", handlers.UploadImage, appAccess},
		{"DELETE", "/upload/image", handlers.DeleteImage, appAccess},
		{"GET", "/admin/dashboard", handlers.GetDashboard, adminAccess},
		{"PUT", "/settings", handlers.UpdateSettings, adminAccess},
		{"POST", "/dishes", handlers.CreateDish, adminAccess},
		{"PUT", "/dishes/:id", handlers.UpdateDish, adminAccess},
		{"DELETE", "/dishes/:id", handlers.DeleteDish, adminAccess},
		{"PUT", "/dishes/:id/toggle", handlers.ToggleDish, adminAccess},
		{"POST", "/dishes/:id/clone", handlers.CloneDish, adminAccess},
		{"POST", "/dishes/batch-toggle", handlers.BatchToggleDishes, adminAccess},
		{"POST", "/dishes/batch-delete", handlers.BatchDeleteDishes, adminAccess},
		{"POST", "/dishes/batch-category", handlers.BatchUpdateCategory, adminAccess},
	}
}
