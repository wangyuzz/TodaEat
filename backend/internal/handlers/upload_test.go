package handlers

import (
	"bytes"
	"encoding/json"
	"image"
	"image/jpeg"
	"image/png"
	"mime/multipart"
	"net/http/httptest"
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"todayeat/internal/config"
)

func TestImageUploadCompressionBackupAndDeletion(t *testing.T) {
	previous := config.C
	t.Cleanup(func() { config.C = previous })
	root := t.TempDir()
	config.C = config.Config{UploadDir: filepath.Join(root, "uploads"), BackupDir: filepath.Join(root, "backup"), MaxUploadSize: 1024 * 1024, CompressMaxDim: 8, JpegQuality: 85}
	var original bytes.Buffer
	if err := png.Encode(&original, image.NewRGBA(image.Rect(0, 0, 16, 8))); err != nil {
		t.Fatal(err)
	}
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	header := make(textproto.MIMEHeader)
	header.Set("Content-Disposition", `form-data; name="image"; filename="test.png"`)
	header.Set("Content-Type", "image/png")
	part, _ := form.CreatePart(header)
	part.Write(original.Bytes())
	form.Close()
	r := gin.New()
	r.POST("/upload", UploadImage)
	r.DELETE("/upload", DeleteImage)
	req := httptest.NewRequest("POST", "/upload", &body)
	req.Header.Set("Content-Type", form.FormDataContentType())
	response := httptest.NewRecorder()
	r.ServeHTTP(response, req)
	var result struct {
		Code int
		Data struct {
			URL      string
			Filename string
		}
	}
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil || response.Code != 200 || result.Code != 0 {
		t.Fatalf("upload failed: %s (%v)", response.Body, err)
	}
	relative := strings.TrimPrefix(result.Data.URL, "/uploads/")
	compressedPath := filepath.Join(config.C.UploadDir, filepath.FromSlash(relative))
	compressed, err := os.ReadFile(compressedPath)
	if err != nil {
		t.Fatal(err)
	}
	img, err := jpeg.Decode(bytes.NewReader(compressed))
	if err != nil || img.Bounds().Dx() != 8 || img.Bounds().Dy() != 4 {
		t.Fatalf("compression dimensions not preserved: %v", err)
	}
	backupPath := filepath.Join(config.C.BackupDir, filepath.FromSlash(strings.TrimSuffix(relative, ".jpg")+".png"))
	backup, err := os.ReadFile(backupPath)
	if err != nil || !bytes.Equal(backup, original.Bytes()) {
		t.Fatalf("original photo backup missing: %v", err)
	}
	deleteRequest := func(url string) *httptest.ResponseRecorder {
		payload, _ := json.Marshal(map[string]string{"url": url})
		req := httptest.NewRequest("DELETE", "/upload", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	if w := deleteRequest(result.Data.URL); w.Code != 200 {
		t.Fatalf("delete failed: %s", w.Body)
	}
	if _, err := os.Stat(compressedPath); !os.IsNotExist(err) {
		t.Fatal("compressed photo was not deleted")
	}
	if _, err := os.Stat(backupPath); err != nil {
		t.Fatal("deletion removed original backup")
	}
	sentinel := filepath.Join(root, "outside.txt")
	os.WriteFile(sentinel, []byte("keep"), 0600)
	if w := deleteRequest("/uploads/../outside.txt"); w.Code != 400 {
		t.Fatal("path traversal was accepted")
	}
	if _, err := os.Stat(sentinel); err != nil {
		t.Fatal("file outside upload directory was removed")
	}
}
