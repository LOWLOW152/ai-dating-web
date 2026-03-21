'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Photo {
  id: number;
  url: string;
  is_main: boolean;
  overall_score?: number;
  facial_features?: number;
  temperament?: number;
  expression?: number;
  photo_quality?: number;
  ai_comment?: string;
  ai_tags?: string[];
}

export default function BeautyScorePage() {
  const [profiles, setProfiles] = useState<{id: string, invite_code: string, avg_beauty_score?: number, has_photos?: boolean}[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scoring, setScoring] = useState<number | null>(null);

  // 获取有照片的档案列表
  async function fetchProfiles() {
    try {
      const res = await fetch('/api/admin/profiles');
      const data = await res.json();
      if (data.success) {
        setProfiles(data.data || []);
      }
    } catch (error) {
      console.error('Fetch profiles error:', error);
    }
  }

  // 获取选中档案的照片
  async function fetchPhotos(profileId: string) {
    if (!profileId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/beauty-score?profileId=${profileId}`);
      const data = await res.json();
      if (data.success) {
        setPhotos(data.data);
      }
    } catch (error) {
      console.error('Fetch photos error:', error);
    } finally {
      setLoading(false);
    }
  }

  // 上传照片
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedProfile) return;
    
    setUploading(true);
    
    try {
      // 转换为 base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // 保存照片
        const res = await fetch('/api/admin/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId: selectedProfile,
            imageBase64: base64
          })
        });
        
        const data = await res.json();
        if (data.success) {
          fetchPhotos(selectedProfile);
        } else {
          alert('上传失败: ' + data.error);
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
    }
  }

  // AI评分
  async function handleScore(photoId: number, imageUrl: string) {
    if (!selectedProfile) return;
    setScoring(photoId);
    
    try {
      const res = await fetch('/api/admin/beauty-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfile,
          photoId,
          imageBase64: imageUrl
        })
      });
      
      const data = await res.json();
      if (data.success) {
        fetchPhotos(selectedProfile);
      } else {
        alert('评分失败: ' + data.error);
      }
    } catch (error) {
      console.error('Score error:', error);
    } finally {
      setScoring(null);
    }
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      fetchPhotos(selectedProfile);
    }
  }, [selectedProfile]);

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/admin" className="text-blue-600 hover:underline text-sm">
            ← 返回首页
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">颜值打分 🤳</h1>
        </div>
      </div>

      {/* 选择档案 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">选择档案</label>
        <select
          value={selectedProfile}
          onChange={(e) => setSelectedProfile(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">请选择...</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.invite_code} {p.avg_beauty_score ? `(平均分: ${p.avg_beauty_score})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedProfile && (
        <>
          {/* 上传照片 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="font-semibold mb-4">上传照片</h2>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploading && <span className="text-gray-500">上传中...</span>}
            </div>
            <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG 格式，建议大小不超过 2MB</p>
          </div>

          {/* 照片列表 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold mb-4">照片管理</h2>
            
            {loading ? (
              <p className="text-gray-500">加载中...</p>
            ) : photos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无照片，请上传</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="border rounded-lg overflow-hidden">
                    <div className="aspect-square bg-gray-100 relative">
                      <img 
                        src={photo.url} 
                        alt="照片" 
                        className="w-full h-full object-cover"
                      />
                      {photo.is_main && (
                        <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          主照片
                        </span>
                      )}
                    </div>
                    
                    <div className="p-4">
                      {photo.overall_score ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">整体评分</span>
                            <span className="text-2xl font-bold text-pink-600">{photo.overall_score}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-pink-50 p-2 rounded">
                              <span className="text-gray-500">五官</span>
                              <span className="float-right font-medium">{photo.facial_features}</span>
                            </div>
                            <div className="bg-purple-50 p-2 rounded">
                              <span className="text-gray-500">气质</span>
                              <span className="float-right font-medium">{photo.temperament}</span>
                            </div>
                            <div className="bg-blue-50 p-2 rounded">
                              <span className="text-gray-500">表情</span>
                              <span className="float-right font-medium">{photo.expression}</span>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <span className="text-gray-500">照片质量</span>
                              <span className="float-right font-medium">{photo.photo_quality}</span>
                            </div>
                          </div>
                          
                          {photo.ai_comment && (
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              "{photo.ai_comment}"
                            </p>
                          )}
                          
                          {photo.ai_tags && (
                            <div className="flex flex-wrap gap-1">
                              {photo.ai_tags.map((tag, i) => (
                                <span key={i} className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleScore(photo.id, photo.url)}
                          disabled={scoring === photo.id}
                          className="w-full py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-gray-400"
                        >
                          {scoring === photo.id ? '评分中...' : '🤖 AI颜值打分'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
