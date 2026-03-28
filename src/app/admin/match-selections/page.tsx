'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MatchSelectionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get('profileId');
  const add = searchParams.get('add');

  useEffect(() => {
    async function handleAdd() {
      if (!profileId || !add) {
        router.push('/admin/profiles');
        return;
      }

      const confirmed = confirm('确定增加1次重新匹配机会吗？');
      if (!confirmed) {
        router.push(`/admin/profiles/${profileId}`);
        return;
      }

      try {
        const res = await fetch('/api/admin/match/selections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, addCount: parseInt(add) || 1 })
        });

        const data = await res.json();

        if (data.success) {
          alert('已增加重新匹配次数');
        } else {
          alert(data.error || '增加失败');
        }
      } catch {
        alert('请求失败');
      }

      router.push(`/admin/profiles/${profileId}`);
    }

    handleAdd();
  }, [profileId, add, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">处理中...</p>
    </div>
  );
}

export default function MatchSelectionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    }>
      <MatchSelectionsContent />
    </Suspense>
  );
}
