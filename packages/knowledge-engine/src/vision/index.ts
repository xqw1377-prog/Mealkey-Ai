/**
 * Vision Analysis — 图像识别分析模块
 *
 * 为 MealKey 添加基本的图像理解能力：
 * 1. OCR文本识别（菜单识别、合同识别）
 * 2. 菜品识别（基于已有tesseract + 规则匹配）
 * 3. 场景/环境理解（通过LLM描述图像）
 *
 * 目前使用 Tesseract.js（已在 web 依赖中）做 OCR，
 * 后续可扩展为 LLM 多模态或专用视觉模型。
 */

// ─── 识别结果类型 ───

export interface VisionAnalysisResult {
  type: "menu" | "storefront" | "receipt" | "dish" | "contract" | "unknown";
  ocrText: string;
  structured: Record<string, unknown>;
  confidence: number;
  suggestions: string[];
}

// ─── OCR 识别接口（抽象，不直接依赖 tesseract）───

export interface OCRAdapter {
  recognize(imageBase64: string, language?: string): Promise<{
    text: string;
    confidence: number;
    blocks: Array<{
      text: string;
      bbox: { x0: number; y0: number; x1: number; y1: number };
      confidence: number;
    }>;
  }>;
}

// ─── LLM 多模态接口（用于描述图片场景）───

export interface VisionLLMAdapter {
  analyzeImage(
    imageBase64: string,
    prompt?: string,
  ): Promise<{
    description: string;
    tags: string[];
    confidence: number;
  }>;
}

// ─── 默认 OCR 适配器：Tesseract.js ───

class TesseractOCRAdapter implements OCRAdapter {
  private tesseract: any = null;
  private worker: any = null;
  private initError: Error | null = null;

  private async getWorker(): Promise<any> {
    if (this.initError) throw this.initError;
    if (this.worker) return this.worker;
    try {
      // 动态导入 Tesseract（避免服务端未安装时报错）
      this.tesseract = await import("tesseract.js");
      this.worker = await this.tesseract.createWorker("chi_sim+eng");
      return this.worker;
    } catch (e) {
      this.initError = e instanceof Error ? e : new Error(String(e));
      throw this.initError;
    }
  }

  async recognize(imageBase64: string, language = "chi_sim+eng") {
    const worker = await this.getWorker();

    // 确保语言
    if (language !== "chi_sim+eng") {
      await worker.setLanguage(language);
    }

    // 识别
    const result = await worker.recognize(imageBase64);

    return {
      text: result.data.text || "",
      confidence: result.data.confidence || 0,
      blocks: (result.data.blocks || []).map((b: any) => ({
        text: b.text,
        bbox: b.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
        confidence: b.confidence || 0,
      })),
    };
  }
}

// ─── 空适配器（当 Tesseract 不可用时降级）───

class NoOPOCRAdapter implements OCRAdapter {
  async recognize(_imageBase64: string, _language?: string) {
    return {
      text: "",
      confidence: 0,
      blocks: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Vision Analyzer
// ═══════════════════════════════════════════════════════════════

export class VisionAnalyzer {
  private ocr: OCRAdapter;
  private llm?: VisionLLMAdapter;

  constructor(llm?: VisionLLMAdapter) {
    // 初始使用空适配器，后续调用 analyze 时会动态升级
    this.ocr = new NoOPOCRAdapter();
    this.llm = llm;
  }

  /**
   * 尝试升级到真正的 OCR 适配器
   */
  private async upgradeOCR(): Promise<void> {
    if (this.ocr instanceof TesseractOCRAdapter) return;
    // 检查 TESSDATA_PREFIX 环境变量，没有则跳过 OCR 初始化
    const tessdataPrefix = typeof process !== "undefined" ? process.env.TESSDATA_PREFIX : undefined;
    if (!tessdataPrefix && typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
      // 开发环境没有 tessdata 时跳过
      return;
    }
    try {
      const adapter = new TesseractOCRAdapter();
      this.ocr = adapter;
    } catch {
      // Tesseract 不可用，保持空适配器
    }
  }

  /**
   * 分析图像并返回结构化结果
   */
  async analyze(imageBase64: string): Promise<VisionAnalysisResult> {
    // 0. 尝试升级到真实 OCR
    await this.upgradeOCR();

    // 1. 执行 OCR
    const ocrResult = await this.ocr.recognize(imageBase64);
    const text = ocrResult.text.trim();

    // 2. 识别图像类型
    const type = this.classifyImage(text);

    // 3. 结构化提取
    const structured = this.extractStructured(text, type);

    // 4. 生成建议
    const suggestions = this.generateSuggestions(type, structured);

    return {
      type,
      ocrText: text,
      structured,
      confidence: ocrResult.confidence / 100,
      suggestions,
    };
  }

  /**
   * 分析菜品菜单图片
   */
  async analyzeMenu(imageBase64: string): Promise<{
    items: Array<{ name: string; price?: number; description?: string }>;
    overallStyle: string;
  }> {
    const result = await this.analyze(imageBase64);
    const items: Array<{ name: string; price?: number; description?: string }> = [];

    // 从结构化结果中提取菜品
    if (result.structured.items && Array.isArray(result.structured.items)) {
      items.push(...(result.structured.items as Array<{ name: string; price?: number; description?: string }>));
    }

    if (result.structured.dishes && Array.isArray(result.structured.dishes)) {
      items.push(...(result.structured.dishes as Array<{ name: string; price?: number; description?: string }>));
    }

    return {
      items,
      overallStyle: (result.structured.style as string) || "未识别",
    };
  }

  /**
   * 分析门店/环境图片
   */
  async analyzeStorefront(imageBase64: string): Promise<{
    description: string;
    estimatedStyle: string;
    suggestions: string[];
  }> {
    const result = await this.analyze(imageBase64);
    return {
      description: result.ocrText || "门店图片（OCR 无文本）",
      estimatedStyle: (result.structured.style as string) || "未识别",
      suggestions: result.suggestions,
    };
  }

  /**
   * 分类图像类型
   */
  private classifyImage(text: string): VisionAnalysisResult["type"] {
    if (!text) return "unknown";

    // 菜单特征
    const menuPatterns = [
      /(\d+)\s*元/,
      /菜单|菜品|招牌|推荐|套餐|特价/,
      /￥|¥/,
      /菜品名|cook|recipe/i,
    ];
    const menuScore = menuPatterns.filter((p) => p.test(text)).length;

    // 收据特征
    const receiptPatterns = [
      /合计|小计|总计|金额|消费/,
      /收据|发票|账单|流水/,
      /订单号|桌号|编号/,
      /支付|微信|支付宝|cash/i,
    ];
    const receiptScore = receiptPatterns.filter((p) => p.test(text)).length;

    // 合同特征
    const contractPatterns = [
      /合同|协议|条款|甲方|乙方/,
      /租金|押金|租赁|装修/,
      /违约|争议|有效期/,
    ];
    const contractScore = contractPatterns.filter((p) => p.test(text)).length;

    if (menuScore >= 2 && menuScore > receiptScore) return "menu";
    if (receiptScore >= 2) return "receipt";
    if (contractScore >= 2) return "contract";

    return "unknown";
  }

  /**
   * 从文本中提取结构化数据
   */
  private extractStructured(
    text: string,
    type: VisionAnalysisResult["type"],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    switch (type) {
      case "menu": {
        // 提取菜品和价格
        const items: Array<{ name: string; price: number }> = [];
        const itemRegex = /(.+?)\s*[￥¥]?\s*(\d+(?:\.\d+)?)\s*元/g;
        let match;
        while ((match = itemRegex.exec(text)) !== null) {
          items.push({
            name: match[1].trim(),
            price: parseFloat(match[2]),
          });
        }
        result.items = items;

        // 提取店名/标题（第一行）
        const lines = text.split("\n").filter(Boolean);
        if (lines.length > 0 && lines[0].length < 20) {
          result.title = lines[0];
        }

        // 估算风格（基于关键词）
        const styleKeywords: Record<string, string[]> = {
          "川菜": ["麻辣", "川菜", "辣椒", "花椒"],
          "湘菜": ["辣椒炒肉", "湘菜", "小炒"],
          "火锅": ["锅底", "涮", "火锅"],
          "日料": ["刺身", "寿司", "日式", "定食"],
          "咖啡": ["咖啡", "拿铁", "美式", "手冲"],
          "茶饮": ["奶茶", "果茶", "奶盖", "波霸"],
        };
        for (const [style, keywords] of Object.entries(styleKeywords)) {
          if (keywords.some((k) => text.includes(k))) {
            result.style = style;
            break;
          }
        }
        if (!result.style) result.style = "未分类";

        // 提取价格区间
        const prices = items.map((i) => i.price).filter((p) => p > 0);
        if (prices.length > 0) {
          result.minPrice = Math.min(...prices);
          result.maxPrice = Math.max(...prices);
          result.avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        }
        break;
      }

      case "receipt": {
        // 提取金额
        const totalMatch = text.match(/合计[：:]?\s*[￥¥]?\s*(\d+(?:\.\d+)?)/);
        if (totalMatch) result.total = parseFloat(totalMatch[1]);

        const dateMatch = text.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
        if (dateMatch) result.date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

        // 提取店铺名
        const lines = text.split("\n").filter(Boolean);
        if (lines.length > 0) result.shopName = lines[0];
        break;
      }

      case "contract": {
        // 提取合同关键信息
        const partyAMatch = text.match(/甲方[：:]?\s*(.+?)[（(]/);
        if (partyAMatch) result.partyA = partyAMatch[1].trim();

        const partyBMatch = text.match(/乙方[：:]?\s*(.+?)[（(]/);
        if (partyBMatch) result.partyB = partyBMatch[1].trim();

        const rentMatch = text.match(/租金[：:]?\s*[￥¥]?\s*(\d+(?:\.\d+)?)/);
        if (rentMatch) result.rent = parseFloat(rentMatch[1]);

        const termMatch = text.match(/(\d+)\s*年/);
        if (termMatch) result.term = `${termMatch[1]}年`;
        break;
      }
    }

    return result;
  }

  /**
   * 基于识别的类型和内容生成建议
   */
  private generateSuggestions(
    type: VisionAnalysisResult["type"],
    structured: Record<string, unknown>,
  ): string[] {
    const suggestions: string[] = [];

    switch (type) {
      case "menu": {
        const items = structured.items as Array<{ name: string; price: number }> | undefined;
        if (items) {
          const prices = items.map((i) => i.price).filter((p) => p > 0);
          if (prices.length > 0) {
            const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
            if (avgPrice < 30)
              suggestions.push("客单价偏低（<30元），建议增加高毛利菜品拉高客单价");
            if (items.length > 60)
              suggestions.push("菜品过多（>60款），建议精简菜单至40-50个SKU，聚焦招牌菜");
            if (items.length < 15)
              suggestions.push("菜品过少（<15款），建议增加菜品选择，给顾客更多选择空间");
          }
          // 判断是否有招牌菜
          const hasSignature = items.some(
            (i) => i.name.includes("招牌") || i.name.includes("推荐") || i.name.includes("特色"),
          );
          if (!hasSignature && items.length > 10)
            suggestions.push("未识别到招牌菜标识，建议在菜单中突出1-2道招牌菜");
        }
        break;
      }

      case "receipt": {
        const total = structured.total as number | undefined;
        if (total !== undefined) {
          if (total > 500) suggestions.push(`客单价¥${total}偏高，检查消费结构是否合理`);
          if (total < 20) suggestions.push(`客单价¥${total}偏低，利润空间有限`);
        }
        suggestions.push("建议将收据数据录入决策系统，追踪消费趋势");
        break;
      }

      case "contract": {
        const rent = structured.rent as number | undefined;
        if (rent !== undefined) {
          suggestions.push(`租金¥${rent/10000}万/月，请同步录入投资回报模型评估合理性`);
        }
        suggestions.push("建议将合同关键条款录入项目档案");
        break;
      }
    }

    return suggestions;
  }

  /**
   * 检查图像分析能力是否可用
   */
  get isAvailable(): boolean {
    return true; // 取决于 Tesseract 是否有训练数据
  }
}

// ─── 全局单例 ───

let globalVisionAnalyzer: VisionAnalyzer | null = null;

export function getVisionAnalyzer(): VisionAnalyzer {
  if (!globalVisionAnalyzer) {
    globalVisionAnalyzer = new VisionAnalyzer();
  }
  return globalVisionAnalyzer;
}
