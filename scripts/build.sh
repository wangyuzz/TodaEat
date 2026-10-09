#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
target_os="${1:-linux}"
target_arch="${2:-arm64}"
case "$target_os/$target_arch" in linux/arm64|linux/amd64|windows/amd64|windows/arm64) ;; *) echo 'Unsupported target'; exit 1 ;; esac
package_name="todayeat-$target_os-$target_arch"
output_dir="$project_root/dist/$package_name"
mkdir -p "$output_dir"
cd "$project_root/frontend"
npm ci
npm run build
cd "$project_root/backend"
binary_name=todayeat
if [ "$target_os" = windows ]; then binary_name=todayeat.exe; fi
CGO_ENABLED=0 GOOS="$target_os" GOARCH="$target_arch" go build -trimpath -ldflags '-s -w' -o "$output_dir/$binary_name" ./cmd/server
mkdir -p "$output_dir/static"
cp -a "$project_root/frontend/dist/." "$output_dir/static/"
cp "$project_root/.env.example" "$project_root/DEPLOY.md" "$project_root/LICENSE" "$project_root/THIRD_PARTY_NOTICES.md" "$output_dir/"
tar -czf "$project_root/dist/$package_name.tar.gz" -C "$project_root/dist" "$package_name"
echo "Build ready: $project_root/dist/$package_name.tar.gz"
