package storage

import (
	"bytes"
	"context"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type cancellingReader struct{ cancel context.CancelFunc }

func (reader cancellingReader) Read(buffer []byte) (int, error) {
	reader.cancel()
	return copy(buffer, "partial"), nil
}

func TestCancelledUploadCleansStagedOriginal(t *testing.T) {
	store := testPhotos(t, 1024)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if _, failure := store.SaveContext(ctx, cancellingReader{cancel}, ".png"); !errors.Is(failure, context.Canceled) {
		t.Fatalf("cancellation lost: %v", failure)
	}
	filepath.WalkDir(store.OriginalRoot, func(_ string, entry fs.DirEntry, failure error) error {
		if failure != nil {
			t.Fatal(failure)
		}
		if !entry.IsDir() {
			t.Errorf("cancelled upload left a file: %s", entry.Name())
		}
		return nil
	})
}

func testPhotos(t *testing.T, maxBytes int64) Photos {
	t.Helper()
	root := t.TempDir()
	return Photos{DisplayRoot: filepath.Join(root, "display"), OriginalRoot: filepath.Join(root, "original"), MaxBytes: maxBytes, MaxDimension: 8, JPEGQuality: 85}
}

func TestOversizedStreamDoesNotPublishPartialFiles(t *testing.T) {
	store := testPhotos(t, 8)
	_, err := store.Save(bytes.NewReader(make([]byte, 9)), ".png")
	if !errors.Is(err, ErrTooLarge) {
		t.Fatalf("expected size limit, got %v", err)
	}
	for _, root := range []string{store.DisplayRoot, store.OriginalRoot} {
		err := filepath.WalkDir(root, func(_ string, item fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if !item.IsDir() {
				t.Errorf("partial file left behind: %s", item.Name())
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
	}
}

func TestUndecodableFallbackKeepsOriginalBackup(t *testing.T) {
	store := testPhotos(t, 1024)
	input := []byte("legacy upload that cannot be decoded")
	photo, err := store.Save(bytes.NewReader(input), ".png")
	if err != nil {
		t.Fatal(err)
	}
	relative := filepath.FromSlash(strings.TrimPrefix(photo.URL, "/uploads/"))
	for _, root := range []string{store.DisplayRoot, store.OriginalRoot} {
		data, err := os.ReadFile(filepath.Join(root, relative))
		if err != nil || !bytes.Equal(data, input) {
			t.Fatalf("fallback/backup missing: %s, %v", root, err)
		}
	}
	if err := store.Delete(photo.URL); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(store.OriginalRoot, relative)); err != nil {
		t.Fatal("delete removed original backup")
	}
}

type failingReader struct{}

func (failingReader) Read(buffer []byte) (int, error) {
	return copy(buffer, "partial"), errors.New("read failed")
}

func TestReadFailureCleansStagedOriginal(t *testing.T) {
	store := testPhotos(t, 1024)
	_, err := store.Save(failingReader{}, ".png")
	if err == nil {
		t.Fatal("failed input was accepted")
	}
	filepath.WalkDir(store.OriginalRoot, func(_ string, entry fs.DirEntry, err error) error {
		if err != nil {
			t.Fatal(err)
		}
		if !entry.IsDir() {
			t.Errorf("failed upload left a file: %s", entry.Name())
		}
		return nil
	})
}
