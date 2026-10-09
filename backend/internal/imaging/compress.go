package imaging

import (
	"context"
	"errors"
	"fmt"
	imgproc "github.com/disintegration/imaging"
	_ "golang.org/x/image/webp"
	"image"
	"image/draw"
	"image/jpeg"
	"os"
	"path/filepath"
	"runtime"
)

// Header inspection bounds allocation before a decoder sees untrusted pixels.
const maximumPixels int64 = 40_000_000

var ErrDimensions = errors.New("image dimensions exceed processing limit")
var processingSlots = make(chan struct{}, max(1, min(2, runtime.GOMAXPROCS(0))))

type jpegJob struct {
	source, destination string
	edge, quality       int
}

func (job jpegJob) validate() error {
	if job.edge <= 0 || job.quality < 1 || job.quality > 100 {
		return errors.New("invalid JPEG processing options")
	}
	file, failure := os.Open(job.source)
	if failure != nil {
		return failure
	}
	metadata, _, decodeErr := image.DecodeConfig(file)
	if failure = errors.Join(decodeErr, file.Close()); failure != nil {
		return failure
	}
	if metadata.Width <= 0 || metadata.Height <= 0 || int64(metadata.Width) > maximumPixels/int64(metadata.Height) {
		return ErrDimensions
	}
	return nil
}

func (job jpegJob) render() (image.Image, error) {
	decoded, failure := imgproc.Open(job.source, imgproc.AutoOrientation(true))
	if failure != nil {
		return nil, fmt.Errorf("decode photo: %w", failure)
	}
	area := decoded.Bounds()
	if area.Dx() > job.edge || area.Dy() > job.edge {
		decoded = imgproc.Fit(decoded, job.edge, job.edge, imgproc.Lanczos)
	}
	return flattenWhite(decoded), nil
}

func ProcessUpload(source, directory, stem string, maxEdge, quality int) (string, error) {
	return ProcessUploadContext(context.Background(), source, directory, stem, maxEdge, quality)
}

func ProcessUploadContext(ctx context.Context, source, directory, stem string, maxEdge, quality int) (string, error) {
	if stem == "" || stem == "." || stem == ".." || filepath.Base(stem) != stem {
		return "", errors.New("invalid photo filename")
	}
	job := jpegJob{source: source, destination: filepath.Join(directory, stem+".jpg"), edge: maxEdge, quality: quality}
	if failure := job.validate(); failure != nil {
		return "", failure
	}
	// Concurrent requests share a small decode budget rather than allocating one
	// full-resolution bitmap per request. Originals remain in separate storage.
	select {
	case processingSlots <- struct{}{}:
	case <-ctx.Done():
		return "", ctx.Err()
	}
	defer func() { <-processingSlots }()
	if failure := ctx.Err(); failure != nil {
		return "", failure
	}
	bitmap, failure := job.render()
	if failure == nil {
		failure = ctx.Err()
	}
	if failure == nil {
		failure = publishJPEG(job.destination, bitmap, job.quality)
	}
	if failure != nil {
		return "", failure
	}
	return job.destination, nil
}

func flattenWhite(source image.Image) *image.RGBA {
	bounds := source.Bounds()
	output := image.NewRGBA(image.Rect(0, 0, bounds.Dx(), bounds.Dy()))
	draw.Draw(output, output.Bounds(), image.White, image.Point{}, draw.Src)
	draw.Draw(output, output.Bounds(), source, bounds.Min, draw.Over)
	return output
}

func publishJPEG(destination string, source image.Image, quality int) error {
	staged, failure := os.CreateTemp(filepath.Dir(destination), ".jpeg-*")
	if failure != nil {
		return failure
	}
	defer func() { staged.Close(); os.Remove(staged.Name()) }()
	for _, operation := range []func() error{
		func() error { return jpeg.Encode(staged, source, &jpeg.Options{Quality: quality}) },
		func() error { return staged.Chmod(0644) }, staged.Sync, staged.Close,
		func() error { return os.Rename(staged.Name(), destination) },
	} {
		if failure = operation(); failure != nil {
			return fmt.Errorf("publish JPEG: %w", failure)
		}
	}
	return nil
}
