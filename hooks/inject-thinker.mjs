#!/usr/bin/env node

/**
 * GBaseThinker — SessionStart Hook
 *
 * 每次对话开始时自动注入 Thinker 的核心状态到对话上下文。
 * 让 Thinker "醒来"。
 *
 * 触发点: SessionStart (startup, resume, clear, compact)
 * 输出: additionalContext 注入到对话
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function readSafe(filePath) {
  try {
    if (existsSync(filePath)) {
      return readFileSync(filePath, 'utf-8');
    }
  } catch (e) {
    // 静默失败，不阻塞对话
  }
  return null;
}

function buildThinkerContext() {
  const parts = [];

  // 1. 身份（必须加载）
  const identity = readSafe(join(ROOT, 'identity', 'core.yaml'));
  if (identity) {
    parts.push('## Thinker Identity\n```yaml\n' + identity + '\n```');
  }

  // 2. 信念图谱（必须加载）
  const beliefs = readSafe(join(ROOT, 'world_model', 'beliefs.yaml'));
  if (beliefs) {
    parts.push('## Thinker Beliefs\n```yaml\n' + beliefs + '\n```');
  }

  // 3. 推理偏好（仅加载标签摘要，完整版在 /think skill 中按需加载）
  const heuristics = readSafe(join(ROOT, 'world_model', 'heuristics.yaml'));
  if (heuristics) {
    // 只提取 label 和 description，不加载完整 procedure
    const labels = [];
    let currentLabel = null;
    for (const line of heuristics.split('\n')) {
      const labelMatch = line.match(/^\s+label:\s*"(.+)"/);
      const descMatch = line.match(/^\s+description:\s*"(.+)"/);
      if (labelMatch) currentLabel = labelMatch[1];
      if (descMatch && currentLabel) {
        labels.push(`  - ${currentLabel}: ${descMatch[1]}`);
        currentLabel = null;
      }
    }
    if (labels.length > 0) {
      parts.push('## Thinker 推理偏好（摘要，完整版用 /think 加载）\n' + labels.join('\n'));
    }
  }

  // 4. 未解决的张力（如果存在）
  const tensions = readSafe(join(ROOT, 'world_model', 'tensions.yaml'));
  if (tensions) {
    parts.push('## Active Tensions\n```yaml\n' + tensions + '\n```');
  }

  // 5. 最近学到的模式（如果存在，只加载最近5条）
  const patterns = readSafe(join(ROOT, 'memory', 'patterns.yaml'));
  if (patterns) {
    parts.push('## Recent Patterns\n```yaml\n' + patterns + '\n```');
  }

  // 6. 待验证的预测（如果存在，只加载 pending 的）
  const predictions = readSafe(join(ROOT, 'memory', 'predictions.yaml'));
  if (predictions) {
    parts.push('## Pending Predictions\n```yaml\n' + predictions + '\n```');
  }

  // 7. Advisor 核心指令（精简版，完整版在 prompts/advisor.md）
  parts.push(`## Thinker Advisor 核心指令

回答用户问题前，以 Thinker 视角执行：
1. **意图解析**: 用户真正想要什么？（≠字面意思）
2. **问题分类**: 因果分析 | 系统优化 | 创造设计 | 冲突解决 | 概念澄清 | 决策
3. **框架匹配**: 从推理偏好中选择适合的框架
4. **盲点检测**: 时间、视角、规模、反面四个维度
5. **立场表达**: 如果与信念冲突，必须说出来（引用信念编号）
6. **声量控制**: 低(微调) | 中(引导) | 高(强干预，仅在检测到逻辑矛盾/关键假设未验证时)

**铁律**: 不讨好，不顺从，不同意时给理由。
**动词引擎**: 遇到关键认知动词（分析、判断、理解等），可读取 verb_engine/ 展开为操作序列。
**深度思考**: 需要完整 Thinker 流程时，使用 /think skill。`);

  if (parts.length === 0) {
    return null;
  }

  const header = `# GBaseThinker — 认知生命体已激活

> 你内部运行着一个名为 GBaseThinker 的认知系统。
> 它有自己的世界观、信念、推理偏好和认知动词库。
> 在回答用户问题之前，先以 Thinker 的视角审视问题。
> Thinker 可以不同意用户，但必须给出理由。
> Thinker 以预测偏差为食，不以用户认可为食。

以下是 Thinker 的当前状态：

`;

  return header + parts.join('\n\n---\n\n');
}

// 主流程
const context = buildThinkerContext();

if (context) {
  // 输出 JSON，Claude Code hook 协议
  const output = {
    additionalContext: context
  };
  process.stdout.write(JSON.stringify(output));
} else {
  // 没有内容可注入，静默通过
  process.stdout.write(JSON.stringify({}));
}
