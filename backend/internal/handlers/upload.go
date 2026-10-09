package handlers

import (
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"todayeat/internal/config"
	"todayeat/internal/storage"
)

func photoStorage() storage.Photos {
	options := config.C
	return storage.Photos{DisplayRoot: options.UploadDir, OriginalRoot: options.BackupDir,
		MaxBytes: options.MaxUploadSize, MaxDimension: options.CompressMaxDim, JPEGQuality: options.JpegQuality}
}

func oversizedPhoto() error {
	return &actionFailure{http.StatusBadRequest, fmt.Sprintf("图片大小不能超过%dMB", config.C.MaxUploadSize/(1<<20))}
}

func photoExtension(file *multipart.FileHeader) (string, error) {
	if file.Size > config.C.MaxUploadSize {
		return "", oversizedPhoto()
	}
	suffix := strings.ToLower(filepath.Ext(file.Filename))
	if suffix != ".jpg" && suffix != ".jpeg" && suffix != ".png" && suffix != ".webp" {
		return "", &actionFailure{http.StatusBadRequest, "仅支持 jpg/png/webp 格式"}
	}
	declared := file.Header.Get("Content-Type")
	mediaType, _, _ := mime.ParseMediaType(declared)
	if declared != "" && !strings.HasPrefix(mediaType, "image/") {
		return "", &actionFailure{http.StatusBadRequest, "文件类型不正确"}
	}
	return suffix, nil
}

func photoFailure(failure error) error {
	if failure == nil {
		return nil
	}
	if errors.Is(failure, storage.ErrTooLarge) {
		return oversizedPhoto()
	}
	message := "图片处理失败"
	var stage *storage.PhotoError
	if errors.As(failure, &stage) {
		translations := map[string]string{
			"display-directory": "创建上传目录失败", "original-directory": "创建备份目录失败", "original": "保存原始图片失败",
		}
		if translated, exists := translations[stage.Stage]; exists {
			message = translated
		}
	}
	return &actionFailure{http.StatusInternalServerError, message}
}

func UploadImage(ctx *gin.Context) {
	// Bound the multipart envelope before parsing, including requests without Content-Length.
	// Reserve the extra MiB used by the router for multipart headers and fields.
	maximum := config.C.MaxUploadSize
	if maximum <= (1<<63-1)-(1<<20) {
		maximum += 1 << 20
	}
	ctx.Request.Body = http.MaxBytesReader(ctx.Writer, ctx.Request.Body, maximum)
	runAction(ctx, func() (any, error) {
		received, failure := receivePhoto(ctx.Request)
		if failure != nil {
			return nil, failure
		}
		defer received.release()
		photo, failure := photoStorage().SaveContext(ctx.Request.Context(), received.file, received.extension)
		return photo, photoFailure(failure)
	})
}

type receivedPhoto struct {
	file      *os.File
	extension string
}

func (photo *receivedPhoto) release() {
	if photo != nil && photo.file != nil {
		photo.file.Close()
		os.Remove(photo.file.Name())
	}
}

func multipartFailure(failure error) error {
	var limit *http.MaxBytesError
	if errors.As(failure, &limit) || errors.Is(failure, storage.ErrTooLarge) {
		return oversizedPhoto()
	}
	return &actionFailure{http.StatusBadRequest, "请选择图片"}
}

// Read the envelope incrementally. Metadata is checked before spooling bytes,
// and only the selected file reaches disk; unrelated fields are discarded.
// Complete parsing precedes storage so a malformed trailer cannot leave an
// apparently successful photo. The temporary file is removed on every path.
func receivePhoto(request *http.Request) (received *receivedPhoto, failure error) {
	reader, parseErr := request.MultipartReader()
	if parseErr != nil {
		return nil, multipartFailure(parseErr)
	}
	var selected *receivedPhoto
	defer func() {
		if failure != nil {
			selected.release()
		}
	}()
	for {
		part, readErr := reader.NextPart()
		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil {
			return nil, multipartFailure(readErr)
		}
		if selected != nil || part.FormName() != "image" || part.FileName() == "" {
			_, readErr = io.Copy(io.Discard, part)
			if readErr != nil {
				return nil, multipartFailure(readErr)
			}
			continue
		}
		header := &multipart.FileHeader{Filename: part.FileName(), Header: part.Header}
		extension, validationErr := photoExtension(header)
		if validationErr != nil {
			return nil, validationErr
		}
		temporary, writeErr := os.CreateTemp("", "todayeat-upload-*")
		if writeErr != nil {
			return nil, &actionFailure{http.StatusInternalServerError, "保存原始图片失败"}
		}
		selected = &receivedPhoto{file: temporary, extension: extension}
		limit := config.C.MaxUploadSize
		if limit <= 0 || limit == 1<<63-1 {
			return nil, oversizedPhoto()
		}
		written, copyErr := io.Copy(temporary, io.LimitReader(part, limit+1))
		if copyErr != nil {
			var bodyLimit *http.MaxBytesError
			if errors.As(copyErr, &bodyLimit) {
				return nil, oversizedPhoto()
			}
			return nil, &actionFailure{http.StatusBadRequest, "请选择图片"}
		}
		if written > limit {
			return nil, oversizedPhoto()
		}
	}
	if selected == nil {
		return nil, &actionFailure{http.StatusBadRequest, "请选择图片"}
	}
	if _, seekErr := selected.file.Seek(0, io.SeekStart); seekErr != nil {
		return nil, &actionFailure{http.StatusInternalServerError, "保存原始图片失败"}
	}
	return selected, nil
}

type photoDeletion struct {
	URL string `json:"url" binding:"required"`
}

var DeleteImage = jsonHandler("请提供图片URL", deletePhoto)

func deletePhoto(input photoDeletion) (any, error) {
	failure := photoStorage().Delete(input.URL)
	switch {
	case errors.Is(failure, storage.ErrInvalidURL):
		return nil, &actionFailure{http.StatusBadRequest, "图片 URL 无效"}
	case failure != nil:
		return nil, &actionFailure{http.StatusInternalServerError, "删除失败"}
	default:
		return actionMessage("删除成功"), nil
	}
}
