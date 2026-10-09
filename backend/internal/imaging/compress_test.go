package imaging

import (
	"context"
	"encoding/binary"
	"errors"
	"hash/crc32"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

func TestDimensionPreflightAndCancellationLeaveNoPublishedImage(t *testing.T) {
	root := t.TempDir()
	source := filepath.Join(root, "input.png")
	file, failure := os.Create(source)
	if failure != nil {
		t.Fatal(failure)
	}
	if failure = png.Encode(file, image.NewRGBA(image.Rect(0, 0, 2, 2))); failure != nil {
		t.Fatal(failure)
	}
	file.Close()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, failure = ProcessUploadContext(ctx, source, root, "cancelled", 100, 80); !errors.Is(failure, context.Canceled) {
		t.Fatalf("cancellation lost: %v", failure)
	}
	data, _ := os.ReadFile(source)
	binary.BigEndian.PutUint32(data[16:20], 100_000)
	binary.BigEndian.PutUint32(data[20:24], 100_000)
	binary.BigEndian.PutUint32(data[29:33], crc32.ChecksumIEEE(data[12:29]))
	os.WriteFile(source, data, 0600)
	if _, failure = ProcessUpload(source, root, "huge", 100, 80); !errors.Is(failure, ErrDimensions) {
		t.Fatalf("large header was not rejected before decode: %v", failure)
	}
	files, _ := filepath.Glob(filepath.Join(root, "*.jpg"))
	if len(files) != 0 {
		t.Fatal("failed operation published a photo")
	}
}
