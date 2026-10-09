package config

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode"
)

type Config struct {
	Port           string
	AppPassword    string
	AdminPassword  string
	JWTSecret      string
	JWTExpire      string
	RepeatDays     int
	DBPath         string
	UploadDir      string
	BackupDir      string
	MaxUploadSize  int64
	CompressMaxDim int
	JpegQuality    int
}

var C Config

type environmentReader struct {
	lookup   func(string) string
	failures []error
}

func (reader *environmentReader) text(name, fallback string) string {
	value := reader.lookup(name)
	if value == "" {
		value = fallback
	}
	return value
}
func (reader *environmentReader) integer(name string, fallback, minimum, maximum int) int {
	value, failure := strconv.Atoi(reader.text(name, strconv.Itoa(fallback)))
	if failure != nil || value < minimum || value > maximum {
		reader.failures = append(reader.failures, fmt.Errorf("%s 应为 %d 到 %d 的整数", name, minimum, maximum))
		return fallback
	}
	return value
}

func Read(lookup func(string) string) (Config, error) {
	reader := environmentReader{lookup: lookup}
	largestInt := int(^uint(0) >> 1)
	uploadMB := reader.integer("MAX_UPLOAD_SIZE_MB", 20, 1, int(min(int64(largestInt), int64(1<<63-1)>>20)))
	options := Config{
		Port:        reader.text("PORT", "8080"),
		AppPassword: reader.text("APP_PASSWORD", ""), AdminPassword: reader.text("ADMIN_PASSWORD", "change-me"),
		JWTSecret: reader.text("JWT_SECRET", "todayeat-local-development-secret"), JWTExpire: reader.text("JWT_EXPIRE", "24h"),
		DBPath:    reader.text("DB_PATH", "data/todayeat.db"),
		UploadDir: reader.text("UPLOAD_DIR", "uploads"), BackupDir: reader.text("BACKUP_DIR", "uploads_backup"),
		RepeatDays:     reader.integer("REPEAT_DAYS", 3, 1, largestInt),
		CompressMaxDim: reader.integer("COMPRESS_MAX_DIM", 1200, 1, largestInt),
		JpegQuality:    reader.integer("JPEG_QUALITY", 85, 1, 100), MaxUploadSize: int64(uploadMB) << 20,
	}
	reader.integer("PORT", 8080, 1, 65535)
	lifetime, durationErr := time.ParseDuration(options.JWTExpire)
	if durationErr != nil || lifetime <= 0 {
		reader.failures = append(reader.failures, errors.New("JWT_EXPIRE 应为正的时间长度，例如 24h"))
	}
	if failure := errors.Join(reader.failures...); failure != nil {
		return Config{}, failure
	}
	if options.AppPassword == "" {
		options.AppPassword = options.AdminPassword
	}
	return options, nil
}

func environmentEntries(input io.Reader) (map[string]string, error) {
	entries := make(map[string]string)
	scanner := bufio.NewScanner(input)
	scanner.Buffer(make([]byte, 4096), 1<<20)
	lineNumber := 0
	for scanner.Scan() {
		lineNumber++
		line := strings.TrimSpace(strings.TrimPrefix(scanner.Text(), "\ufeff"))
		key, raw, exists := strings.Cut(strings.TrimPrefix(line, "export "), "=")
		key, raw = strings.TrimSpace(key), strings.TrimSpace(raw)
		if !exists || key == "" || strings.HasPrefix(key, "#") {
			continue
		}
		if !environmentKey(key) {
			return nil, fmt.Errorf("配置文件第 %d 行的变量名无效", lineNumber)
		}
		value, failure := environmentValue(raw)
		if failure != nil {
			return nil, fmt.Errorf("配置文件第 %d 行 (%s): %w", lineNumber, key, failure)
		}
		if entries[key] == "" {
			entries[key] = value
		}
	}
	return entries, scanner.Err()
}

func environmentKey(key string) bool {
	for position, letter := range key {
		valid := letter == '_' || letter >= 'A' && letter <= 'Z' || letter >= 'a' && letter <= 'z'
		if position > 0 {
			valid = valid || letter >= '0' && letter <= '9'
		}
		if !valid {
			return false
		}
	}
	return key != ""
}

// Decode a single value without variable expansion. Passwords and Windows
// paths containing dollars or backslashes remain literal; comments require
// whitespace unless they follow a closing quote.
func environmentValue(raw string) (string, error) {
	if raw == "" {
		return "", nil
	}
	if strings.ContainsRune(raw, '\x00') {
		return "", errors.New("配置值含有空字符")
	}
	quote := raw[0]
	if quote != '\'' && quote != '"' {
		for index, letter := range raw {
			if letter == '#' && (index == 0 || unicode.IsSpace(rune(raw[index-1]))) {
				return strings.TrimSpace(raw[:index]), nil
			}
		}
		return raw, nil
	}
	var value strings.Builder
	for index := 1; index < len(raw); index++ {
		letter := raw[index]
		if letter == quote {
			remainder := strings.TrimSpace(raw[index+1:])
			if remainder != "" && !strings.HasPrefix(remainder, "#") {
				return "", errors.New("引号后有多余内容")
			}
			return value.String(), nil
		}
		if quote == '"' && letter == '\\' && index+1 < len(raw) {
			next := raw[index+1]
			switch next {
			case '"', '\\':
				value.WriteByte(next)
				index++
				continue
			case 'n':
				value.WriteByte('\n')
				index++
				continue
			case 'r':
				value.WriteByte('\r')
				index++
				continue
			case 't':
				value.WriteByte('\t')
				index++
				continue
			}
		}
		value.WriteByte(letter)
	}
	return "", errors.New("配置值的引号未闭合")
}

func applyEnvironment(entries map[string]string) error {
	// Roll back newly published values if the process rejects any entry.
	previous := make(map[string]*string)
	for key, value := range entries {
		if os.Getenv(key) == "" {
			var saved *string
			if existing, present := os.LookupEnv(key); present {
				saved = &existing
			}
			if failure := os.Setenv(key, value); failure != nil {
				failures := []error{failure}
				for name, original := range previous {
					if original == nil {
						failures = append(failures, os.Unsetenv(name))
					} else {
						failures = append(failures, os.Setenv(name, *original))
					}
				}
				return errors.Join(failures...)
			}
			previous[key] = saved
		}
	}
	return nil
}

func readEnvironment(file *os.File) error {
	entries, failure := environmentEntries(file)
	if failure == nil {
		failure = applyEnvironment(entries)
	}
	return failure
}

func loadEnvironment(paths []string) (map[string]string, error) {
	for _, name := range paths {
		file, failure := os.Open(name)
		if errors.Is(failure, os.ErrNotExist) {
			continue
		}
		if failure != nil {
			return nil, fmt.Errorf("读取配置文件: %w", failure)
		}
		entries, parseErr := environmentEntries(file)
		return entries, errors.Join(parseErr, file.Close())
	}
	return map[string]string{}, nil
}

func Load() error {
	candidates := []string{".env", "env.bak"}
	if executable, failure := os.Executable(); failure == nil {
		directory := filepath.Dir(executable)
		candidates = append(candidates, filepath.Join(directory, ".env"), filepath.Join(directory, "env.bak"))
	}
	entries, failure := loadEnvironment(candidates)
	if failure != nil {
		return failure
	}
	settings, failure := Read(func(key string) string {
		if override := os.Getenv(key); override != "" {
			return override
		}
		return entries[key]
	})
	if failure != nil {
		return failure
	}
	// Validate the whole file before publishing its values to other integrations.
	if failure = applyEnvironment(entries); failure != nil {
		return failure
	}
	C = settings
	return nil
}
