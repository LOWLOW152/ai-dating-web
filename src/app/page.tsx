"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// 图标组件
const ChatIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg 
    className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// FAQ数据
const faqData = [
  {
    question: "AI怎么知道我想要什么样的人？",
    answer: "通过30道深度对话题。不同于传统的选择题，AI会根据你的回答追问、澄清、总结，最终生成你的「三观画像」和「情感需求标签」。这不是测试题，而是一次深入的自我探索。"
  },
  {
    question: "为什么只推荐3个人？",
    answer: '我们相信"少即是多"。传统相亲平台给你100个选择，你会陷入选择困难；我们经过AI三层筛选（系统硬条件 → AI初筛 → AI深度匹配），只保留最契合的3位，帮你节省时间，也让你认真对待每一次可能。'
  },
  {
    question: "不涉及物质条件的匹配，靠谱吗？",
    answer: '我们不是说物质不重要，而是认为"三观契合、性格互补、生活方式匹配"才是长期关系的基础。至于收入、房产这些，你们聊得来之后自然会聊到。先聊透，再谈条件。'
  },
  {
    question: "隐私安全吗？",
    answer: "你的所有对话内容仅用于生成个人档案和匹配，不会展示给其他用户。双方匹配后，也只能看到AI生成的「标签画像」，而不是完整的对话记录。"
  },
  {
    question: "怎么开始？",
    answer: "由于目前还在内测阶段，需要邀请码才能体验。点击上方按钮领取今日邀请码，即可开始你的AI深度对话。"
  }
];

// 步骤卡片组件
const StepCard = ({ 
  number, 
  icon, 
  title, 
  description 
}: { 
  number: string; 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) => (
  <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
    <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center text-amber-600 mb-6">
      {icon}
    </div>
    <div className="text-sm text-gray-400 font-medium mb-2">步骤 {number}</div>
    <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

// FAQ项组件
const FAQItem = ({ 
  question, 
  answer, 
  isOpen, 
  onClick 
}: { 
  question: string; 
  answer: string; 
  isOpen: boolean; 
  onClick: () => void;
}) => (
  <div className="border-b border-gray-100 last:border-0">
    <button
      onClick={onClick}
      className="w-full py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-lg"
    >
      <span className="font-medium text-gray-900 pr-4">{question}</span>
      <ChevronDownIcon isOpen={isOpen} />
    </button>
    {isOpen && (
      <div className="pb-5 text-gray-600 leading-relaxed animate-in slide-in-from-top-1 duration-200">
        {answer}
      </div>
    )}
  </div>
);

export default function Home() {
  const router = useRouter();
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  const scrollToInvite = () => {
    // 滚动到邀请码区域或跳转
    const element = document.getElementById("invite-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/claim");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                狗
              </div>
              <div>
                <span className="font-bold text-gray-900">狗蛋AI相亲</span>
                <span className="hidden sm:inline text-xs text-gray-400 ml-2">先聊透，再心动</span>
              </div>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/claim" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                验证邀请码
              </Link>
              <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                关于我们
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO区域 */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-24 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          {/* 标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-full mb-8">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-amber-700 font-medium">内测阶段 · 每日限100人</span>
          </div>

          {/* 主标题 */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            不讲条件的相亲
            <br />
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              和AI聊透30道题
            </span>
            <br />
            匹配真正懂你的人
          </h1>

          {/* 副标题 */}
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            告别"有房吗、有车吗、多少收入"的尬聊。
            <br className="hidden sm:block" />
            狗蛋用AI深度对话，读懂你的三观、性格和情感需求，
            <br className="hidden sm:block" />
            只为你推荐最契合的3个人。
          </p>

          {/* CTA按钮组 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={scrollToInvite}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 hover:-translate-y-0.5 transition-all text-lg"
            >
              免费领取今日邀请码，开始匹配
            </button>
            <Link 
              href="/demo" 
              className="w-full sm:w-auto px-8 py-4 text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center justify-center gap-2"
            >
              先看看AI会聊些什么
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* 已有邀请码入口 */}
          <p className="mt-6 text-sm text-gray-500">
            已有邀请码？
            <Link href="/chat" className="text-amber-600 hover:text-amber-700 font-medium underline decoration-amber-300 underline-offset-4">
              直接开始答题 →
            </Link>
          </p>
        </div>
      </section>

      {/* 数据信任条 */}
      <section className="py-8 bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">1,247</div>
              <div className="text-sm text-gray-500">已完成AI深度对话</div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-gray-200"></div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">8.6/10</div>
              <div className="text-sm text-gray-500">平均匹配满意度</div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-gray-200"></div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">3人</div>
              <div className="text-sm text-gray-500">每位只推荐3位候选人</div>
            </div>
          </div>
        </div>
      </section>

      {/* 三步流程 */}
      <section className="py-20 sm:py-28 px-4 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              怎么找到对的人？
            </h2>
            <p className="text-gray-600 text-lg">
              从"你最爱看的电影类型"聊到"你最在意伴侣的3个特质"，
              <br className="hidden sm:block" />
              AI会记住你说的每一个细节。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <StepCard
              number="01"
              icon={<ChatIcon />}
              title="深度对话"
              description="和AI聊30道情感话题，不是冷冰冰的填表。AI会追问、会总结，像朋友一样和你聊透三观和性格。"
            />
            <StepCard
              number="02"
              icon={<ChartIcon />}
              title="生成档案"
              description="AI提炼你的三观画像、性格标签和情感需求，生成一份独属于你的「灵魂说明书」。"
            />
            <StepCard
              number="03"
              icon={<HeartIcon />}
              title="精准匹配"
              description="只推荐3位高度契合的对象，不多不少。AI还会为你们生成破冰话题，不用担心尬聊。"
            />
          </div>
        </div>
      </section>

      {/* 对比区 */}
      <section className="py-20 sm:py-28 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              传统相亲 vs 狗蛋AI相亲
            </h2>
          </div>

          <div className="bg-gray-50 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-2">
              {/* 表头 */}
              <div className="p-6 bg-gray-100 border-r border-gray-200">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  传统相亲App
                </span>
              </div>
              <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50">
                <span className="text-sm font-semibold text-amber-700 uppercase tracking-wider">
                  狗蛋AI相亲
                </span>
              </div>

              {/* 对比行 */}
              {[
                ["先看照片和硬性条件", "先聊三观和性格"],
                ["匹配100人，自己慢慢筛", "AI精选3人，高效省心"],
                ["开口就问收入、房车、户口", "话题从生活方式聊到人生排序"],
                ["尬聊开场，不知道怎么接话", "AI生成档案，帮你们破冰"],
                ["海量的选择，越看越焦虑", "只给3个，认真了解每一个"],
              ].map(([traditional, ours], index) => (
                <div key={index} className="contents">
                  <div className="p-6 border-t border-r border-gray-200 text-gray-400 line-through">
                    {traditional}
                  </div>
                  <div className="p-6 border-t border-gray-200 text-gray-900 font-medium">
                    {ours}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-gray-500 mt-8 text-lg">
            我们不追求最多的选择，只追求最对的那个人。
          </p>
        </div>
      </section>

      {/* 用户评价 */}
      <section className="py-20 sm:py-28 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              他们怎么说
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-gray-100 relative">
            {/* 引号装饰 */}
            <div className="absolute top-6 left-8 text-8xl text-amber-100 font-serif leading-none select-none">
              "
            </div>
            
            <div className="relative z-10">
              <p className="text-xl sm:text-2xl text-gray-800 leading-relaxed mb-8">
                我以为相亲就是互报条件，没想到AI问的都是"你休息日喜欢宅家还是出门"、"你最受不了伴侣什么习惯"这种问题。聊完之后我突然清楚自己到底想要什么样的人了。
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center text-amber-700 font-bold">
                  林
                </div>
                <div>
                  <div className="font-semibold text-gray-900">小林</div>
                  <div className="text-sm text-gray-500">28岁，产品经理，已完成匹配</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              你可能想问
            </h2>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 sm:p-8">
            {faqData.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === index}
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 底部CTA */}
      <section id="invite-section" className="py-20 sm:py-28 px-4 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            准备好重新认识自己的情感需求了吗？
          </h2>
          
          <button 
            onClick={() => router.push("/claim")}
            className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-amber-500/25 hover:-translate-y-1 transition-all text-xl mb-6"
          >
            免费领取今日邀请码
          </button>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              预计耗时：15-20分钟
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              完全免费
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              内测阶段每日限100人
            </span>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                狗
              </div>
              <span className="font-bold">狗蛋AI相亲实验室</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/about" className="hover:text-white transition-colors">关于我们</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">隐私政策</Link>
              <a href="mailto:hello@ai-dating.top" className="hover:text-white transition-colors">联系我们</a>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
            © 2026 狗蛋AI相亲. 认真对待每一段缘分.
          </div>
        </div>
      </footer>
    </div>
  );
}
