package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestSessionRolesAndSignatures(t *testing.T) {
	sessions := Sessions{Secret: "test-signing-secret-at-least-32-bytes", Lifetime: time.Hour}
	admin, err := sessions.IssueAdmin()
	if err != nil {
		t.Fatal(err)
	}
	photo, err := sessions.IssuePhoto()
	if err != nil {
		t.Fatal(err)
	}
	if !sessions.IsAdmin(admin) || sessions.IsPhoto(admin) || !sessions.IsPhoto(photo) || sessions.IsAdmin(photo) {
		t.Fatal("session roles are not isolated")
	}
	expired, err := (Sessions{Secret: sessions.Secret, Lifetime: -time.Hour}).IssuePhoto()
	if err != nil {
		t.Fatal(err)
	}
	missingExpiry, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"role": "photo"}).SignedString([]byte(sessions.Secret))
	wrongAlgorithm, _ := jwt.NewWithClaims(jwt.SigningMethodHS512, jwt.MapClaims{"role": "photo", "exp": time.Now().Add(time.Hour).Unix()}).SignedString([]byte(sessions.Secret))
	for _, raw := range []string{"", photo + "tampered", expired, missingExpiry, wrongAlgorithm} {
		if sessions.IsPhoto(raw) {
			t.Fatal("invalid photo token accepted")
		}
	}
	if (Sessions{Secret: "another-key"}).IsPhoto(photo) || (Sessions{}).IsPhoto(photo) {
		t.Fatal("token accepted with wrong or missing key")
	}
	if _, err := (Sessions{}).IssueAdmin(); err == nil {
		t.Fatal("empty admin signing key accepted")
	}
	if _, err := (Sessions{}).IssuePhoto(); err == nil {
		t.Fatal("empty photo signing key accepted")
	}
	if PasswordMatches("", "") {
		t.Fatal("unconfigured password accepted")
	}
}
