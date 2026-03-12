// 腾讯云 TTS API - 降级到浏览器语音
export default async function handler(req, res) {
  // 直接返回降级提示，让前端使用浏览器语音
  res.status(200).json({
    success: false,
    useFallback: true,
    message: '使用浏览器语音合成'
  });
}
