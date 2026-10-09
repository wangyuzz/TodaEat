package handlers

import (
	"encoding/json"
	"errors"
)

func jsonStrings(s string, out *[]string) error {
	if json.Unmarshal([]byte(s), out) != nil {
		return errors.New("照片必须是URL数组")
	}
	return nil
}
func marshalVisitDetail(d visitDetail) ([]byte, error) {
	b, err := json.Marshal(d.Visit)
	if err != nil {
		return nil, err
	}
	var m map[string]json.RawMessage
	if err = json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	b, err = json.Marshal(d.Items)
	if err != nil {
		return nil, err
	}
	m["items"] = b
	delete(m, "updated_at")
	return json.Marshal(m)
}
