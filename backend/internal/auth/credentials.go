// Package auth owns password comparison and signed sessions with distinct roles.
package auth

import (
	"crypto/sha256"
	"crypto/subtle"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func PasswordMatches(input, expected string) bool {
	if expected == "" {
		return false
	}
	inputHash, expectedHash := sha256.Sum256([]byte(input)), sha256.Sum256([]byte(expected))
	return subtle.ConstantTimeCompare(inputHash[:], expectedHash[:]) == 1
}

type sessionClaims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

type Sessions struct {
	Secret   string
	Lifetime time.Duration
}

func (s Sessions) IssueAdmin() (string, error) {
	return s.issue("admin")
}

func (s Sessions) IssuePhoto() (string, error) {
	return s.issue("photo")
}

func (s Sessions) issue(role string) (string, error) {
	if s.Secret == "" {
		return "", errors.New("session signing key is required")
	}
	now := time.Now()
	claims := sessionClaims{Role: role, RegisteredClaims: jwt.RegisteredClaims{
		IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(s.Lifetime)),
	}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.Secret))
}

func (s Sessions) IsAdmin(raw string) bool {
	return s.hasRole(raw, "admin")
}

func (s Sessions) IsPhoto(raw string) bool {
	return s.hasRole(raw, "photo")
}

func (s Sessions) hasRole(raw, role string) bool {
	if s.Secret == "" || raw == "" {
		return false
	}
	claims := &sessionClaims{}
	parsed, err := jwt.ParseWithClaims(raw, claims, func(_ *jwt.Token) (any, error) {
		return []byte(s.Secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithExpirationRequired())
	return err == nil && parsed.Valid && claims.Role == role
}
