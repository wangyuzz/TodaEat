// Package auth owns password comparison and signed administrator sessions.
package auth

import (
	"crypto/sha256"
	"crypto/subtle"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func PasswordMatches(input, expected string) bool {
	inputHash, expectedHash := sha256.Sum256([]byte(input)), sha256.Sum256([]byte(expected))
	return subtle.ConstantTimeCompare(inputHash[:], expectedHash[:]) == 1
}

type adminClaims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

type Sessions struct {
	Secret   string
	Lifetime time.Duration
}

func (s Sessions) IssueAdmin() (string, error) {
	now := time.Now()
	claims := adminClaims{Role: "admin", RegisteredClaims: jwt.RegisteredClaims{
		IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(s.Lifetime)),
	}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.Secret))
}

func (s Sessions) IsAdmin(raw string) bool {
	if raw == "" {
		return false
	}
	claims := &adminClaims{}
	parsed, err := jwt.ParseWithClaims(raw, claims, func(_ *jwt.Token) (any, error) {
		return []byte(s.Secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithExpirationRequired())
	return err == nil && parsed.Valid && claims.Role == "admin"
}
