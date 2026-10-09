package utils

import (
	"encoding/json"
	"testing"
)

func TestProjectionPreservesLargeIdentifiersAndHidesPrivateFields(t *testing.T) {
	value := struct {
		ID      uint64 `json:"id"`
		Private string `json:"private"`
	}{9007199254740993, "secret"}
	encoded, failure := ProjectJSON(value, []string{"id"}, map[string]any{"items": []string{}})
	if failure != nil {
		t.Fatal(failure)
	}
	var fields map[string]json.RawMessage
	if failure = json.Unmarshal(encoded, &fields); failure != nil {
		t.Fatal(failure)
	}
	if string(fields["id"]) != "9007199254740993" || string(fields["items"]) != "[]" || fields["private"] != nil {
		t.Fatalf("projection contract changed: %s", encoded)
	}
}
