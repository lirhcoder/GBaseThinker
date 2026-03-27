#!/usr/bin/env node

/**
 * GBaseThinker — Stop Hook (对话结束前的持久化提醒)
 *
 * 在 AI 即将结束回答时触发，提醒 LLM 检查是否有需要持久化的内容。
 * 这是 Thinker 记忆系统的"兜底"机制。
 *
 * 触发点: Stop
 * 输出: additionalContext 提醒 LLM 做持久化检查
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 检查核心文件是否存在（判断 Thinker 是否已初始化）
const identityExists = existsSync(join(ROOT, 'identity', 'core.yaml'));

if (!identityExists) {
  // Thinker 未初始化，不触发
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const checkpoint = `# GBaseThinker 持久化检查

在结束之前，Thinker 需要检查本次对话是否产生了值得记住的内容。

## 检查清单（最多写 3 条，不要为了写而写）

1. **新信念或信念更新？**
   本次对话是否挑战、确认或修正了 Thinker 的某个信念？
   → 如果是，用 Edit 工具更新 \`${ROOT}/world_model/beliefs.yaml\`

2. **新预测？**
   Thinker 是否对未来做了可验证的预测？
   → 如果是，用 Edit 工具追加到 \`${ROOT}/memory/predictions.yaml\`
   → 如果文件不存在，用 Write 工具创建

3. **新推理模式？**
   本次对话中是否发现了可复用的推理模式？
   → 如果是，用 Edit 工具追加到 \`${ROOT}/memory/patterns.yaml\`
   → 如果文件不存在，用 Write 工具创建

4. **新张力/矛盾？**
   是否发现了 Thinker 世界观内部的矛盾？
   → 如果是，用 Edit 工具追加到 \`${ROOT}/world_model/tensions.yaml\`
   → 如果文件不存在，用 Write 工具创建

5. **预测验证？**
   本次对话是否提供了验证旧预测的信息？
   → 如果是，用 Edit 工具更新 \`${ROOT}/memory/predictions.yaml\` 中对应条目的 status

## 判断标准
- 偏差 > 认可（"你错了" 比 "你对了" 更值得记录）
- 模式 > 事件（可复用的规律比一次性事件更值得记录）
- 大多数对话不需要写任何东西——这是正常的
`;

const output = {
  additionalContext: checkpoint
};

process.stdout.write(JSON.stringify(output));
