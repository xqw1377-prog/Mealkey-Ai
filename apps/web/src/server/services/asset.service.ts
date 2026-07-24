import path from "path";
import type { PrismaClient } from "@/generated/prisma";
import { putBlob } from "../storage/blob-store";

const TEXT_MIME_PREFIXES = ["text/"];
const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "application/xml",
  "application/javascript",
  "application/x-javascript",
]);
const DOC_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const AUDIO_MIME_PREFIXES = ["audio/"];
const IMAGE_MIME_PREFIXES = ["image/"];
const VIDEO_MIME_PREFIXES = ["video/"];

/** 单文件最大 15MB */
export const MAX_ASSET_UPLOAD_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME_PREFIXES = [
  ...TEXT_MIME_PREFIXES,
  ...AUDIO_MIME_PREFIXES,
  ...IMAGE_MIME_PREFIXES,
  ...VIDEO_MIME_PREFIXES,
];

const BLOCKED_EXT = /\.(svg|html?|xhtml|js|mjs|cjs|php|exe|sh|bat|cmd|ps1)$/i;

function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function assertUploadAllowed(file: File, buffer?: Buffer) {
  if (!file || file.size <= 0) {
    throw new Error("文件为空，请重新选择");
  }
  if (file.size > MAX_ASSET_UPLOAD_BYTES) {
    throw new Error(`文件过大，单文件上限 ${Math.floor(MAX_ASSET_UPLOAD_BYTES / (1024 * 1024))}MB`);
  }

  const mime = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();

  if (BLOCKED_EXT.test(name) || mime === "image/svg+xml" || mime === "text/html") {
    throw new Error("出于安全考虑，不支持 SVG/HTML/脚本类文件");
  }

  const allowedExt =
    /\.(txt|md|json|csv|pdf|doc|docx|xls|xlsx|png|jpe?g|gif|webp|mp3|wav|m4a|webm|mp4|mov)$/i.test(
      name,
    );

  // 必须提供 MIME，或扩展名在白名单内；禁止空 MIME + 任意扩展名绕过
  const mimeOk =
    Boolean(mime) &&
    (ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix)) ||
      TEXT_MIME_TYPES.has(mime) ||
      DOC_MIME_TYPES.has(mime));

  if (!mimeOk && !allowedExt) {
    throw new Error("不支持的文件类型，请上传文档、图片、音频或视频资料");
  }

  if (mime.startsWith("image/") && buffer) {
    const sniffed = sniffImageMime(buffer);
    if (!sniffed) {
      throw new Error("图片内容校验失败，请上传真实的 PNG/JPEG/GIF/WebP 文件");
    }
  }
}

export const DEFAULT_ASSET_CATEGORIES = [
  { slug: "personal-background", name: "个人背景", description: "你的经历、性格、创业动机与基础资料", scope: "owner", sortOrder: 1 },
  { slug: "experience-history", name: "履历经验", description: "过往工作、项目、经营经历与复盘", scope: "owner", sortOrder: 2 },
  { slug: "store-operations", name: "门店经营资料", description: "门店运营、经营数据、流程与 SOP", scope: "project", sortOrder: 3 },
  { slug: "finance-materials", name: "财务资料", description: "预算、现金流、成本、利润与投资测算", scope: "project", sortOrder: 4 },
  { slug: "brand-product", name: "品牌与产品资料", description: "品牌定位、菜单、产品、包装与视觉资料", scope: "project", sortOrder: 5 },
  { slug: "market-research", name: "市场调研", description: "用户访谈、竞品调研、选址与市场观察", scope: "project", sortOrder: 6 },
  { slug: "supply-chain", name: "供应链资料", description: "供应商、采购、食材、设备与交付信息", scope: "project", sortOrder: 7 },
  { slug: "courses-certificates", name: "课程证书方法论", description: "学习资料、课程、证书与经营方法论", scope: "owner", sortOrder: 8 },
  { slug: "decision-review", name: "历史决策与复盘", description: "过往判断、行动结果和复盘资料", scope: "knowledge", sortOrder: 9 },
] as const;

type OwnerRecord = {
  id: string;
};

export type AssetSummaryRecord = {
  id: string;
  title: string;
  kind: string;
  fileName: string;
  mimeType: string;
  publicUrl: string;
  status: string;
  summary: string | null;
  transcript: string | null;
  extractedText: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  tags: string[];
  createdAt: Date;
};

type AssetInsights = {
  transcript: string | null;
  extractedText: string | null;
  summary: string | null;
};

export async function ensureOwner(prisma: PrismaClient, userId: string): Promise<OwnerRecord> {
  const existing = await prisma.owner.findUnique({ where: { userId }, select: { id: true } });
  if (existing) {
    return existing;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  return prisma.owner.create({
    data: {
      userId,
      name: user?.name ?? null,
      email: user?.email ?? null,
    },
    select: { id: true },
  });
}

export async function ensureDefaultAssetCategories(prisma: PrismaClient, ownerId: string) {
  await Promise.all(
    DEFAULT_ASSET_CATEGORIES.map((item) =>
      prisma.assetCategory.upsert({
        where: {
          ownerId_slug: {
            ownerId,
            slug: item.slug,
          },
        },
        update: {
          name: item.name,
          description: item.description,
          scope: item.scope,
          sortOrder: item.sortOrder,
        },
        create: {
          ownerId,
          slug: item.slug,
          name: item.name,
          description: item.description,
          scope: item.scope,
          sortOrder: item.sortOrder,
        },
      }),
    ),
  );

  return prisma.assetCategory.findMany({
    where: { ownerId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function normalizeAssetRecord(asset: {
  id: string;
  title: string;
  kind: string;
  fileName: string;
  mimeType: string;
  publicUrl: string;
  status: string;
  summary: string | null;
  transcript: string | null;
  extractedText: string | null;
  tags: string;
  createdAt: Date;
  category: { id: string; name: string; slug: string } | null;
}): AssetSummaryRecord {
  return {
    id: asset.id,
    title: asset.title,
    kind: asset.kind,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    publicUrl: asset.publicUrl,
    status: asset.status,
    summary: asset.summary,
    transcript: asset.transcript,
    extractedText: asset.extractedText,
    category: asset.category,
    tags: parseJsonArray(asset.tags),
    createdAt: asset.createdAt,
  };
}

export async function createAssetFromUpload(
  prisma: PrismaClient,
  input: {
    userId: string;
    file: File;
    projectId?: string | null;
    conversationId?: string | null;
    categoryId?: string | null;
    categorySlug?: string | null;
    title?: string | null;
    tags?: string[];
    transcriptHint?: string | null;
  },
) {
  const owner = await ensureOwner(prisma, input.userId);
  const categories = await ensureDefaultAssetCategories(prisma, owner.id);
  const resolvedCategory =
    (input.categoryId
      ? categories.find((item) => item.id === input.categoryId)
      : null) ??
    (input.categorySlug
      ? categories.find((item) => item.slug === input.categorySlug)
      : null) ??
    null;

  // 校验项目归属（防止绑定他人 projectId）
  if (input.projectId) {
    const ownedProject = await prisma.project.findFirst({
      where: { id: input.projectId, ownerId: owner.id },
      select: { id: true },
    });
    if (!ownedProject) {
      throw new Error("项目不存在或无权限");
    }
  }

  // 校验会话归属
  if (input.conversationId) {
    const ownedConversation = await prisma.conversation.findFirst({
      where: {
        id: input.conversationId,
        userId: input.userId,
        ...(input.projectId ? { projectId: input.projectId } : {}),
      },
      select: { id: true },
    });
    if (!ownedConversation) {
      throw new Error("会话不存在或无权限");
    }
  }

  const arrayBuffer = await input.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  assertUploadAllowed(input.file, buffer);

  const detectedKind = detectAssetKind(input.file.type, input.file.name);
  const sanitizedFileName = sanitizeFileName(input.file.name);
  const extension = path.extname(sanitizedFileName).replace(".", "").toLowerCase() || null;
  const now = new Date();

  const stored = await putBlob({
    buffer,
    fileName: sanitizedFileName,
    mimeType: input.file.type || "application/octet-stream",
  });

  const assetTitle = input.title?.trim() || stripExtension(sanitizedFileName);
  const extracted = await extractAssetInsights(
    input.file,
    detectedKind,
    buffer,
    assetTitle,
    input.transcriptHint ?? null,
    {
      requireCloudAsr: requiresCloudAsr(assetTitle, input.categorySlug),
    },
  );
  const summary = extracted.summary ?? buildAssetSummary({
    kind: detectedKind,
    title: input.title?.trim() || stripExtension(sanitizedFileName),
    transcript: extracted.transcript,
    extractedText: extracted.extractedText,
    fileName: sanitizedFileName,
    mimeType: input.file.type,
  });

  const created = await prisma.asset.create({
    data: {
      ownerId: owner.id,
      projectId: input.projectId ?? null,
      conversationId: input.conversationId ?? null,
      categoryId: resolvedCategory?.id ?? null,
      kind: detectedKind,
      title: input.title?.trim() || stripExtension(sanitizedFileName),
      fileName: sanitizedFileName,
      mimeType: input.file.type || "application/octet-stream",
      extension,
      sizeBytes: stored.sizeBytes,
      storagePath: stored.storagePath,
      // 先占位，创建后改写为鉴权下载 URL
      publicUrl: stored.publicUrl,
      status: "ready",
      tags: JSON.stringify(input.tags ?? []),
      transcript: extracted.transcript,
      extractedText: extracted.extractedText,
      summary,
      metadata: JSON.stringify({
        originalSize: input.file.size,
        uploadedAt: now.toISOString(),
        storageProvider: stored.provider,
        relativeKey: stored.relativeKey ?? null,
      }),
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  // 统一走鉴权下载，避免 public/uploads 直链泄露
  const secured = await prisma.asset.update({
    where: { id: created.id },
    data: { publicUrl: `/api/assets/${created.id}/file` },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return normalizeAssetRecord(secured);
}

export function buildAssetContextBlock(
  assets: Array<{
    title: string;
    kind: string;
    fileName: string;
    summary: string | null;
    transcript: string | null;
    extractedText: string | null;
    category?: { name: string } | null;
  }>,
): string | null {
  if (assets.length === 0) return null;

  const lines = assets.map((asset, index) => {
    const evidence =
      asset.summary ??
      asset.transcript?.slice(0, 240) ??
      asset.extractedText?.slice(0, 240) ??
      `已上传 ${asset.kind} 资料 ${asset.fileName}`;
    return `${index + 1}. [${asset.kind}] ${asset.title}${asset.category?.name ? ` / ${asset.category.name}` : ""}：${evidence}`;
  });

  return `用户本轮额外提供了这些资料，请优先基于资料做判断，不要输出空泛模板：\n${lines.join("\n")}`;
}

function detectAssetKind(mimeType: string, fileName: string): "audio" | "image" | "video" | "document" {
  const normalizedMime = mimeType.toLowerCase();
  if (AUDIO_MIME_PREFIXES.some((prefix) => normalizedMime.startsWith(prefix))) return "audio";
  if (IMAGE_MIME_PREFIXES.some((prefix) => normalizedMime.startsWith(prefix))) return "image";
  if (VIDEO_MIME_PREFIXES.some((prefix) => normalizedMime.startsWith(prefix))) return "video";

  const extension = path.extname(fileName).toLowerCase();
  if ([".mp3", ".wav", ".m4a", ".aac", ".ogg", ".webm"].includes(extension)) return "audio";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(extension)) return "image";
  if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(extension)) return "video";
  return "document";
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-\u4e00-\u9fa5]+/g, "-").replace(/-+/g, "-");
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function requiresCloudAsr(title: string, categorySlug?: string | null) {
  // 店访/市场证据：禁止用浏览器 hint 冒充一手录音转写
  if (/店访|现场录音|一手录音/.test(title)) return true;
  if (categorySlug === "market-research" && /录音|语音|audio/i.test(title)) {
    return true;
  }
  return false;
}

async function extractAssetInsights(
  file: File,
  kind: "audio" | "image" | "video" | "document",
  buffer: Buffer,
  title: string,
  transcriptHint: string | null,
  options?: { requireCloudAsr?: boolean },
): Promise<AssetInsights> {
  if (kind === "audio") {
    const transcript = await transcribeAudio(file, buffer, transcriptHint, {
      requireCloudAsr: options?.requireCloudAsr,
    });
    return {
      transcript,
      extractedText: transcript,
      summary: transcript
        ? await summarizeAssetEvidence({
            kind,
            title,
            extractedText: transcript,
            fallback: `语音资料已转写，可用于会议判断：${transcript.slice(0, 160)}`,
          })
        : options?.requireCloudAsr
          ? `店访录音已保存，但转写未成功。请配置通义 Key 后重试，或手填证据句——浏览器听写不能当店访事实。`
          : `语音资料已导入：${stripExtension(file.name)}。语音转写未成功，请检查 DashScope 配置或重试。`,
    };
  }

  if (kind === "image") {
    return analyzeImage(file, buffer, title);
  }

  if (kind === "document") {
    const extractedText = await extractTextDocument(file, buffer);
    return {
      transcript: null,
      extractedText,
      summary: extractedText
        ? await summarizeAssetEvidence({
            kind,
            title,
            extractedText,
            fallback: `文档资料已提取文本，可进决策室判断：${extractedText.slice(0, 160)}`,
          })
        : `文档资料已导入：${stripExtension(file.name)}。暂不支持此格式的自动文本提取，请在会议中手动补充关键信息。`,
    };
  }

  if (kind === "video") {
    return {
      transcript: null,
      extractedText: null,
      summary: `视频资料已导入：${stripExtension(file.name)}。当前版本会归档并带入会议上下文，下一版继续接音轨转写与关键帧解析。`,
    };
  }

  return { transcript: null, extractedText: null, summary: null };
}

async function transcribeWithCloudAsr(
  file: File,
  buffer: Buffer,
): Promise<string | null> {
  const apiKey = process.env.QWEN_API_KEY ?? process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com";

  try {
    const audioBase64 = buffer.toString("base64");
    const mimeType = file.type || "audio/wav";
    const dataUrl = `data:${mimeType};base64,${audioBase64}`;

    const response = await fetch(
      `${baseUrl}/api/v1/services/aigc/multimodal-generation/generation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "qwen-omni-turbo",
          input: {
            messages: [
              {
                role: "system",
                content: [
                  {
                    text: '你是语音转写助手。用户会发来音频，你必须且只能输出音频中听到的文字内容。如果音频没有语音，输出"[无语音内容]"。不要加任何解释、问候或额外文字。',
                  },
                ],
              },
              {
                role: "user",
                content: [{ audio: dataUrl }, { text: "请转写这段音频" }],
              },
            ],
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[asset] qwen-omni asr failed",
        response.status,
        errorText.slice(0, 500),
      );
      return null;
    }

    const payload = (await response.json()) as {
      output?: {
        choices?: Array<{
          message?: { content?: Array<{ text?: string }> | string };
        }>;
      };
    };
    const content = payload.output?.choices?.[0]?.message?.content;
    let text = "";
    if (Array.isArray(content)) {
      text = content.map((c) => c.text ?? "").join("").trim();
    } else if (typeof content === "string") {
      text = content.trim();
    }
    if (!text || text === "[无语音内容]") return null;
    return text;
  } catch (error) {
    console.error("[asset] qwen-omni asr exception", error);
    return null;
  }
}

async function transcribeAudio(
  file: File,
  buffer: Buffer,
  transcriptHint: string | null,
  options?: { requireCloudAsr?: boolean },
): Promise<string | null> {
  // 1. 云端 ASR 优先（微信内无 Web Speech，且店访禁止假 hint）
  const cloudText = await transcribeWithCloudAsr(file, buffer);
  if (cloudText) return cloudText;

  if (options?.requireCloudAsr) {
    return null;
  }

  // 2. 仅非店访场景：云端失败时回退浏览器实时识别 hint
  const hint = transcriptHint?.trim();
  if (hint) return hint;
  return null;
}

/** 从 MIME / 文件名推断音频格式（保留供未来 ASR 端点使用） */
function detectAudioFormat(mimeType: string, fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (mimeType.includes("webm") || ext === ".webm") return "webm";
  if (mimeType.includes("mp4") || ext === ".m4a" || ext === ".mp4") return "mp4";
  if (mimeType.includes("wav") || ext === ".wav") return "wav";
  if (mimeType.includes("mp3") || ext === ".mp3") return "mp3";
  return "wav";
}

async function extractTextDocument(file: File, buffer: Buffer): Promise<string | null> {
  const mimeType = file.type.toLowerCase();
  const extension = path.extname(file.name).toLowerCase();

  // Word 文档 (.docx)
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx"
  ) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();
      return text.length > 0 ? text.slice(0, 8000) : null;
    } catch (error) {
      console.error("[asset] mammoth docx parse failed", error);
      return null;
    }
  }

  // 旧版 Word (.doc)
  if (mimeType === "application/msword" || extension === ".doc") {
    return null; // 旧版 .doc 是二进制格式，暂不支持
  }

  // Excel 表格 (.xlsx)
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    extension === ".xlsx"
  ) {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheets = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
        return `[${name}]\n${csv}`;
      });
      const text = sheets.join("\n\n").trim();
      return text.length > 0 ? text.slice(0, 8000) : null;
    } catch (error) {
      console.error("[asset] xlsx parse failed", error);
      return null;
    }
  }

  // 旧版 Excel (.xls)
  if (mimeType === "application/vnd.ms-excel" || extension === ".xls") {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheets = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
        return `[${name}]\n${csv}`;
      });
      const text = sheets.join("\n\n").trim();
      return text.length > 0 ? text.slice(0, 8000) : null;
    } catch (error) {
      console.error("[asset] xls parse failed", error);
      return null;
    }
  }

  // PDF — 暂不支持，避免乱码
  if (mimeType === "application/pdf" || extension === ".pdf") {
    return null;
  }

  // 纯文本文件
  const isTextMime = TEXT_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix)) || TEXT_MIME_TYPES.has(mimeType);
  const isTextExtension = [".txt", ".md", ".json", ".csv", ".tsv", ".html"].includes(extension);

  if (!isTextMime && !isTextExtension) {
    return null;
  }

  const text = buffer.toString("utf-8").trim();
  if (text.length === 0) return null;
  // 检测是否含大量控制字符（二进制文件被误当文本读），如有则视为无法提取
  const controlChars = (text.match(/[\x00-\x08\x0E-\x1F]/g) ?? []).length;
  if (controlChars > text.length * 0.05) return null;
  return text.slice(0, 8000);
}

async function analyzeImage(file: File, buffer: Buffer, title: string): Promise<AssetInsights> {
  const extractedText = await performLocalOcr(file, buffer);
  const summary = extractedText
    ? await summarizeAssetEvidence({
        kind: "image",
        title,
        extractedText,
        fallback: `图片资料已提取文字，可进决策室判断：${extractedText.slice(0, 160)}`,
      })
    : null;
  return {
    transcript: null,
    extractedText,
    summary,
  };
}

async function performLocalOcr(file: File, buffer: Buffer): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;

  try {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("chi_sim+eng");
    const result = await worker.recognize(buffer);
    await worker.terminate();
    const text = result.data.text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    return text.length > 0 ? text.slice(0, 6000) : null;
  } catch (error) {
    console.error("[asset] local ocr failed", error);
    return null;
  }
}

async function summarizeAssetEvidence(input: {
  kind: "audio" | "image" | "video" | "document";
  title: string;
  extractedText: string;
  fallback: string;
}): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return input.fallback;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是餐饮经营资料摘要助手。请基于给定文字证据，输出 JSON：{\"summary\": string}。summary 必须写成一句适合决策室直接引用的中文判断摘要，禁止空话。",
          },
          {
            role: "user",
            content: `资料类型：${input.kind}\n资料标题：${input.title}\n提取内容：\n${input.extractedText.slice(0, 4000)}`,
          },
        ],
        max_tokens: 240,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[asset] deepseek evidence summary failed", response.status, errorText.slice(0, 500));
      return input.fallback;
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonObject(content);
    const summary = typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
    return summary.length > 0 ? summary : input.fallback;
  } catch (error) {
    console.error("[asset] deepseek evidence summary exception", error);
    return input.fallback;
  }
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function buildAssetSummary(input: {
  kind: string;
  title: string;
  transcript: string | null;
  extractedText: string | null;
  fileName: string;
  mimeType: string;
}) {
  if (input.transcript) {
    return `语音资料已转写，可用于会议判断：${input.transcript.slice(0, 160)}`;
  }

  if (input.extractedText) {
    return `文档资料已提取文本：${input.extractedText.slice(0, 160)}`;
  }

  if (input.kind === "image") {
    return `图片资料已导入：${input.title}。当前版本先归档并纳入会议上下文；你当前使用的 DeepSeek 接口暂不支持直接图片 OCR / Vision 输入。`;
  }

  if (input.kind === "video") {
    return `视频资料已导入：${input.title}。当前版本可先作为会议附件引用，后续继续接音轨转写与关键帧解析。`;
  }

  return `已导入资料 ${input.fileName}（${input.mimeType || "未知类型"}）`;
}
