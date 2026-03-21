#!/bin/bash
echo "=== 环境变量调试 ==="
echo "ARK_API_KEY 存在: ${ARK_API_KEY:+true}${ARK_API_KEY:-false}"
echo "ARK_API_KEY 长度: ${#ARK_API_KEY}"
if [ -n "$ARK_API_KEY" ]; then
    echo "ARK_API_KEY 前10字符: ${ARK_API_KEY:0:10}..."
fi
echo ""
echo "所有以 ARK_ 开头的变量:"
env | grep "^ARK_" || echo "无"
