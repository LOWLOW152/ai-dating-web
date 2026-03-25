#!/bin/bash
# 第二层AI初筛匹配 - 手动修复脚本
# 问题：Vercel部署的代码版本过旧，URL缺少https://前缀

echo "🔧 第二层匹配修复脚本"
echo "======================"
echo ""
echo "问题分析："
echo "- 错误信息：Failed to parse URL from ai-dating-m0vyeqzdi...vercel.app/api/..."
echo "- 原因：Vercel的VERCEL_URL环境变量不包含https://前缀"
echo "- 本地代码已修复：使用硬编码的 https://www.ai-dating.top"
echo "- 但Vercel部署的代码版本可能过旧"
echo ""
echo "解决方案："
echo "1. 确保代码已提交到GitHub"
echo "2. 在Vercel控制台重新部署"
echo "3. 或者使用Vercel CLI重新部署"
echo ""

# 检查git状态
cd /root/.openclaw/workspace/ai-dating-web

echo "📋 当前Git状态："
git status

echo ""
echo "📋 最近的提交："
git log --oneline -5

echo ""
echo "🔍 检查match-automation.ts中的URL："
grep -n "fetch.*api/admin/match" src/lib/match-automation.ts

echo ""
echo "✅ 修复状态："
echo "本地代码已修复，需要重新部署到Vercel"
echo ""
echo "部署命令（如果已配置Vercel CLI）："
echo "  vercel --prod"
