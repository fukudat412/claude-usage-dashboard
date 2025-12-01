#!/bin/bash

# Claude Usage Dashboard 起動スクリプト

echo "🚀 Claude Usage Dashboard を起動しています..."

# 既存のプロセスをクリーンアップ
echo "既存のプロセスをクリーンアップ中..."
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
sleep 2

# ポートの確認
echo "ポートの確認中..."
if lsof -i:30000 -t >/dev/null 2>&1; then
    echo "⚠️  ポート30000が使用中です"
    lsof -i:30000
fi

if lsof -i:30001 -t >/dev/null 2>&1; then
    echo "⚠️  ポート30001が使用中です"
    lsof -i:30001
fi

# サーバーを起動
echo "サーバーを起動中..."
npm run dev

# 終了時のクリーンアップ
trap 'echo "終了処理中..."; pkill -f "react-scripts"; pkill -f "nodemon"' EXIT