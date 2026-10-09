package handlers

import (
	"context"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
	"todayeat/internal/utils"
)

// The binary contains AMap search integration. Keys were not in the recovery pack.
func SearchLocations(c *gin.Context) {
	keyword := strings.TrimSpace(c.Query("keyword"))
	if keyword == "" {
		utils.Success(c, gin.H{"configured": os.Getenv("AMAP_KEY") != "", "items": []gin.H{}})
		return
	}
	key := os.Getenv("AMAP_KEY")
	if key == "" {
		key = os.Getenv("AMAP_WEB_SERVICE_KEY")
	}
	if key == "" {
		utils.Success(c, gin.H{"configured": false, "items": []gin.H{}})
		return
	}
	params := url.Values{"key": {key}, "keywords": {keyword}, "offset": {"20"}, "extensions": {"base"}, "output": {"JSON"}}
	if city := os.Getenv("AMAP_CITY"); city != "" {
		params.Set("city", city)
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 8*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://restapi.amap.com/v3/place/text?"+params.Encode(), nil)
	if err != nil {
		utils.InternalError(c, "地址查询失败")
		return
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		utils.Error(c, 502, 50200, "地址服务暂不可用")
		return
	}
	defer resp.Body.Close()
	var data struct {
		Status string                       `json:"status"`
		POIs   []map[string]json.RawMessage `json:"pois"`
	}
	if resp.StatusCode != 200 || json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(&data) != nil || data.Status != "1" {
		utils.Error(c, 502, 50200, "地址服务返回异常")
		return
	}
	text := func(row map[string]json.RawMessage, key string) string {
		var s string
		_ = json.Unmarshal(row[key], &s)
		return s
	}
	result := []gin.H{}
	for _, row := range data.POIs {
		address := text(row, "pname") + text(row, "cityname") + text(row, "adname") + text(row, "address")
		result = append(result, gin.H{"id": text(row, "id"), "name": text(row, "name"), "address": address, "location": text(row, "location"), "city": text(row, "cityname"), "district": text(row, "adname")})
	}
	utils.Success(c, gin.H{"configured": true, "items": result})
}
