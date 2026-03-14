// 验证工具函数

// 检测乱填模式
export function isNonsense(text) {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();
  if (trimmed.length < 2) return true;
  
  const vaguePatterns = [
    /^[啊哦嗯哈嘿呵哼]+$/i,           // 纯语气词
    /^[asdfojkl;qwer]{3,}$/i,         // 键盘乱敲
    /^[1234567890]{2,}$/,             // 纯数字
    /^(.)\1{2,}$/,                    // 重复字符
    /不知道|随便|都行|随便填|test|测试|aaa|bbb|ccc|ddd/i  // 敷衍词
  ];
  
  return vaguePatterns.some(p => p.test(trimmed));
}

// 检测合理年份
export function isValidBirthYear(year) {
  const y = parseInt(year);
  if (isNaN(y)) return false;
  
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 65;  // 65岁
  const maxYear = currentYear - 18;  // 18岁
  
  return y >= minYear && y <= maxYear;
}

// 检测有效城市名
export function isValidCity(city) {
  if (!city || typeof city !== 'string') return false;
  const trimmed = city.trim();
  if (trimmed.length < 2) return false;
  
  // 必须包含中文字符
  const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
  // 不能是乱填
  const notNonsense = !isNonsense(trimmed);
  
  return hasChinese && notNonsense;
}

// 检测职业描述
export function isValidOccupation(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  // 不能纯数字
  if (/^[0-9]+$/.test(trimmed)) return false;
  // 不能是乱填
  return !isNonsense(trimmed);
}

// 执行验证
export function validate(value, rules) {
  const errors = [];
  const warnings = [];
  
  for (const rule of rules) {
    let isValid = true;
    let message = rule.message;
    
    // 必填检查
    if (rule.required && (!value || value.toString().trim() === '')) {
      isValid = false;
    }
    
    // 长度检查
    if (rule.min !== undefined && value && value.length < rule.min) {
      isValid = false;
    }
    if (rule.max !== undefined && value && value.length > rule.max) {
      isValid = false;
    }
    
    // 自定义检查
    if (rule.check) {
      switch (rule.check) {
        case 'nonsense':
          isValid = !isNonsense(value);
          break;
        case 'birthYear':
          isValid = isValidBirthYear(value);
          break;
        case 'city':
          isValid = isValidCity(value);
          break;
        case 'occupation':
          isValid = isValidOccupation(value);
          break;
      }
    }
    
    // 正则检查
    if (rule.pattern && value && !rule.pattern.test(value)) {
      isValid = false;
    }
    
    if (!isValid) {
      if (rule.mode === 'warn') {
        warnings.push(message);
      } else {
        errors.push(message);
      }
    }
  }
  
  return { isValid: errors.length === 0, errors, warnings };
}

// 验证单个问题
export function validateQuestion(question, value) {
  if (!question.validation) return { isValid: true, errors: [], warnings: [] };
  
  const { mode, rules } = question.validation;
  
  // 给每个规则添加模式
  const rulesWithMode = rules.map(r => ({
    ...r,
    mode: r.mode || mode
  }));
  
  return validate(value, rulesWithMode);
}
