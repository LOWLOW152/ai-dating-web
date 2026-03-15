import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { validateQuestion } from '../lib/validation';

export default function Chat() {
  const router = useRouter();
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  
  // 题库相关
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState('');
  
  const [messages, setMessages] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestionIndexRef = useRef(0);
  const [inputValue, setInputValue] = useState('');
  const [answers, setAnswers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // 追问状态
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [dogQuestionsQueue, setDogQuestionsQueue] = useState([]);
  
  // 验证状态
  const [validationWarning, setValidationWarning] = useState(null);
  const [pendingAnswer, setPendingAnswer] = useState(null);
  
  // 多选题状态
  const [selectedOptions, setSelectedOptions] = useState([]);
  
  // 偏好题状态
  const [isPreferenceQuestion, setIsPreferenceQuestion] = useState(false);
  const [originalAnswer, setOriginalAnswer] = useState(null);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex];

  // 获取题库
  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoadingQuestions(true);
      const res = await fetch('/api/questions?is_active=true');
      const data = await res.json();
      
      if (data.success) {
        // 转换题库格式为前端可用格式
        // 按 part 和 group 排序，确保配对的题目在一起
        const sortedQuestions = data.questions.sort((a, b) => {
          if (a.part !== b.part) return a.part - b.part;
          if (a.question_group && b.question_group && a.question_group === b.question_group) {
            // 同一组内，偏好题放后面
            if (a.is_preference_for && !b.is_preference_for) return 1;
            if (!a.is_preference_for && b.is_preference_for) return -1;
          }
          return a.display_order - b.display_order || a.id - b.id;
        });
        
        const formattedQuestions = sortedQuestions.map(q => ({
          id: q.question_key,
          type: q.part === 1 ? 'auto' : q.part === 2 ? 'semi' : 'dog',
          category: getCategoryLabel(q.category),
          question: q.question_text,
          questionType: q.question_type,
          options: q.options,
          isAiMonitored: q.is_ai_monitored,
          aiPrompt: q.ai_prompt,
          part: q.part,
          // 偏好题信息
          hasPreference: q.has_preference,
          preferenceText: q.preference_text,
          preferenceDefault: q.preference_default,
          preferenceOptions: q.preference_options,
          manualScoring: q.manual_scoring
        }));
        
        setQuestions(formattedQuestions);
      } else {
        setQuestionsError(data.error || '获取题目失败');
      }
    } catch (err) {
      console.error('获取题目失败:', err);
      setQuestionsError('网络错误，请刷新重试');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const getCategoryLabel = (category) => {
    const map = {
      basic: '基础信息',
      interest: '兴趣话题',
      social: '社交偏好',
      lifestyle: '生活方式',
      values: '价值观',
      emotion: '情感核心'
    };
    return map[category] || category;
  };
  
  // 同步 ref 和 state
  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // 初始化语音
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'zh-CN';
        recognitionRef.current.onstart = () => setIsListening(true);
        recognitionRef.current.onend = () => setIsListening(false);
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setTimeout(() => handleSendWithText(transcript), 500);
        };
      }
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // 初始化：显示欢迎语和第一题（等题目加载完成后）
  useEffect(() => {
    if (!loadingQuestions && questions.length > 0 && messages.length === 0) {
      addMessage(`哈喽～我是狗蛋 🐶\n\n接下来${questions.length}个轻松问题，一起探索真实的你。准备好了吗？`, false, 'welcome');
      setTimeout(() => {
        askQuestionByIndex(0);
      }, 1000);
    }
  }, [loadingQuestions, questions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakText = useCallback((text) => {
    if (!voiceMode || !synthRef.current) return;
    const utterance = new SpeechSynthesisUtterance(text.replace(/[🐶\n]/g, ''));
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('zh'));
    if (preferredVoice) utterance.voice = preferredVoice;
    synthRef.current.speak(utterance);
  }, [voiceMode]);

  const addMessage = (text, isUser, type = 'normal') => {
    const time = getCurrentTime();
    setMessages(prev => [...prev, { text, isUser, type, id: Date.now(), time }]);
  };

  // 提问当前问题
  const askCurrentQuestion = () => {
    if (!currentQuestion) {
      finishSurvey();
      return;
    }

    const q = currentQuestion;
    let questionText = q.question;
    
    // 阶段性提示
    if (currentQuestionIndex === 8) {
      addMessage('基础信息收集完成！接下来进入兴趣话题部分 🌿', false, 'system');
    } else if (currentQuestionIndex === 17) {
      addMessage('兴趣部分完成！接下来聊聊生活方式 🏠', false, 'system');
    } else if (currentQuestionIndex === 26) {
      addMessage('生活部分完成！最后几个深度问题，不用着急，慢慢想～ 💭', false, 'system');
    }

    // Dog类型题目特殊提示
    if (q.type === 'dog' && !isFollowUp) {
      questionText = '【深度题】' + questionText;
    }

    setTimeout(() => {
      addMessage(questionText, false, 'question');
      if (voiceMode) speakText(questionText);
    }, 500);
  };

  // 检查回答是否模糊
  const isVagueAnswer = (answer) => {
    const vagueWords = ['还行', '一般', '看情况', '都可以', '差不多', '还好', '随便', '无所谓'];
    return vagueWords.some(word => answer.includes(word)) || answer.length < 5;
  };

  // 生成追问
  const generateFollowUp = (question, answer) => {
    const vagueResponses = [
      '能多说一点吗？我想更了解真实的你～',
      '这个回答有点模糊呢，可以举个例子吗？',
      '不想说也没关系，但如果愿意多说一点，档案会更准确哦～',
      '具体是什么样的呢？',
      '如果用一件具体的事来形容，会是什么？'
    ];
    
    const specificResponses = {
      '兴趣爱好': `你对"${answer}"最感兴趣的部分是什么？`,
      '长期爱好': '这个爱好是怎么开始的呢？',
      '近期关注': '这个作品什么地方最打动你？',
      '旅行偏好': '那次旅行印象最深的是什么？',
      '家庭关系': '这个词背后，可以多说一点点吗？不用太多～',
      '当前状态': '是什么让你有这种感觉的呢？',
      '信任点': '能举一个具体的例子吗？',
      '被理解经历': '那是什么样的场景呢？',
      '关系盲点': '你注意到自己什么时候会这样？',
      '理想关系': '这三个词背后，你最看重哪个？',
      '核心需求': '这个需求对你来说意味着什么？',
      '冲突处理': '你之前经历过类似的情况吗？',
      '关系红线': '为什么这个绝对不能接受？',
      '未来画面': '那个画面里，你们在做些什么？'
    };

    if (isVagueAnswer(answer)) {
      return vagueResponses[Math.floor(Math.random() * vagueResponses.length)];
    }
    
    return specificResponses[question.category] || vagueResponses[0];
  };

  // 处理用户发送
  const handleSendWithText = async (text) => {
    if (!text.trim()) return;

    const userAnswer = text.trim();
    
    // Test 模式：输入 test 快速跳过所有追问
    const isTestMode = userAnswer.toLowerCase() === 'test';
    
    addMessage(userAnswer, true);
    setInputValue('');

    // 验证答案（非Test模式）
    if (!isTestMode && currentQuestion.validation) {
      const validation = validateQuestion(currentQuestion, userAnswer);
      
      // 阻断式验证：有错误则阻止继续
      if (!validation.isValid && validation.errors.length > 0) {
        setIsTyping(true);
        await new Promise(resolve => setTimeout(resolve, 400));
        setIsTyping(false);
        
        // 显示错误提示
        addMessage(`⚠️ ${validation.errors[0]}\n\n请重新回答这题～`, false, 'error');
        if (voiceMode) speakText(validation.errors[0] + '，请重新回答这题');
        return; // 不保存答案，不进入下一题
      }
      
      // 警告式验证：有警告则提示但允许继续
      if (validation.warnings.length > 0) {
        setValidationWarning(validation.warnings[0]);
        setPendingAnswer(userAnswer);
        setIsTyping(true);
        await new Promise(resolve => setTimeout(resolve, 400));
        setIsTyping(false);
        
        // 显示警告提示，等待用户确认
        addMessage(`⚠️ ${validation.warnings[0]}\n\n回复「确认」继续，或重新输入修改`, false, 'warning');
        if (voiceMode) speakText(validation.warnings[0] + '，回复确认继续，或重新输入修改');
        return; // 等待用户确认
      }
    }
    
    // 如果有待确认的警告答案，且用户回复"确认"
    if (validationWarning && (userAnswer === '确认' || userAnswer === '确定')) {
      setValidationWarning(null);
      const answerToSave = pendingAnswer;
      setPendingAnswer(null);
      // 继续处理保存逻辑
      await processAnswer(answerToSave, false);
      return;
    }
    
    // 如果有待确认的警告答案，但用户输入了新内容（放弃之前的）
    if (validationWarning) {
      setValidationWarning(null);
      setPendingAnswer(null);
      // 用新答案重新验证
      if (currentQuestion.validation) {
        const validation = validateQuestion(currentQuestion, userAnswer);
        if (!validation.isValid && validation.errors.length > 0) {
          setIsTyping(true);
          await new Promise(resolve => setTimeout(resolve, 400));
          setIsTyping(false);
          addMessage(`⚠️ ${validation.errors[0]}\n\n请重新回答这题～`, false, 'error');
          return;
        }
      }
    }
    
    setIsTyping(true);

    // 保存答案（使用 question_key 作为键）
    const answerKey = isPreferenceQuestion 
      ? `${currentQuestion.id}_preference` 
      : currentQuestion.id;
    
    const newAnswers = { 
      ...answers, 
      [answerKey]: isTestMode ? '[快速测试]' : userAnswer 
    };
    setAnswers(newAnswers);

    await processAnswer(userAnswer, isTestMode);
  };
  
  // 处理答案（验证后的逻辑）
  const processAnswer = async (userAnswer, isTestMode) => {
    await new Promise(resolve => setTimeout(resolve, 600));

    // Test 模式：直接过，不追问
    if (isTestMode) {
      setIsTyping(false);
      addMessage('🧪 测试模式：跳过追问', false, 'system');
      goToNextQuestion();
      return;
    }

    // 检查是否需要显示偏好题
    if (!isPreferenceQuestion && currentQuestion.hasPreference && currentQuestion.preferenceText) {
      setIsTyping(false);
      setIsPreferenceQuestion(true);
      setOriginalAnswer(userAnswer);
      
      // 显示偏好题
      setTimeout(() => {
        const prefText = '【匹配偏好】' + currentQuestion.preferenceText;
        addMessage(prefText, false, 'question');
        if (voiceMode) speakText(currentQuestion.preferenceText);
        
        // 如果有偏好选项，显示按钮
        if (currentQuestion.preferenceOptions && currentQuestion.preferenceOptions.length > 0) {
          const optionsText = currentQuestion.preferenceOptions.map(opt => `• ${opt.label}`).join('\n');
          setTimeout(() => {
            addMessage('可选：\n' + optionsText, false, 'options');
          }, 300);
        }
      }, 500);
      return;
    }

    // 根据题目类型处理
    const qType = currentQuestion.type;
    
    if (qType === 'auto') {
      // Auto题：直接过
      setIsTyping(false);
      goToNextQuestion();
      
    } else if (qType === 'semi') {
      // Semi题：调用后端AI判断是否追问
      if (!isFollowUp) {
        setIsTyping(false);
        addMessage('🤔 让我想想...', false, 'system');
        
        try {
          const response = await fetch('/api/followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: currentQuestion.question,
              answer: userAnswer,
              questionType: 'semi'
            })
          });
          
          const data = await response.json();
          
          if (data.needFollowUp && data.followUp) {
            // 豆包返回的追问，加上🤔标识
            const displayText = data.source === 'doubao' 
              ? `${data.followUp} 🤔` 
              : data.followUp;
            addMessage(displayText, false, 'followup');
            if (voiceMode) speakText(data.followUp);
            setIsFollowUp(true);
            setFollowUpCount(1);
          } else {
            // 不需要追问，给用户一个反馈再下一题
            addMessage('明白了，继续下一题～', false, 'system');
            setTimeout(() => goToNextQuestion(), 800);
          }
        } catch (error) {
          console.error('追问请求失败:', error);
          // 失败时直接过
          goToNextQuestion();
        }
      } else {
        // 已追问过，进入下一题
        setIsTyping(false);
        setIsFollowUp(false);
        setFollowUpCount(0);
        goToNextQuestion();
      }
      
    } else if (qType === 'dog') {
      // Dog题：调用后端AI深度追问
      setIsTyping(false);
      
      // 添加到Dog队列
      const dogItem = {
        question: currentQuestion,
        answer: userAnswer,
        userId: 'current',
        timestamp: Date.now()
      };
      setDogQuestionsQueue(prev => [...prev, dogItem]);
      
      // 提示已记录
      addMessage('✓ 已记录。这是一道深度题，让我再深挖一下...', false, 'system');
      
      if (!isFollowUp) {
        try {
          const response = await fetch('/api/followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: currentQuestion.question,
              answer: userAnswer,
              questionType: 'dog'
            })
          });
          
          const data = await response.json();
          
          if (data.needFollowUp && data.followUp) {
            // 豆包返回的深度追问，加上🤔标识
            const displayText = data.source === 'doubao' 
              ? `${data.followUp} 🤔` 
              : data.followUp;
            addMessage(displayText, false, 'followup');
            if (voiceMode) speakText(data.followUp);
            setIsFollowUp(true);
          } else {
            // 不需要追问
            setIsFollowUp(false);
            goToNextQuestion();
          }
        } catch (error) {
          console.error('深度追问失败:', error);
          // 失败时直接过
          setIsFollowUp(false);
          goToNextQuestion();
        }
      } else {
        setIsFollowUp(false);
        goToNextQuestion();
      }
    }
  };

  // 进入下一题
  const goToNextQuestion = () => {
    const currentIdx = currentQuestionIndexRef.current;
    const nextIndex = currentIdx + 1;
    
    // 清空状态
    setSelectedOptions([]);
    setIsPreferenceQuestion(false);
    setOriginalAnswer(null);
    
    if (nextIndex < totalQuestions) {
      setCurrentQuestionIndex(nextIndex);
      currentQuestionIndexRef.current = nextIndex;
      setIsFollowUp(false);
      setFollowUpCount(0);
      
      // 使用 nextIndex 直接获取下一题
      setTimeout(() => {
        askQuestionByIndex(nextIndex);
      }, 800);
    } else {
      finishSurvey();
    }
  };
  
  // 根据索引提问
  const askQuestionByIndex = (index) => {
    const q = questions[index];
    if (!q) {
      finishSurvey();
      return;
    }

    let questionText = q.question;
    
    // 阶段性提示
    if (index === 8) {
      addMessage('基础信息收集完成！接下来进入兴趣话题部分 🌿', false, 'system');
    } else if (index === 17) {
      addMessage('兴趣部分完成！接下来聊聊生活方式 🏠', false, 'system');
    } else if (index === 26) {
      addMessage('生活部分完成！最后几个深度问题，不用着急，慢慢想～ 💭', false, 'system');
    }

    // Dog类型题目特殊提示
    if (q.type === 'dog') {
      questionText = '【深度题】' + questionText;
    }

    setTimeout(() => {
      addMessage(questionText, false, 'question');
      if (voiceMode) speakText(questionText);
    }, 500);
  };

  // 选择选项
  const handleOptionSelect = (value) => {
    setInputValue(value);
    // 自动发送
    setTimeout(() => handleSendWithText(value), 100);
  };

  // 多选题选择
  const handleMultiSelect = (value) => {
    setSelectedOptions(prev => {
      if (prev.includes(value)) {
        return prev.filter(v => v !== value);
      }
      return [...prev, value];
    });
  };

  // 多选题提交
  const handleMultiSubmit = () => {
    if (selectedOptions.length < 3) {
      return;
    }
    const value = selectedOptions.join('、');
    handleSendWithText(value);
    setSelectedOptions([]); // 清空选择
  };

  // 完成问卷
  const finishSurvey = (finalAnswers = null) => {
    const completeMsg = '问卷完成！正在生成你的相亲档案...';
    addMessage(completeMsg, false, 'system');
    
    if (voiceMode) speakText(completeMsg);
    
    // 生成档案摘要，传入最终答案
    setTimeout(() => {
      generateProfile(finalAnswers);
    }, 2000);
  };

  // 生成档案
  const generateProfile = (finalAnswers = null) => {
    // 使用传入的最终答案或当前 state
    const ans = finalAnswers || answers;
    
    const profile = {
      basicInfo: {
        nickname: ans.nickname || '未填写',
        gender: ans.gender || '未填写',
        birthYear: ans.birthYear || '未填写',
        city: ans.city || '未填写',
        occupation: ans.occupation || '未填写',
        education: ans.education || '未填写',
        acceptLongDistance: ans.acceptLongDistance || '未填写',
        ageRange: ans.ageRange || '未填写',
      },
      deepProfile: {
        interests: ans.hobbyType || ans.longTermHobby || '未详细描述',
        lifestyle: ans.weekendStyle || ans.sleepSchedule || '未详细描述',
        values: ans.spendingHabit || ans.lifePreference || '未详细描述',
        personality: ans.currentState || ans.trustedFor || '需要进一步挖掘',
        relationship: ans.coreNeed || ans.idealRelationship || '需要进一步挖掘',
        redFlags: ans.dealBreakers || '未明确',
      },
      dogInterventionNeeded: dogQuestionsQueue.length > 0,
      dogQueue: dogQuestionsQueue
    };

    addMessage('📋 档案已生成！\n\n' + 
      '【基础信息】\n' +
      `昵称：${profile.basicInfo.nickname}\n` +
      `性别：${profile.basicInfo.gender}\n` +
      `城市：${profile.basicInfo.city}\n\n` +
      (profile.dogInterventionNeeded ? 
        `【需人工复核】${profile.dogQueue.length} 道深度题需要我进一步追问` : 
        '【状态】自动采集完成'),
      false, 'profile');

    // 提示正在生成文件，5秒后下载
    addMessage('⏳ 正在生成 CSV 档案，请稍候...', false, 'system');
    
    setTimeout(() => {
      // 保存到服务器（下载文件）
      saveProfileToServer(profile, ans);
    }, 5000);

    // 实际应该保存到数据库并跳转到结果页
    setTimeout(() => {
      router.push({
        pathname: '/result',
        query: { answers: JSON.stringify(answers) },
      });
    }, 8000);
  };

  // 保存档案到服务器
  const saveProfileToServer = async (profile, finalAnswers) => {
    try {
      // 使用传入的最终答案
      const ans = finalAnswers || answers;
      
      // 获取邀请码
      const inviteCode = sessionStorage.getItem('inviteCode');
      if (!inviteCode) {
        addMessage('⚠️ 邀请码丢失，请重新进入', false, 'system');
        return;
      }
      
      // 调用后端 API 保存到数据库
      const res = await fetch('/api/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: ans,
          profile: {
            ...profile,
            followupLogs: messages
              .filter(m => m.type === 'followup')
              .map(m => ({ question: m.question, answer: m.text }))
          },
          timestamp: new Date().toISOString(),
          inviteCode
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        addMessage(`✅ 档案已保存！档案ID：${data.profileId}\n\n狗蛋会尽快帮你分析并推荐合适的对象～`, false, 'system');
      } else {
        addMessage(`⚠️ 保存失败：${data.message || '请重试'}`, false, 'system');
      }
      
      // 仍然生成 CSV 供用户下载备份
      const csvContent = generateCSVContent(ans, profile);
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      const nickname = ans.nickname || '匿名';
      const filename = `${date}_${nickname}_相亲档案.csv`;
      
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('保存档案失败:', error);
      addMessage('⚠️ 档案保存失败，请重试', false, 'system');
    }
  };
  
  // 生成 CSV 内容（前端版）
  const generateCSVContent = (answers, profile) => {
    const lines = [];
    lines.push('字段,内容,分类');
    lines.push('');
    
    // 基础信息
    lines.push('=== 基础信息 ===,,');
    lines.push(`昵称,${answers.nickname || ''},基础`);
    lines.push(`性别,${answers.gender || ''},基础`);
    lines.push(`出生年份,${answers.birthYear || ''},基础`);
    lines.push(`城市,${answers.city || ''},基础`);
    lines.push(`职业,${answers.occupation || ''},基础`);
    lines.push(`学历,${answers.education || ''},基础`);
    lines.push(`能否接受异地,${answers.acceptLongDistance || ''},基础`);
    lines.push(`接受年龄差,${answers.ageRange || ''},基础`);
    lines.push('');
    
    // 兴趣爱好
    lines.push('=== 兴趣爱好 ===,,');
    lines.push(`休息时最常做的事,${answers.hobbyType || ''},兴趣`);
    lines.push(`周末怎么过,${answers.weekendStyle || ''},兴趣`);
    lines.push(`坚持三年以上,${answers.longTermHobby || ''},兴趣`);
    lines.push(`旅行偏好,${answers.travelStyle || ''},兴趣`);
    lines.push(`独处时想什么,${answers.spiritualEnjoyment || ''},兴趣`);
    lines.push(`消费决策,${answers.recentInterest || ''},兴趣`);
    lines.push(`交友偏好,${answers.friendPreference || ''},兴趣`);
    lines.push(`理想日常,${answers.uniqueHobby || ''},兴趣`);
    lines.push('');
    
    // 生活底色
    lines.push('=== 生活底色 ===,,');
    lines.push(`消费观,${answers.spendingHabit || ''},生活`);
    lines.push(`作息类型,${answers.sleepSchedule || ''},生活`);
    lines.push(`整洁程度,${answers.tidiness || ''},生活`);
    lines.push(`压力应对,${answers.stressResponse || ''},生活`);
    lines.push(`决策方式,${answers.decisionStyle || ''},生活`);
    lines.push(`家庭关系,${answers.familyRelationship || ''},生活`);
    lines.push(`计划性,${answers.planningStyle || ''},生活`);
    lines.push(`成就感来源,${answers.achievementSource || ''},生活`);
    lines.push(`独处感受,${answers.solitudeFeeling || ''},生活`);
    lines.push(`生活偏好,${answers.lifePreference || ''},生活`);
    lines.push('');
    
    // 核心人格
    lines.push('=== 核心人格（需人工复核）===,,');
    lines.push(`当前状态,${answers.currentState || ''},核心`);
    lines.push(`朋友信任点,${answers.trustedFor || ''},核心`);
    lines.push(`被理解经历,${answers.understoodMoment || ''},核心`);
    lines.push(`关系盲点,${answers.relationshipBlindspot || ''},核心`);
    lines.push(`理想关系,${answers.idealRelationship || ''},核心`);
    lines.push('');
    
    // 相处偏好
    lines.push('=== 相处偏好（需人工复核）===,,');
    lines.push(`核心需求,${answers.coreNeed || ''},相处`);
    lines.push(`冲突处理,${answers.conflictHandling || ''},相处`);
    lines.push(`联系频率,${answers.contactFrequency || ''},相处`);
    lines.push(`关系红线,${answers.dealBreakers || ''},相处`);
    lines.push(`未来画面,${answers.futureVision || ''},相处`);
    lines.push('');
    
    // 元信息
    lines.push('=== 元信息 ===,,');
    lines.push(`完成时间,${new Date().toISOString()},系统`);
    lines.push(`需复核题目数,${profile.dogQueue?.length || 0},系统`);
    lines.push(`档案状态,${profile.dogInterventionNeeded ? '需人工复核' : '自动完成'},系统`);
    
    return lines.join('\n');
  };

  const handleSend = () => handleSendWithText(inputValue);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startListening = () => {
    if (!recognitionRef.current || isListening) return;
    recognitionRef.current.start();
  };

  const toggleVoiceMode = () => {
    setVoiceMode(!voiceMode);
  };

  // 微信绿色
  const wechatGreen = '#95ec69';

  return (
    <>
      <Head>
        <title>狗蛋 - 聊天</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* 顶部导航栏 */}
        <header style={{
          backgroundColor: '#ededed',
          borderBottom: '1px solid #d9d9d9',
          padding: '12px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <div style={{
            maxWidth: '680px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <button 
              onClick={() => router.push('/')}
              style={{ background: 'none', border: 'none', fontSize: '24px', color: '#333', cursor: 'pointer' }}
            >
              ‹
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '4px', backgroundColor: '#07c160',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px'
              }}>🐶</div>
              <div>
                <h1 style={{ fontSize: '17px', fontWeight: 600, color: '#333', margin: 0 }}>狗蛋</h1>
                <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                  第 {Math.min(currentQuestionIndex + 1, totalQuestions)}/{totalQuestions} 题
                  {currentQuestion?.type === 'dog' && ' · 深度'}
                </p>
              </div>
            </div>
            
            <button
              onClick={toggleVoiceMode}
              style={{
                padding: '8px', borderRadius: '50%', border: 'none',
                backgroundColor: voiceMode ? '#07c160' : 'transparent',
                color: voiceMode ? '#fff' : '#666', cursor: 'pointer'
              }}
            >
              🔊
            </button>
          </div>
        </header>

        {/* 聊天区域 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            {/* 加载中 */}
            {loadingQuestions && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                <div style={{ marginBottom: '16px' }}>📚 正在加载题目...</div>
                <div style={{ fontSize: '14px' }}>请稍候</div>
              </div>
            )}
            
            {/* 错误提示 */}
            {questionsError && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>❌ {questionsError}</div>
                <button
                  onClick={fetchQuestions}
                  style={{
                    padding: '10px 20px',
                    background: '#07c160',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  重新加载
                </button>
              </div>
            )}
            
            {!loadingQuestions && !questionsError && messages.map((msg) => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.isUser ? 'flex-end' : 'flex-start',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>{msg.time}</span>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexDirection: msg.isUser ? 'row-reverse' : 'row'
                }}>
                  {/* 头像 */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '4px',
                    backgroundColor: msg.isUser ? '#ccc' : '#07c160',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                    marginLeft: msg.isUser ? '10px' : '0',
                    marginRight: msg.isUser ? '0' : '10px',
                    flexShrink: 0
                  }}>
                    {msg.isUser ? '😊' : '🐶'}
                  </div>
                  
                  {/* 气泡 - 不同类型不同样式 */}
                  <div style={{
                    maxWidth: '280px',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    backgroundColor: msg.isUser ? wechatGreen : 
                                    msg.type === 'system' ? '#e6f7ff' : 
                                    msg.type === 'followup' ? '#fff7e6' : '#fff',
                    color: '#000',
                    fontSize: '15px',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: msg.type === 'followup' ? '1px solid #ffd591' : 'none'
                  }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            
            {/* 空状态 - 等待题目加载 */}
            {!loadingQuestions && !questionsError && messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                <div>正在准备题目...</div>
              </div>
            )}
            
            {/* 正在输入 */}
            {isTyping && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#07c160',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginRight: '10px'
                  }}>🐶</div>
                  <div style={{
                    padding: '12px 16px', borderRadius: '4px', backgroundColor: '#fff',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#999', borderRadius: '50%' }}></span>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#999', borderRadius: '50%' }}></span>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#999', borderRadius: '50%' }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 底部输入区 */}
        <div style={{ backgroundColor: '#f7f7f7', borderTop: '1px solid #d9d9d9', padding: '12px 16px' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            {/* 当前问题提示 */}
            {currentQuestion && (
              <div style={{
                fontSize: '12px',
                color: '#999',
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                {currentQuestion.isPreferenceFor && '⚙️ 匹配偏好题 · '}
                {currentQuestion.type === 'auto' && '💬 基础题'}
                {currentQuestion.type === 'semi' && '🌿 探索题'}
                {currentQuestion.type === 'dog' && '💭 深度题 - 慢慢想'}
                {isFollowUp && ' · 追问中'}
              </div>
            )}
            
            {/* 选项按钮区域 */}
            {currentQuestion?.options && currentQuestion.options.length > 0 && !isFollowUp && (
              <div style={{ marginBottom: '12px' }}>
                {/* 多选题提示 */}
                {currentQuestion.questionType === 'checkbox' && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: selectedOptions.length >= 3 ? '#07c160' : '#ff9800',
                    marginBottom: '8px',
                    textAlign: 'center'
                  }}>
                    已选 {selectedOptions.length} 项
                    {selectedOptions.length < 3 && '（至少选3个）'}
                  </div>
                )}
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {currentQuestion.options.map((opt, idx) => {
                    const isMulti = currentQuestion.questionType === 'checkbox';
                    const isSelected = isMulti 
                      ? selectedOptions.includes(opt.value)
                      : inputValue === opt.value;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => isMulti 
                          ? handleMultiSelect(opt.value) 
                          : handleOptionSelect(opt.value)
                        }
                        style={{
                          padding: '8px 16px',
                          borderRadius: '16px',
                          border: isSelected ? '2px solid #07c160' : '1px solid #d9d9d9',
                          backgroundColor: isSelected ? '#07c160' : '#fff',
                          color: isSelected ? '#fff' : '#333',
                          fontSize: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {isMulti && (
                          <span>{isSelected ? '☑' : '☐'}</span>
                        )}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                
                {/* 多选题确认按钮 */}
                {currentQuestion.questionType === 'checkbox' && selectedOptions.length > 0 && (
                  <button
                    onClick={handleMultiSubmit}
                    disabled={selectedOptions.length < 3}
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '10px',
                      backgroundColor: selectedOptions.length >= 3 ? '#07c160' : '#e5e5e5',
                      color: selectedOptions.length >= 3 ? '#fff' : '#999',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: selectedOptions.length >= 3 ? 'pointer' : 'not-allowed',
                      fontSize: '15px'
                    }}
                  
                  >
                    确认选择 ({selectedOptions.length})
                  </button>
                )}
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={isListening ? () => {} : startListening}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #d9d9d9',
                  backgroundColor: isListening ? '#ff4d4f' : '#fff',
                  color: isListening ? '#fff' : '#666',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '18px'
                }}
              >
                🎤
              </button>
              
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? '正在听你说...' : 
                  (currentQuestion?.options?.length > 0 && !isFollowUp ? '请选择上方选项...' : '输入消息...')}
                disabled={currentQuestion?.options?.length > 0 && !isFollowUp || isListening}
                style={{
                  flex: 1, height: '40px', padding: '0 12px',
                  border: '1px solid #d9d9d9', borderRadius: '4px',
                  fontSize: '15px', outline: 'none',
                  backgroundColor: currentQuestion?.options?.length > 0 && !isFollowUp ? '#f5f5f5' : '#fff'
                }}
              />
              
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                style={{
                  padding: '10px 20px', borderRadius: '4px', border: 'none',
                  backgroundColor: inputValue.trim() && !isTyping ? '#07c160' : '#e5e5e5',
                  color: inputValue.trim() && !isTyping ? '#fff' : '#999',
                  fontSize: '15px', fontWeight: 500,
                  cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed'
                }}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
