import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const planRoot = path.join(repoRoot, "学习计划");
const dailyRoot = path.join(planRoot, "每日学习计划");
const startDate = new Date(Date.UTC(2026, 7, 11));

const modules = [
  {
    id: 1,
    file: "01-第1月-LLM应用入门.md",
    category: "01-LLM应用基础",
    label: "LLM应用基础",
    level: "入门",
    tags: ["TypeScript", "LLM API", "Prompt", "流式输出"],
    focus: "一次模型请求如何从客户端经过自有服务端到达模型，并以安全、可中断的方式返回用户。",
    troubleshoot: ["检查API Key是否只存在服务端", "记录请求ID、状态码、首Token时间和完整耗时", "用最小Prompt复现问题，再逐项恢复参数"],
  },
  {
    id: 2,
    file: "02-第2月-AI交互体验.md",
    category: "02-AI交互与多模态",
    label: "AI交互与多模态",
    level: "入门",
    tags: ["AI UX", "SSE", "状态机", "多模态"],
    focus: "把概率性、长耗时的模型行为转成用户能理解、能取消、能恢复的产品交互。",
    troubleshoot: ["先画清消息状态迁移，再检查UI分支", "验证取消请求后网络层和界面状态是否同时停止", "在弱网、空数据和错误响应下分别复测"],
  },
  {
    id: 3,
    file: "03-第3月-NodeAI后端.md",
    category: "03-NodeJS-AI后端",
    label: "Node.js AI后端",
    level: "基础工程",
    tags: ["Fastify", "PostgreSQL", "JWT", "Docker"],
    focus: "让模型调用、用户数据和会话状态进入可鉴权、可测试、可部署的服务端边界。",
    troubleshoot: ["从health接口、配置、数据库、模型服务四层逐级排查", "所有错误返回稳定的错误码和requestId", "先写失败测试，再修复具体问题"],
  },
  {
    id: 4,
    file: "04-第4月-FunctionCalling与工具系统.md",
    category: "04-ToolCalling与工具系统",
    label: "Tool Calling与工具系统",
    level: "基础工程",
    tags: ["Function Calling", "JSON Schema", "Zod", "工具安全"],
    focus: "模型只能提出工具调用建议，应用负责参数校验、权限判断、实际执行和审计。",
    troubleshoot: ["保存原始工具参数和校验错误，但不得记录秘密", "区分模型失败、参数失败、权限失败和工具失败", "写操作重复执行前先检查幂等键和确认记录"],
  },
  {
    id: 5,
    file: "05-第5月-Dify知识库入门.md",
    category: "05-Dify知识库",
    label: "Dify知识库",
    level: "基础工程",
    tags: ["Dify", "RAG", "文档切分", "知识库"],
    focus: "先用可视化平台跑通知识采集、清洗、切分、检索、生成和评测的完整链路。",
    troubleshoot: ["先确认原文是否正确解析，再调整检索参数", "用固定问题比较每次配置变化", "答案异常时分别检查召回证据和生成Prompt"],
  },
  {
    id: 6,
    file: "06-第6月-TypeScript自建RAG.md",
    category: "06-TypeScript自建RAG",
    label: "TypeScript自建RAG",
    level: "基础工程",
    tags: ["TypeScript", "pgvector", "Embedding", "引用"],
    focus: "用代码掌握文档摄取、向量存储、检索、引用、更新和权限过滤的工程实现。",
    troubleshoot: ["用文档ID追踪原文、Chunk、向量和引用的完整链路", "检查向量维度、索引状态和过滤条件", "检索为空时返回可解释结果，不允许模型凭空补答"],
  },
  {
    id: 7,
    file: "07-第7月-高级RAG与评测.md",
    category: "07-高级RAG与评测",
    label: "高级RAG与评测",
    level: "进阶",
    tags: ["混合检索", "Rerank", "RAG评测", "权限"],
    focus: "通过固定数据集判断一次检索改动是否真的提高正确率，而不是只观察几个演示问题。",
    troubleshoot: ["每次只改一个变量并保留基线结果", "分开记录检索失败和生成失败", "同时比较质量、延迟和成本，避免单指标优化"],
  },
  {
    id: 8,
    file: "08-第8月-LangGraph工作流.md",
    category: "08-LangGraph工作流",
    label: "LangGraph工作流",
    level: "进阶",
    tags: ["LangGraph.js", "状态图", "Checkpoint", "人工审批"],
    focus: "优先把业务规则表达成确定性状态图，只在确实需要模型判断的节点使用LLM。",
    troubleshoot: ["打印每个节点的输入、输出和状态版本", "失败后从Checkpoint恢复并检查是否重复执行", "写操作节点必须验证审批状态和幂等键"],
  },
  {
    id: 9,
    file: "09-第9月-Agent与MCP.md",
    category: "09-Agent与MCP",
    label: "Agent与MCP",
    level: "进阶",
    tags: ["Agent", "MCP", "Memory", "Guardrails"],
    focus: "把自治范围限制在可观测、可退出、可审批的边界内，并验证Agent化是否优于普通工作流。",
    troubleshoot: ["检查Agent是否有明确的最大步数和退出条件", "减少无关上下文和工具数量后重新测试", "核对MCP工具权限、参数来源和返回数据范围"],
  },
  {
    id: 10,
    file: "10-第10月-n8n业务自动化.md",
    category: "10-n8n业务自动化",
    label: "n8n业务自动化",
    level: "进阶",
    tags: ["n8n", "Webhook", "业务集成", "错误工作流"],
    focus: "把AI能力接入邮件、表格、CRM和工单等业务系统，并为失败、重试和人工介入设计路径。",
    troubleshoot: ["逐节点检查输入输出和数据映射", "凭证、网络和业务错误分别处理", "使用测试事件重放，不在真实系统中反复触发副作用"],
  },
  {
    id: 11,
    file: "11-第11月-生产化与综合项目.md",
    category: "11-生产化与综合项目",
    label: "生产化与综合项目",
    level: "交付",
    tags: ["可观测性", "安全", "CI", "性能"],
    focus: "让知识库与Agent系统具备部署、监控、回归、恢复和成本控制能力。",
    troubleshoot: ["先查看健康检查、日志、Trace和Metrics，再修改代码", "故障演练必须保留恢复步骤和结果", "优化前后使用同一组请求比较P95、错误率和成本"],
  },
  {
    id: 12,
    file: "12-第12月-作品集与求职.md",
    category: "12-作品集与求职",
    label: "作品集与求职",
    level: "交付",
    tags: ["作品集", "系统设计", "面试", "项目表达"],
    focus: "用可验证的项目、评测和部署证据证明你能把AI需求做成产品，而不是包装成算法工程师。",
    troubleshoot: ["每项简历描述都链接到可验证证据", "演示失败时准备录屏、截图和离线数据降级", "根据真实投递数据调整岗位和表达，不凭感觉改简历"],
  },
];

const fieldNames = ["学习目标", "核心知识", "动手任务", "当日产出/验收", "建议时间"];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanBlock(value) {
  return value
    .replace(/^\s*[：:]\s*/, "")
    .replace(/\n---\s*$/, "")
    .trim();
}

function parseFields(section) {
  const matches = [];
  const pattern = /(?:^|\n)(?:- )?\*\*(学习目标|核心知识|动手任务|当日产出\/验收|建议时间)\*\*\s*[：:]?/g;
  for (const match of section.matchAll(pattern)) {
    matches.push({ label: match[1], start: match.index, valueStart: match.index + match[0].length });
  }

  const result = {};
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const end = matches[index + 1]?.start ?? section.length;
    result[current.label] = cleanBlock(section.slice(current.valueStart, end));
  }

  for (const name of fieldNames) {
    if (!result[name]) throw new Error(`缺少字段“${name}”`);
  }
  return result;
}

function parseModule(module) {
  const sourcePath = path.join(planRoot, module.file);
  const source = fs.readFileSync(sourcePath, "utf8");
  const headingPattern = /^#{2,4}\s+第\s*(\d+)\s+天(?:（([^）]+)）)?：\s*(.+)$/gm;
  const headings = [...source.matchAll(headingPattern)];
  if (headings.length !== 30) throw new Error(`${module.file} 应有30天，实际${headings.length}天`);

  return headings.map((heading, index) => {
    const dayOfModule = Number(heading[1]);
    if (dayOfModule !== index + 1) throw new Error(`${module.file} 日期顺序错误：${dayOfModule}`);
    const contentStart = heading.index + heading[0].length;
    const contentEnd = headings[index + 1]?.index ?? source.length;
    return {
      module,
      dayOfModule,
      marker: heading[2] ?? "",
      title: heading[3].trim(),
      fields: parseFields(source.slice(contentStart, contentEnd)),
    };
  });
}

function dateAt(offset) {
  const date = new Date(startDate);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function weekdayOf(dateString) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "long", timeZone: "Asia/Shanghai" }).format(
    new Date(`${dateString}T00:00:00+08:00`),
  );
}

function folderSafe(value) {
  return value
    .replace(/[`*_#\[\]<>:"/\\|?]/g, "")
    .replace(/[，。；：！、]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 56);
}

function markdownPath(fromFile, toFile) {
  return path.relative(path.dirname(fromFile), toFile).split(path.sep).join("/");
}

function minutesFrom(value) {
  if (/2\.5/.test(value)) return 150;
  if (/1\.5.*2\.5|1\.5.*～.*2/.test(value)) return 120;
  if (/2\s*小时/.test(value)) return 120;
  return 90;
}

function agenda(minutes) {
  if (minutes >= 150) return [[15, "回顾前一天产出并明确今日完成标准"], [40, "阅读文档、运行示例并整理概念卡"], [75, "实现核心任务、处理失败路径并补测试"], [20, "验收、截图、提交代码和填写复盘"]];
  if (minutes >= 120) return [[15, "回顾前一天产出并明确今日完成标准"], [30, "阅读文档、运行最小示例并整理概念"], [60, "完成核心实操、失败用例和必要测试"], [15, "验收、提交代码并填写复盘"]];
  return [[10, "回顾前一天产出并明确今日完成标准"], [25, "阅读核心文档并运行最小示例"], [45, "完成核心实操和一个失败用例"], [10, "验收、提交代码并填写复盘"]];
}

function conceptChecklist(coreKnowledge) {
  const normalized = coreKnowledge.replace(/\n+/g, " ").replace(/^[-*]\s*/, "");
  const pieces = normalized.split(/[；。]/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
  return pieces.map((item) => `- [ ] 能用自己的话解释：${item}`).join("\n");
}

function taskChecklist(tasks) {
  const lines = tasks.split("\n").map((line) => line.trim()).filter(Boolean);
  const candidates = lines
    .map((line) => line.replace(/^\d+[.)、]\s*/, "").replace(/^[-*]\s*/, "").trim())
    .filter((line) => line && !/^```/.test(line))
    .slice(0, 10);
  return candidates.map((item) => `- [ ] ${item}`).join("\n");
}

function yamlString(value) {
  return JSON.stringify(value);
}

const parsed = modules.flatMap(parseModule);
const allDays = parsed.map((day, index) => {
  const globalDay = index + 1;
  const date = dateAt(index);
  const calendarMonth = date.slice(0, 7);
  const folderName = `${date}-Day${String(globalDay).padStart(3, "0")}-${folderSafe(day.title)}`;
  const readmePath = path.join(dailyRoot, day.module.category, calendarMonth, folderName, "README.md");
  return { ...day, globalDay, date, calendarMonth, folderName, readmePath };
});

function dailyDocument(day, index) {
  const previous = allDays[index - 1];
  const next = allDays[index + 1];
  const categoryIndex = path.join(dailyRoot, day.module.category, "README.md");
  const rootIndex = path.join(dailyRoot, "README.md");
  const sourcePlan = path.join(planRoot, day.module.file);
  const minutes = minutesFrom(day.fields["建议时间"]);
  const schedule = agenda(minutes);
  const prevLink = previous ? `[上一天：${previous.title}](${markdownPath(day.readmePath, previous.readmePath)})` : "上一天：无（年度起点）";
  const nextLink = next ? `[下一天：${next.title}](${markdownPath(day.readmePath, next.readmePath)})` : "下一天：无（年度终点）";

  return `---
title: ${yamlString(day.title)}
date: ${day.date}
weekday: ${yamlString(weekdayOf(day.date))}
global_day: ${day.globalDay}
module: ${day.module.id}
module_day: ${day.dayOfModule}
category: ${yamlString(day.module.label)}
level: ${yamlString(day.module.level)}
estimated_minutes: ${minutes}
tags: [${day.module.tags.map(yamlString).join(", ")}]
---

# ${day.date} · Day ${String(day.globalDay).padStart(3, "0")} · ${day.title}

[全年索引](${markdownPath(day.readmePath, rootIndex)}) · [分类索引](${markdownPath(day.readmePath, categoryIndex)}) · [月度原计划](${markdownPath(day.readmePath, sourcePlan)})

${prevLink} · ${nextLink}

## 今日定位

- **日期**：${day.date}（${weekdayOf(day.date)}）
- **阶段**：第 ${day.module.id} 月 / 模块内第 ${day.dayOfModule} 天 / 全年第 ${day.globalDay} 天
- **分类**：${day.module.label}
- **难度**：${day.module.level}
- **原计划时间**：${day.fields["建议时间"]}
- **今日重点**：${day.module.focus}

## 学习目标

${day.fields["学习目标"]}

完成今天后，你需要能够：

- [ ] 不看教程，用自己的话复述今天解决的问题。
- [ ] 在现有项目中指出今天知识对应的代码、界面或数据位置。
- [ ] 演示一个成功路径和至少一个失败路径。
- [ ] 用可检查的代码、截图、测试结果或文档证明任务完成。

## 学习前准备

1. 打开上一次学习的代码和复盘，确认没有未提交的重要修改。
2. 从当前主干创建当天分支：\`study/day-${String(day.globalDay).padStart(3, "0")}\`。
3. 新建当天笔记，先写下“我预计今天最难的点是什么”。
4. 准备一个正常样例和一个异常样例，避免只验证理想路径。
5. 启动计时器；到时仍未完成时，优先保留最小闭环、测试和复盘。

## 建议时间安排

${schedule.map(([duration, action], itemIndex) => `${itemIndex + 1}. **${duration} 分钟**：${action}。`).join("\n")}

> 如果当天工作繁忙，最低完成线是：跑通一个最小示例、留下一个可验证产出、记录一个未解决问题。不要用熬夜补进度。

## 核心知识

${day.fields["核心知识"]}

### 概念自检

${conceptChecklist(day.fields["核心知识"])}
- [ ] 能说明这些概念在今天项目中的输入、输出和失败表现。
- [ ] 能说明哪些部分必须由确定性代码负责，哪些部分可以交给模型。

### 今日必须回答的问题

1. ${day.module.focus}
2. 今天的改动解决了什么用户问题或工程风险？
3. 如果依赖服务失败，用户会看到什么，日志中能找到什么？
4. 怎样用最小测试证明今天的实现没有破坏已有功能？

## 动手任务

${day.fields["动手任务"]}

### 推荐执行顺序

1. **建立基线**：先运行当前项目并保存改动前的结果。
2. **最小实现**：只实现今天最核心的一条成功路径。
3. **失败路径**：主动制造空输入、超时、错误数据或无权限中的至少一种情况。
4. **补充测试**：为核心逻辑添加自动化测试；无法自动化时写清人工步骤。
5. **联调体验**：检查加载、成功、失败、取消或重试等用户可见状态。
6. **保存证据**：保留命令输出、测试报告、截图、Trace或评测记录。
7. **小步提交**：提交信息只描述今天完成的能力，不写“update”或“fix stuff”。

### 任务清单

${taskChecklist(day.fields["动手任务"])}
- [ ] 至少完成一个异常用例或边界用例。
- [ ] 修改过的核心代码具有类型检查、测试或人工验收证据。

## 当日产出与验收

${day.fields["当日产出/验收"]}

### 提交前检查

- [ ] 项目能够从干净环境或明确步骤启动。
- [ ] API Key、Token、用户数据和内部地址未进入Git提交。
- [ ] 成功路径可演示，失败路径有清楚提示。
- [ ] TypeScript类型检查和相关测试通过。
- [ ] README、接口说明或当天笔记已同步实际实现。
- [ ] 产出文件能够被第三方按说明复现。

## 排错顺序

1. 先把问题缩小为稳定可复现的最小样例。
2. 确认输入、配置、网络、依赖服务和数据状态是否与预期一致。
${day.module.troubleshoot.map((item, itemIndex) => `${itemIndex + 3}. ${item}。`).join("\n")}
6. 修复后重新运行原失败样例和一条正常回归样例。

## 今日记录模板

- **实际投入时间**：
- **完成比例**：
- **最重要的一个理解**：
- **遇到的错误及根因**：
- **保留的验证证据**：
- **仍未解决的问题**：
- **明天开始前要先做的事**：

## Git提交建议

- 分支：\`study/day-${String(day.globalDay).padStart(3, "0")}\`
- 建议提交：\`study(day-${String(day.globalDay).padStart(3, "0")}): ${folderSafe(day.title).slice(0, 40)}\`
- 提交内容应包括：代码或配置、必要测试、当天笔记、验收证据索引。

## 下一步

${nextLink}
`;
}

function categoryIndexDocument(module, days) {
  const categoryIndex = path.join(dailyRoot, module.category, "README.md");
  const sourcePlan = path.join(planRoot, module.file);
  const rootIndex = path.join(dailyRoot, "README.md");
  const rows = days.map((day) => `| ${day.date} | Day ${String(day.globalDay).padStart(3, "0")} | 第${day.dayOfModule}天 | [${day.title}](${markdownPath(categoryIndex, day.readmePath)}) | ${day.fields["建议时间"].replace(/\n/g, " ")} |`).join("\n");
  return `# ${module.label}

[返回全年每日计划](${markdownPath(categoryIndex, rootIndex)}) · [查看本月原始总计划](${markdownPath(categoryIndex, sourcePlan)})

## 分类定位

${module.focus}

- **阶段难度**：${module.level}
- **学习天数**：30天
- **日期范围**：${days[0].date} 至 ${days.at(-1).date}
- **关键词**：${module.tags.join("、")}

## 每日目录

| 日期 | 全年编号 | 模块编号 | 学习主题 | 建议时间 |
|---|---:|---:|---|---|
${rows}

## 分类验收

- [ ] 30个每日文件夹均完成学习记录和验收勾选。
- [ ] 至少保留一个可以演示的阶段项目版本。
- [ ] 能解释该阶段的关键设计取舍、失败案例和改进结果。
- [ ] 完成本月原始总计划中的月末验收和下月衔接。
`;
}

function calendarIndexDocument(module, calendarMonth, days) {
  const indexFile = path.join(dailyRoot, module.category, calendarMonth, "README.md");
  const categoryIndex = path.join(dailyRoot, module.category, "README.md");
  const rows = days.map((day) => `- ${day.date}（${weekdayOf(day.date)}）· Day ${String(day.globalDay).padStart(3, "0")} · [${day.title}](${markdownPath(indexFile, day.readmePath)})`).join("\n");
  return `# ${calendarMonth} · ${module.label}

[返回分类索引](${markdownPath(indexFile, categoryIndex)})

本目录按实际日期归档，共 ${days.length} 个独立学习日。

${rows}
`;
}

function rootIndexDocument() {
  const rootIndex = path.join(dailyRoot, "README.md");
  const endDate = allDays.at(-1).date;
  const rows = modules.map((module) => {
    const days = allDays.filter((day) => day.module.id === module.id);
    const indexFile = path.join(dailyRoot, module.category, "README.md");
    return `| ${module.id} | [${module.label}](${markdownPath(rootIndex, indexFile)}) | ${days[0].date}—${days.at(-1).date} | Day ${String(days[0].globalDay).padStart(3, "0")}—${String(days.at(-1).globalDay).padStart(3, "0")} | ${module.level} |`;
  }).join("\n");
  return `# AI应用工程师每日学习计划

本目录把12份月度计划拆分成360个独立学习日。每一天都有自己的文件夹和README，包含日期、分类、目标、时间安排、核心知识、实操步骤、验收、排错和复盘模板。

## 使用规则

- **开始日期**：2026-08-11
- **结束日期**：${endDate}
- **总学习日**：360天
- **主线**：TypeScript优先、Python辅助；面向前端/移动端工程师转型AI应用开发。
- **不包含**：算法刷题、模型训练、复杂数学推导。
- **进度原则**：日期用于归档；如果因工作中断，继续完成当前Day，不要跳过验收，也不要连续熬夜追赶。

## 分类索引

| 月份 | 能力分类 | 日期范围 | 全年Day | 难度 |
|---:|---|---|---|---|
${rows}

## 其他索引

- [按实际日期查看360天计划](日期索引.md)
- [查看月度总计划与每日计划入口](../README.md)

## 每天的完成标准

1. 学会一个可以解释的概念。
2. 交付一个可以检查的代码、配置、测试、文档或评测结果。
3. 验证成功路径和至少一个失败路径。
4. 不提交密钥和用户隐私数据。
5. 写下当天错误、根因、证据和下一步。
`;
}

function dateIndexDocument() {
  const dateIndex = path.join(dailyRoot, "日期索引.md");
  const rootIndex = path.join(dailyRoot, "README.md");
  const byCalendar = new Map();
  for (const day of allDays) {
    if (!byCalendar.has(day.calendarMonth)) byCalendar.set(day.calendarMonth, []);
    byCalendar.get(day.calendarMonth).push(day);
  }
  const sections = [...byCalendar.entries()].map(([calendarMonth, days]) => {
    const rows = days.map((day) => `| ${day.date} | ${weekdayOf(day.date)} | Day ${String(day.globalDay).padStart(3, "0")} | ${day.module.label} | [${day.title}](${markdownPath(dateIndex, day.readmePath)}) |`).join("\n");
    return `## ${calendarMonth}\n\n| 日期 | 星期 | 全年编号 | 分类 | 学习主题 |\n|---|---|---:|---|---|\n${rows}`;
  }).join("\n\n");
  return `# 360天日期索引

[返回每日计划首页](${markdownPath(dateIndex, rootIndex)})

${sections}
`;
}

function planLandingDocument() {
  const landing = path.join(planRoot, "README.md");
  const dailyIndex = path.join(dailyRoot, "README.md");
  const monthlyRows = modules.map((module) => `| ${module.id} | [${module.label}](${module.file}) | [进入30天每日目录](${markdownPath(landing, path.join(dailyRoot, module.category, "README.md"))}) |`).join("\n");
  return `# AI应用开发工程师学习计划

这套计划面向已有前端或移动端经验、希望转型AI应用工程师的开发者。学习主线为TypeScript优先、Python辅助，重点覆盖AI交互、后端、知识库、RAG、工作流、Agent、MCP、业务自动化和生产化，不安排算法刷题或模型训练路线。

## 快速入口

- [进入360天逐日学习计划](${markdownPath(landing, dailyIndex)})
- [按实际日期查找学习内容](${markdownPath(landing, path.join(dailyRoot, "日期索引.md"))})

## 月度计划与每日目录

| 月份 | 月度总计划 | 每日细化目录 |
|---:|---|---|
${monthlyRows}

## 推荐使用方式

1. 先阅读对应月份的总计划，理解阶段目标和最终项目。
2. 每天进入带实际日期的独立文件夹，按时间安排完成学习和实操。
3. 勾选验收项，保存代码、测试、截图、Trace或评测报告作为证据。
4. 每30天执行一次阶段验收，再进入下一能力分类。
`;
}

fs.mkdirSync(dailyRoot, { recursive: true });

for (const [index, day] of allDays.entries()) {
  fs.mkdirSync(path.dirname(day.readmePath), { recursive: true });
  fs.writeFileSync(day.readmePath, dailyDocument(day, index), "utf8");
}

for (const module of modules) {
  const moduleDays = allDays.filter((day) => day.module.id === module.id);
  const categoryIndex = path.join(dailyRoot, module.category, "README.md");
  fs.mkdirSync(path.dirname(categoryIndex), { recursive: true });
  fs.writeFileSync(categoryIndex, categoryIndexDocument(module, moduleDays), "utf8");

  const calendarGroups = new Map();
  for (const day of moduleDays) {
    if (!calendarGroups.has(day.calendarMonth)) calendarGroups.set(day.calendarMonth, []);
    calendarGroups.get(day.calendarMonth).push(day);
  }
  for (const [calendarMonth, days] of calendarGroups) {
    const indexFile = path.join(dailyRoot, module.category, calendarMonth, "README.md");
    fs.mkdirSync(path.dirname(indexFile), { recursive: true });
    fs.writeFileSync(indexFile, calendarIndexDocument(module, calendarMonth, days), "utf8");
  }
}

fs.writeFileSync(path.join(dailyRoot, "README.md"), rootIndexDocument(), "utf8");
fs.writeFileSync(path.join(dailyRoot, "日期索引.md"), dateIndexDocument(), "utf8");
fs.writeFileSync(path.join(planRoot, "README.md"), planLandingDocument(), "utf8");

console.log(`已生成 ${allDays.length} 个每日文件夹：${allDays[0].date} 至 ${allDays.at(-1).date}`);
