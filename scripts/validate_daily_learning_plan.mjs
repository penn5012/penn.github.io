import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const planRoot = path.join(repoRoot, "学习计划");
const dailyRoot = path.join(planRoot, "每日学习计划");
const requiredSections = [
  "## 今日定位",
  "## 学习目标",
  "## 学习前准备",
  "## 建议时间安排",
  "## 核心知识",
  "## 动手任务",
  "## 当日产出与验收",
  "## 排错顺序",
  "## 今日记录模板",
  "## Git提交建议",
  "## 下一步",
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const allMarkdown = walk(dailyRoot).filter((file) => file.endsWith(".md"));
const dailyFiles = allMarkdown.filter((file) => /\d{4}-\d{2}-\d{2}-Day\d{3}-[^/]+\/README\.md$/.test(file));
assert(dailyFiles.length === 360, `每日README应为360个，实际${dailyFiles.length}个`);

const records = dailyFiles.map((file) => {
  const content = fs.readFileSync(file, "utf8");
  const date = content.match(/^date:\s*(\d{4}-\d{2}-\d{2})$/m)?.[1];
  const day = Number(content.match(/^global_day:\s*(\d+)$/m)?.[1]);
  const module = Number(content.match(/^module:\s*(\d+)$/m)?.[1]);
  assert(date, `${file} 缺少date`);
  assert(Number.isInteger(day), `${file} 缺少global_day`);
  assert(module >= 1 && module <= 12, `${file} module无效`);
  assert(!/undefined|\[object Object\]/.test(content), `${file} 存在未解析内容`);
  for (const section of requiredSections) assert(content.includes(section), `${file} 缺少章节：${section}`);
  return { file, content, date, day, module };
}).sort((a, b) => a.day - b.day);

assert(new Set(records.map((item) => item.day)).size === 360, "global_day存在重复");
assert(new Set(records.map((item) => item.date)).size === 360, "date存在重复");

for (let index = 0; index < records.length; index += 1) {
  const record = records[index];
  assert(record.day === index + 1, `Day顺序错误：期望${index + 1}，实际${record.day}`);
  const expected = new Date(Date.UTC(2026, 7, 11 + index)).toISOString().slice(0, 10);
  assert(record.date === expected, `Day ${record.day} 日期错误：期望${expected}，实际${record.date}`);
}

for (const file of allMarkdown) {
  const content = fs.readFileSync(file, "utf8");
  const linkPattern = /\]\(([^)]+\.md(?:#[^)]+)?)\)/g;
  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].split("#", 1)[0];
    if (/^[a-z]+:\/\//i.test(rawTarget)) continue;
    const target = path.resolve(path.dirname(file), decodeURI(rawTarget));
    assert(fs.existsSync(target), `${file} 的链接不存在：${rawTarget}`);
  }
}

const categories = fs.readdirSync(dailyRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
assert(categories.length === 12, `分类目录应为12个，实际${categories.length}个`);
for (const category of categories) {
  assert(fs.existsSync(path.join(dailyRoot, category.name, "README.md")), `${category.name} 缺少分类索引`);
}

assert(fs.existsSync(path.join(planRoot, "README.md")), "学习计划入口README不存在");
assert(fs.existsSync(path.join(dailyRoot, "README.md")), "每日计划入口README不存在");
assert(fs.existsSync(path.join(dailyRoot, "日期索引.md")), "日期索引不存在");

console.log(`校验通过：${categories.length}个分类、${dailyFiles.length}个每日文件夹、${allMarkdown.length}个Markdown文件。`);
console.log(`日期范围：${records[0].date} 至 ${records.at(-1).date}。`);
