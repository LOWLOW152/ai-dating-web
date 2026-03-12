// 腾讯云 TTS API 路由
const { Credential } = require("tencentcloud-sdk-nodejs/tencentcloud/common/credential");
const { Client } = require("tencentcloud-sdk-nodejs/tencentcloud/tts/v20190823/tts_client");
const { TextToVoiceRequest } = require("tencentcloud-sdk-nodejs/tencentcloud/tts/v20190823/tts_models");

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    // 初始化认证
    const credential = new Credential(
      process.env.TENCENT_SECRET_ID,
      process.env.TENCENT_SECRET_KEY
    );

    // 创建客户端
    const client = new Client(credential, process.env.TENCENT_REGION || 'ap-guangzhou');

    // 创建请求 - 使用温柔女声：智聆（1004）
    const request = new TextToVoiceRequest();
    request.Text = text;
    request.ModelType = 1; // 标准音色
    request.VoiceType = 1004; // 智聆 - 温柔女声
    request.Volume = 1; // 音量
    request.Speed = -0.2; // 语速稍慢，更温柔
    request.SampleRate = 16000;
    request.Codec = 'mp3';

    // 调用 API
    const response = await client.TextToVoice(request);
    
    // 返回音频 base64
    res.status(200).json({
      audio: response.Audio,
      success: true
    });
  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ 
      error: 'TTS failed', 
      message: error.message,
      useFallback: true 
    });
  }
}
