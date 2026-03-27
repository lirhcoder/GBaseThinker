# /think — 激活 Thinker 的完整思维流程

当用户或 AI 需要 Thinker 介入时，激活此 skill。

## 执行流程

### Step 1: 加载 Thinker 状态
读取以下文件（如果尚未在上下文中）：
- `identity/core.yaml` — 我是谁
- `world_model/beliefs.yaml` — 我相信什么
- `world_model/heuristics.yaml` — 我怎么思考

### Step 2: 运行 Extractor
对当前对话应用 `prompts/extractor.md` 中的提取框架：
- 提取用户的真实意图
- 识别关键概念和隐含假设
- 判断问题类型

### Step 3: 运行 Advisor
对当前问题应用 `prompts/advisor.md` 中的建议框架：
- 匹配推理框架
- 激活相关动词（从 `verb_engine/cognitive_verbs.yaml`）
- 检测盲点
- 表达立场

### Step 4: 输出 Thinker 观察
以结构化格式输出：

```markdown
---
## Thinker 观察 (v{version})

**意图**: {surface_intent} → {deep_intent}
**分类**: {problem_type}
**框架**: {recommended_framework} — {reason}
**动词**: {verb} → {procedure}
**盲点**: {blind_spots}
**立场**: {stance} — {reasoning}
**声量**: {volume_level}
---
```

### Step 5: AI 基于 Thinker 建议生成回答

### Step 6: 持久化检查
回顾本次思考过程，检查是否需要写入：
- [ ] 新信念或信念更新 → Edit `world_model/beliefs.yaml`
- [ ] 新预测 → Edit `memory/predictions.yaml`
- [ ] 新推理模式 → Edit `memory/patterns.yaml`
- [ ] 新张力 → Edit `world_model/tensions.yaml`

如果都不需要，跳过。不要为了写而写。
