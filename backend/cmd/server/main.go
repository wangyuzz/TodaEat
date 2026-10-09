package main

import (
	"context"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
	"todayeat/internal/config"
	"todayeat/internal/database"
	"todayeat/internal/routes"
	"todayeat/internal/services"

	"github.com/gin-gonic/gin"
)

func run(ctx context.Context) (failure error) {
	if ctx.Err() != nil {
		return nil
	}
	if err := config.Load(); err != nil {
		return err
	}

	if err := database.Init(); err != nil {
		return err
	}
	connection, err := database.DB.DB()
	if err != nil {
		return err
	}
	// Always drain queued work before closing its database, including failure
	// paths such as a shutdown deadline or a listener unexpectedly closing.
	defer func() { failure = errors.Join(failure, services.FlushAutoAchievementSync(), connection.Close()) }()
	if ctx.Err() != nil {
		return nil
	}

	r := gin.Default()
	routes.Setup(r)

	server := &http.Server{
		Addr: ":" + config.C.Port, Handler: r,
		ReadHeaderTimeout: 10 * time.Second, IdleTimeout: 90 * time.Second,
	}
	listener, err := net.Listen("tcp", server.Addr)
	if err != nil {
		return err
	}
	return serveUntilCancelled(ctx, server, listener)
}

func serveUntilCancelled(ctx context.Context, server *http.Server, listener net.Listener) error {
	drain := newRequestDrain(server.Handler)
	server.Handler = drain
	defer drain.finish()
	// Bind synchronously: startup is reported only after the port is acquired.
	finished := make(chan error, 1)
	go func() { finished <- server.Serve(listener) }()
	log.Printf("todayeat 服务启动，端口 %s", config.C.Port)
	var serveErr error
	select {
	case serveErr = <-finished:
		if errors.Is(serveErr, http.ErrServerClosed) {
			serveErr = nil
		}
	case <-ctx.Done():
	}
	// Drain active requests even when Serve returns an unexpected listener error.
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	shutdownErr := server.Shutdown(shutdown)
	if shutdownErr == nil {
		return serveErr
	}
	closeErr := server.Close()
	return errors.Join(serveErr, shutdownErr, closeErr)
}

// Shutdown closes connections but a handler may still be finishing a database
// operation or removing a staged upload. Stop admitting work and wait for those
// handlers before run's deferred achievement flush and database close.
type requestDrain struct {
	handler http.Handler
	gate    sync.Mutex
	active  sync.WaitGroup
	stopped bool
}

func newRequestDrain(handler http.Handler) *requestDrain {
	if handler == nil {
		handler = http.DefaultServeMux
	}
	return &requestDrain{handler: handler}
}

func (drain *requestDrain) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	drain.gate.Lock()
	if drain.stopped {
		drain.gate.Unlock()
		http.Error(writer, "服务正在停止", http.StatusServiceUnavailable)
		return
	}
	drain.active.Add(1)
	drain.gate.Unlock()
	defer drain.active.Done()
	drain.handler.ServeHTTP(writer, request)
}

func (drain *requestDrain) finish() {
	drain.gate.Lock()
	drain.stopped = true
	drain.gate.Unlock()
	drain.active.Wait()
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx); err != nil {
		log.Printf("服务停止: %v", err)
		os.Exit(1)
	}
}
