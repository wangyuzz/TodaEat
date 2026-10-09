package main

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
	"todayeat/internal/database"
	"todayeat/internal/services"
)

func TestRequestDrainWaitsForActiveHandlersAndRejectsNewWork(t *testing.T) {
	entered, release := make(chan struct{}), make(chan struct{})
	drain := newRequestDrain(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		close(entered)
		<-release
		writer.WriteHeader(http.StatusOK)
	}))
	active := make(chan struct{})
	go func() {
		defer close(active)
		drain.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/", nil))
	}()
	<-entered
	finished := make(chan struct{})
	go func() { drain.finish(); close(finished) }()
	deadline := time.Now().Add(time.Second)
	for {
		drain.gate.Lock()
		stopped := drain.stopped
		drain.gate.Unlock()
		if stopped {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("drain did not stop admitting work")
		}
		runtime.Gosched()
	}
	select {
	case <-finished:
		t.Fatal("active request was not drained")
	default:
	}
	response := httptest.NewRecorder()
	drain.ServeHTTP(response, httptest.NewRequest("GET", "/", nil))
	if response.Code != 503 {
		t.Fatalf("new work admitted during shutdown: %d", response.Code)
	}
	close(release)
	select {
	case <-finished:
	case <-time.After(time.Second):
		t.Fatal("drain did not finish")
	}
	<-active
}

func TestAlreadyCancelledStartupDoesNotOpenDatabase(t *testing.T) {
	previous := database.DB
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if failure := run(ctx); failure != nil || database.DB != previous {
		t.Fatalf("cancelled startup initialized resources: %v", failure)
	}
}

func TestUnconfiguredStartupDoesNotOpenDatabase(t *testing.T) {
	previous := database.DB
	t.Chdir(t.TempDir())
	for _, key := range []string{"ADMIN_PASSWORD", "APP_PASSWORD", "JWT_SECRET"} {
		t.Setenv(key, "")
	}
	failure := run(context.Background())
	if failure == nil || !strings.Contains(failure.Error(), "JWT_SECRET") || database.DB != previous {
		t.Fatalf("unconfigured startup initialized resources: %v", failure)
	}
}

func TestServerCancellationFinishesAndReleasesPort(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	address := listener.Addr().String()
	listener.Close()
	_, port, _ := net.SplitHostPort(address)
	root := t.TempDir()
	for key, value := range map[string]string{
		"PORT": port, "DB_PATH": filepath.Join(root, "server.db"),
		"UPLOAD_DIR": filepath.Join(root, "uploads"), "BACKUP_DIR": filepath.Join(root, "backup"),
		"APP_PASSWORD": "test-app-password", "ADMIN_PASSWORD": "test-admin-password", "JWT_SECRET": "test-signing-secret-at-least-32-bytes",
	} {
		t.Setenv(key, value)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	finished := make(chan error, 1)
	go func() { finished <- run(ctx) }()
	deadline := time.Now().Add(10 * time.Second)
	client := &http.Client{Timeout: time.Second}
	for {
		response, requestErr := client.Get("http://" + address + "/api/app-info")
		if requestErr == nil {
			response.Body.Close()
			if response.StatusCode != http.StatusOK {
				t.Fatalf("startup HTTP %d", response.StatusCode)
			}
			break
		}
		select {
		case err := <-finished:
			t.Fatalf("server stopped before startup: %v", err)
		default:
		}
		if time.Now().After(deadline) {
			t.Fatal("server startup timed out")
		}
		time.Sleep(20 * time.Millisecond)
	}
	connection, err := database.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	services.QueueAutoAchievementSync()
	cancel()
	select {
	case err := <-finished:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(12 * time.Second):
		t.Fatal("server shutdown timed out")
	}
	if connection.Ping() == nil {
		t.Fatal("database remained open after shutdown")
	}
	listener, err = net.Listen("tcp", address)
	if err != nil {
		t.Fatalf("port still in use: %v", err)
	}
	listener.Close()
}
