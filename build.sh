#!/usr/bin/env bash

#------------------------------------------------------------------------------
# @file
# 在 Cloudflare Worker 的构建环境中编译 Hugo 站点。
# 本站为纯静态站点：没有 go.mod、package-lock.json，也没有使用 Dart Sass，
# 因此只安装 Hugo，其余官方脚本中的工具链按需保留。
#------------------------------------------------------------------------------

# 遇到错误、未定义变量或管道失败时立即退出
set -euo pipefail

HUGO_VERSION=0.170.1

TZ=Asia/Shanghai
HUGO_CACHEDIR="${PWD}/.cache/hugo"

cleanup() {
  if [[ -n "${build_temp_dir:-}" && -d "${build_temp_dir}" ]]; then
    rm -rf "${build_temp_dir}"
  fi
}

trap cleanup EXIT SIGINT SIGTERM

main() {
  export TZ
  export HUGO_CACHEDIR

  build_temp_dir=$(mktemp -d)
  mkdir -p "${HOME}/.local"

  echo "Installing Hugo ${HUGO_VERSION}..."
  curl -sfL --output-dir "${build_temp_dir}" -O "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_linux-amd64.tar.gz"
  mkdir -p "${HOME}/.local/hugo"
  tar -C "${HOME}/.local/hugo" -xf "${build_temp_dir}/hugo_${HUGO_VERSION}_linux-amd64.tar.gz"
  export PATH="${HOME}/.local/hugo:${PATH}"

  echo "Hugo: $(hugo version)"

  # 使用完整 Git 历史，保证 .GitInfo、Lastmod 等特性可用
  git config --global core.quotepath false
  if [[ $(git rev-parse --is-shallow-repository) == true ]]; then
    echo "Fetching full Git history..."
    git fetch --unshallow
  fi

  echo "Building the project..."
  hugo build --gc --minify
}

main "$@"
