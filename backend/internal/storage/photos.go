// Package storage manages original photos separately from display images.
package storage

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"todayeat/internal/imaging"
)

var ErrTooLarge = errors.New("photo exceeds upload limit")
var ErrInvalidURL = errors.New("invalid upload URL")

type PhotoError struct {
	Stage string
	Cause error
}

func (e *PhotoError) Error() string { return e.Stage + ": " + e.Cause.Error() }
func (e *PhotoError) Unwrap() error { return e.Cause }

type Photos struct {
	DisplayRoot  string
	OriginalRoot string
	MaxBytes     int64
	MaxDimension int
	JPEGQuality  int
}
type Photo struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
}

func (s Photos) Save(source io.Reader, extension string) (Photo, error) {
	return s.SaveContext(context.Background(), source, extension)
}

func (s Photos) SaveContext(ctx context.Context, source io.Reader, extension string) (Photo, error) {
	if failure := ctx.Err(); failure != nil {
		return Photo{}, failure
	}
	if extension != ".jpg" && extension != ".jpeg" && extension != ".png" && extension != ".webp" {
		return Photo{}, &PhotoError{"filename", errors.New("unsupported photo extension")}
	}
	source = contextReader{context: ctx, reader: source}
	now := time.Now()
	day := now.Format("2006/01/02")
	displayDir := filepath.Join(s.DisplayRoot, filepath.FromSlash(day))
	originalDir := filepath.Join(s.OriginalRoot, filepath.FromSlash(day))
	for _, location := range []struct{ path, stage string }{{displayDir, "display-directory"}, {originalDir, "original-directory"}} {
		if err := os.MkdirAll(location.path, 0755); err != nil {
			return Photo{}, &PhotoError{location.stage, err}
		}
	}
	var suffix [4]byte
	if _, err := rand.Read(suffix[:]); err != nil {
		return Photo{}, &PhotoError{"filename", err}
	}
	stem := fmt.Sprintf("%d-%s", now.UnixMilli(), hex.EncodeToString(suffix[:]))
	original, err := publishReader(originalDir, stem+extension, source, s.MaxBytes)
	if err != nil {
		return Photo{}, &PhotoError{"original", err}
	}
	display, err := imaging.ProcessUploadContext(ctx, original, displayDir, stem, s.MaxDimension, s.JPEGQuality)
	if err != nil {
		if ctx.Err() != nil {
			os.Remove(original)
			return Photo{}, ctx.Err()
		}
		// A format the compressor cannot decode still keeps its untouched backup.
		// Copy the fallback into the display directory rather than moving the backup.
		file, openErr := os.Open(original)
		if openErr != nil {
			return Photo{}, &PhotoError{"display", openErr}
		}
		display, err = publishReader(displayDir, stem+extension, contextReader{context: ctx, reader: file}, s.MaxBytes)
		closeErr := file.Close()
		if err == nil {
			err = closeErr
		}
		if err != nil {
			if ctx.Err() != nil {
				os.Remove(original)
			}
			return Photo{}, &PhotoError{"display", err}
		}
	}
	if failure := ctx.Err(); failure != nil {
		os.Remove(display)
		os.Remove(original)
		return Photo{}, failure
	}
	filename := filepath.Base(display)
	return Photo{URL: "/uploads/" + day + "/" + filename, Filename: filename}, nil
}

type contextReader struct {
	context context.Context
	reader  io.Reader
}

func (source contextReader) Read(buffer []byte) (int, error) {
	if failure := source.context.Err(); failure != nil {
		return 0, failure
	}
	return source.reader.Read(buffer)
}

// Write to a temporary file and publish after a successful close. Failures and
// oversized streams leave no partial photo at a URL that the browser can read.
func publishReader(directory, filename string, source io.Reader, limit int64) (string, error) {
	if limit <= 0 || limit == 1<<63-1 {
		return "", ErrTooLarge
	}
	temporary, err := os.CreateTemp(directory, ".photo-*")
	if err != nil {
		return "", err
	}
	defer os.Remove(temporary.Name())
	size, writeErr := io.Copy(temporary, io.LimitReader(source, limit+1))
	if writeErr == nil && size > limit {
		writeErr = ErrTooLarge
	}
	if writeErr == nil {
		writeErr = temporary.Chmod(0644)
	}
	if writeErr == nil {
		writeErr = temporary.Sync()
	}
	closeErr := temporary.Close()
	if writeErr != nil {
		return "", writeErr
	}
	if closeErr != nil {
		return "", closeErr
	}
	destination := filepath.Join(directory, filename)
	if err := os.Rename(temporary.Name(), destination); err != nil {
		return "", err
	}
	return destination, nil
}

func (s Photos) Delete(url string) error {
	relative, found := strings.CutPrefix(strings.TrimPrefix(url, "/"), "uploads/")
	if !found {
		return ErrInvalidURL
	}
	relative = filepath.FromSlash(relative)
	if !filepath.IsLocal(relative) || filepath.Clean(relative) == "." {
		return ErrInvalidURL
	}
	// Rooted file access also prevents a nested symlink from escaping uploads.
	root, err := os.OpenRoot(s.DisplayRoot)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	defer root.Close()
	err = root.Remove(relative)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}
