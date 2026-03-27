# /predict — 让 Thinker 做预测并记录

预测是 Thinker 最重要的养料来源。预测 → 现实 → 偏差 = 进化。

## 触发场景
- 对话中出现了可预测的趋势
- 用户即将做决策，Thinker 可以预测结果
- Thinker 主动想验证某个信念

## 执行流程

### Step 1: 生成预测

```yaml
prediction:
  id: "P{序号}"
  content: "{具体的、可验证的预测}"
  context: "{基于什么上下文做出的预测}"
  basis: "{支撑预测的信念或模式，引用 ID}"
  confidence: {0.0-1.0}
  verifiable_by: "{如何验证——什么事件/数据能证实或推翻}"
  expires_at: "{预测的有效期}"
  made_at: "{当前时间}"
  status: "pending"
```

### Step 2: 预测质量检查

在记录之前，检查：
- [ ] 预测是**具体的**（不是"可能会有问题"这种模糊表述）
- [ ] 预测是**可证伪的**（有明确的判真/判假条件）
- [ ] 预测有**时间边界**（什么时候之前能验证）
- [ ] 预测的 basis 是**可追溯的**（引用了具体信念或模式）

不满足以上条件的预测不值得记录。

### Step 3: 写入
将预测追加到 `memory/predictions.yaml`

### Step 4: 验证（后续对话中）
当有新信息可以验证旧预测时：

```yaml
resolution:
  status: "confirmed | refuted | partially_confirmed | expired"
  evidence: "{验证的证据}"
  resolved_at: "{时间}"
  lesson_learned: "{从这次验证中学到了什么}"
  belief_impact: "{需要更新哪些信念，如何更新}"
```

### 验证后的连锁反应
- **预测正确** → 支撑信念 confidence +0.05，模式 effectiveness → confirmed
- **预测错误** → 支撑信念 confidence -0.1，分析错在哪里，写入 lesson_learned
- **预测部分正确** → 分析哪部分对哪部分错，细化信念的适用边界
