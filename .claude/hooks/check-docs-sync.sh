#!/bin/bash
# Stopフック: コード変更にドキュメント確認が伴っているかをチェックする。
# コード系ファイルに未コミットの変更があるのに .md が1つも変更されていない場合、
# 一度だけブロックしてドキュメント整合性の確認を促す。
# 2回目 (stop_hook_active=true) は素通しするので無限ループにはならない。

input=$(cat)

# このフックの指摘を受けて継続したターンなら再ブロックしない
if echo "$input" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# 未コミットの変更（ステージ済み・未ステージ・未追跡を含む）
changed=$(git status --porcelain 2>/dev/null | awk '{print $NF}')
[ -z "$changed" ] && exit 0

code_changed=$(echo "$changed" | grep -E '^(src/|server\.js|package\.json|tsconfig\.json|Dockerfile|docker-compose)' | head -10)
docs_changed=$(echo "$changed" | grep -E '\.md$')

if [ -n "$code_changed" ] && [ -z "$docs_changed" ]; then
  jq -n --arg files "$code_changed" \
    '{decision: "block", reason: ("コードが変更されていますが、ドキュメントが更新されていません。変更内容が README.md / AGENTS.md / docs/ の記述（ポート、APIエンドポイント、構成、コマンド、依存関係）と矛盾しないか確認し、必要ならドキュメントも更新してください。確認の結果、整合性に問題がなければそのまま完了して構いません。\n\n変更されたコードファイル:\n" + $files)}'
  exit 0
fi

exit 0
