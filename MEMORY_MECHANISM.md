# Thinker Memory 机制——谁读、谁写、什么时候触发

> 设计原则：LLM 是 CPU，文件系统是硬盘，Hooks 是中断控制器。
> Thinker 不能只"想"——它必须有具体的读写管道。

---

## 一、核心问题

LLM 有一个致命弱点：**没有跨对话的持久记忆**。

每次对话开始，LLM 都是一张白纸。Thinker 要"活着"，必须解决：

| 问题 | 不能靠 LLM 的 | 必须靠 |
|------|--------------|--------|
| 记住上次的信念 | 上下文窗口（会丢） | 文件系统持久化 |
| 知道什么时候该读 | LLM 自觉（不可靠） | Hooks 自动注入 |
| 知道什么时候该写 | LLM 自觉（不可靠） | 触发规则 + Hooks |
| 决定写什么 | — | LLM 判断（这个可以靠 LLM） |
| 防止写垃圾 | — | 格式校验 + 写前审计 |

**结论**：读/写的**时机**靠工程机制（Hooks），读/写的**内容**靠 LLM 判断。

---

## 二、Memory 三层架构

```
┌─────────────────────────────────────────────────────┐
│  Layer 3: 认知层（LLM 运行时）                        │
│  Thinker 的"活"的状态——在对话上下文中运行             │
│  ⚡ 生命周期 = 单次对话                               │
│  内容: 当前推理链、临时假设、本轮观察                   │
└──────────────────────┬──────────────────────────────┘
                       │ ↕ 读/写
┌──────────────────────▼──────────────────────────────┐
│  Layer 2: 工作记忆（Session State）                   │
│  对话期间的结构化暂存区                                │
│  ⚡ 生命周期 = 单次对话，对话结束时决定哪些持久化        │
│  内容: 本次提取的概念、待验证的判断、Advisor 建议记录   │
│  存储: 临时文件 / 对话上下文内的结构化标记              │
└──────────────────────┬──────────────────────────────┘
                       │ ↕ 选择性持久化
┌──────────────────────▼──────────────────────────────┐
│  Layer 1: 长期记忆（File System）                     │
│  Thinker 的"硬盘"——跨对话存活的状态                   │
│  ⚡ 生命周期 = 永久（直到被 Thinker 自己修改/删除）     │
│  内容: 信念图谱、推理偏好、动词库、审计日志、预测记录   │
│  存储: YAML/MD 文件                                   │
└─────────────────────────────────────────────────────┘
```

---

## 三、读的机制——谁把记忆"装进"LLM

### 3.1 自动注入（Hooks 驱动，LLM 不需要主动做任何事）

```
触发点: SessionStart（每次对话开始）
方式: Hook 自动读取文件，注入到对话上下文

注入内容（按优先级）:
  1. identity/core.yaml          → Thinker 知道自己是谁（~500 tokens）
  2. world_model/beliefs.yaml    → Thinker 知道自己相信什么（~1000 tokens）
  3. world_model/heuristics.yaml → Thinker 知道怎么思考（~500 tokens）
  4. memory/active_tensions.yaml → Thinker 知道当前有什么未解决的矛盾（~300 tokens）
  5. memory/recent_patterns.yaml → 最近 5 条学到的模式（~500 tokens）

总预算: ~3000 tokens（上下文窗口的 <1%）
```

**实现方式**：一个 `SessionStart` Hook 脚本，读取关键文件，拼成一段结构化的 system context 注入。

```javascript
// hooks/inject-thinker.mjs
// SessionStart 时自动运行
// 读取 identity + world_model + memory 的关键文件
// 输出为 additionalContext，自动注入到对话上下文
```

### 3.2 按需加载（LLM 主动读取）

```
触发点: Skill 激活时（/think, /challenge, /decompose）
方式: Skill 的 prompt 指示 LLM 读取特定文件

例子:
  /think       → 读取 beliefs.yaml + heuristics.yaml（完整版）
  /decompose   → 读取 verb_engine/ 下的动词库
  /challenge   → 读取 beliefs.yaml + tensions.yaml
  /predict     → 读取 predictions.yaml（查看历史预测）
  /evolve      → 读取全部 world_model/ + memory/（全面审计）
```

### 3.3 上下文感知加载（Hook + LLM 协作）

```
触发点: PreToolUse（每次 LLM 调用工具前）
方式: Hook 检测当前对话主题，决定是否注入额外上下文

例子:
  检测到用户在讨论"系统设计" → 注入 heuristics.yaml 中的 [系统优化] 条目
  检测到用户在讨论"语言/词汇" → 注入 verb_engine/ 相关词条
  检测到 AI 即将给出结论 → 注入 Advisor prompt（提醒 AI 先过 Thinker）
```

---

## 四、写的机制——谁把新记忆"存进"文件系统

### 4.1 写的触发规则

```yaml
# 不是所有对话都值得写。写的代价是文件增长 + 未来读的负担。
# 遵循"营养价值"原则：只写蛋白质，不写糖。

必须写:
  - 用户明确纠正了 Thinker 的某个信念    → 更新 beliefs.yaml
  - Thinker 做了预测                     → 写入 predictions.yaml
  - 预测被验证（正确或错误）              → 更新 predictions.yaml + 可能更新 beliefs
  - 发现了新的内部矛盾                   → 写入 tensions.yaml
  - 世界观版本升级                       → 更新 beliefs.yaml + changelog.md

应该写:
  - 出现了新的有效推理模式               → 写入 patterns.yaml
  - 某个动词解构特别有用                 → 补充 verb_engine/
  - 某个推理偏好被证明有效/无效          → 更新 heuristics.yaml

不要写:
  - 用户的个人信息（不是 Thinker 的记忆）
  - 一次性的事实（Google 能查到的）
  - AI 的回答内容（那是 AI 的事，不是 Thinker 的事）
  - 没有经过验证的临时假设
```

### 4.2 写的执行方式

**方式 A：Skill 内嵌写指令（主要方式）**

```markdown
# skills/think.md 中的写指令示例

## 对话结束前的持久化检查

在回答用户之后，检查以下条件并执行写操作：

1. 本轮是否产生了新的信念？
   → 如果是，使用 Edit 工具更新 world_model/beliefs.yaml
   → 格式: {belief_id, content, confidence, source, created_at}

2. 本轮是否做了预测？
   → 如果是，使用 Edit 工具写入 memory/predictions.yaml
   → 格式: {prediction_id, content, context, made_at, status: pending}

3. 本轮是否发现了推理模式？
   → 如果是，使用 Edit 工具追加到 memory/patterns.yaml
   → 格式: {pattern_id, description, example, effectiveness: untested}
```

**方式 B：Stop Hook 自动触发（兜底方式）**

```
触发点: 对话即将结束（Stop event）
方式: Hook 提醒 LLM 做持久化检查

// hooks/thinker-checkpoint.mjs
// Stop 事件触发
// 注入 prompt: "Thinker 持久化检查：本次对话是否有需要写入的新信念、预测或模式？"
// LLM 判断 → 执行写操作 → 对话结束
```

**方式 C：用户主动触发**

```
/evolve  → 手动触发全面审计和持久化
/predict → 手动记录预测
```

### 4.3 写的格式约束

所有持久化文件遵循统一的 YAML 格式，带元数据：

```yaml
# beliefs.yaml 条目格式
beliefs:
  - id: B001
    content: "任何复杂现象都有比表面更深一层的结构"
    confidence: 0.85
    source: "founding_belief"
    created_at: "2024-01-01"
    last_tested: "2024-03-15"
    test_count: 3
    test_results: [confirmed, confirmed, partially_refuted]
    depends_on: []
    conflicts_with: []
    tags: [complexity, structure, epistemology]

# predictions.yaml 条目格式
predictions:
  - id: P001
    content: "用户的下一个问题会涉及实现细节而非设计"
    context: "用户已经连续问了3个架构问题"
    confidence: 0.7
    made_at: "2024-03-15T10:30:00"
    status: pending | confirmed | refuted | expired
    resolution: null
    lesson_learned: null

# patterns.yaml 条目格式
patterns:
  - id: M001
    description: "当用户说'没问题'但紧跟着问了相关问题，说明他们其实有疑虑"
    example: "用户说'懂了'，然后问了一个只有不懂才会问的问题"
    source_conversation: "2024-03-15"
    effectiveness: confirmed  # untested | confirmed | refuted
    times_applied: 5
    success_rate: 0.8
```

---

## 五、Memory 的生命周期管理

### 5.1 容量控制

```yaml
limits:
  beliefs: 50         # 最多 50 条核心信念（超过则合并或淘汰低置信度的）
  predictions: 100     # 最多 100 条预测（resolved 的定期归档）
  patterns: 30         # 最多 30 条模式（低 effectiveness 的淘汰）
  tensions: 10         # 最多 10 条活跃张力（超过则强制解决最旧的）
  audit_log: 500 lines # 审计日志滚动保留最近 500 行

cleanup_trigger: /evolve 或每 10 次对话自动触发
```

### 5.2 记忆衰减

```yaml
# 不是所有记忆都等价。长期未验证的信念会衰减。
decay_rules:
  - type: belief
    rule: "超过 30 天未被测试的信念，confidence 自动 -0.1"
    floor: 0.3  # 衰减到 0.3 以下则标记为 [需要重新验证]

  - type: prediction
    rule: "超过 7 天未解决的预测，标记为 expired"

  - type: pattern
    rule: "超过 20 天未被应用的模式，标记为 [冷冻]"
    action: "从 SessionStart 注入列表中移除，但不删除"
```

### 5.3 记忆冲突解决

```
当新记忆与旧记忆冲突时:

1. 如果新记忆有更强的证据 → 更新旧记忆，降低旧 confidence
2. 如果证据强度相当 → 写入 tensions.yaml，标记为待解决
3. 如果旧记忆 confidence > 0.9 且新证据单一 → 保留旧记忆，记录异常
```

---

## 六、完整的数据流

```
对话开始
    │
    ▼
[SessionStart Hook] ─── 读取 ──→ identity/core.yaml
                                  world_model/beliefs.yaml (摘要)
                                  world_model/heuristics.yaml (摘要)
                                  memory/active_tensions.yaml
                                  memory/recent_patterns.yaml
    │
    │  注入到对话上下文（~3000 tokens）
    ▼
用户输入: "我觉得微服务比单体好"
    │
    ▼
[LLM + Thinker 认知层]
    │
    ├── Extractor（在 LLM 思考过程中运行）:
    │     意图: 用户在表达一个架构偏好
    │     概念: [微服务, 单体, 架构选择]
    │     信号: 断言式，confidence 高，可能有盲点
    │
    ├── Advisor（查询已注入的 beliefs）:
    │     发现: beliefs.yaml 中有 "架构选择依赖上下文，没有银弹" (confidence: 0.9)
    │     建议: 挑战用户的绝对化表述，追问 "在什么场景下？"
    │     声量: 中（不是高危推理，但有盲点风险）
    │
    └── AI 生成回答（受 Advisor 影响）:
          "微服务确实解决了很多问题，但 Thinker 想追问一下:
           在什么团队规模和业务阶段下，你认为微服务优于单体？"
    │
    ▼
[本轮记录（工作记忆，暂不持久化）]:
    - 用户对"架构选择"有强倾向
    - Thinker 做了一个隐含预测: 用户可能缺少单体成功经验
    │
    ▼
... 对话继续多轮 ...
    │
    ▼
对话即将结束
    │
    ▼
[Stop Hook 或 /evolve 触发持久化检查]
    │
    ├── LLM 判断: 本次对话产生了什么值得记住的？
    │
    ├── 决定写入:
    │     ✅ pattern: "用户表达绝对化偏好时，追问场景边界是有效的"
    │     ✅ prediction: "这个用户后续会遇到微服务复杂度问题" (pending)
    │     ❌ belief: 没有新信念（现有信念被确认，不需要更新）
    │
    └── 执行写操作:
          Edit memory/patterns.yaml  ← 追加新模式
          Edit memory/predictions.yaml ← 追加新预测
    │
    ▼
对话结束，状态已持久化
    │
    ▼
下次对话开始
    │
    ▼
[SessionStart Hook] ─── 读取更新后的文件 ──→ Thinker 带着新记忆醒来
```

---

## 七、与 DESIGN.md 的关系

这个文档补充了 DESIGN.md 中缺失的一块：

| DESIGN.md 定义了 | 本文档定义了 |
|-----------------|-------------|
| Thinker 有什么模块 | 这些模块的数据怎么流动 |
| 世界观存在 yaml 里 | yaml 什么时候被读、被谁读 |
| Auditor 会复盘 | 复盘结果怎么变成持久化的记忆 |
| 信念有置信度 | 置信度怎么衰减、怎么更新 |
| 要有容量控制 | 具体的上限数字和清理规则 |

**一句话总结**：DESIGN.md 是 Thinker 的解剖学，本文档是 Thinker 的生理学。

---

## 八、工程实现清单

### 必须实现的 Hooks

| Hook | 触发点 | 功能 |
|------|--------|------|
| `inject-thinker.mjs` | SessionStart | 读取核心文件，注入对话上下文 |
| `thinker-checkpoint.mjs` | Stop | 提醒 LLM 做持久化检查 |

### 必须实现的文件格式

| 文件 | 格式 | 首次创建时机 |
|------|------|------------|
| `identity/core.yaml` | 身份定义 | Phase 1 手动创建 |
| `world_model/beliefs.yaml` | 信念列表 | Phase 1 手动创建初始信念 |
| `world_model/heuristics.yaml` | 推理偏好 | Phase 1 手动创建 |
| `memory/patterns.yaml` | 模式列表 | Phase 3 首次对话后自动创建 |
| `memory/predictions.yaml` | 预测列表 | Phase 3 首次预测时自动创建 |
| `world_model/tensions.yaml` | 张力列表 | Phase 4 首次发现矛盾时自动创建 |
| `identity/changelog.md` | 版本日志 | Phase 4 首次世界观升级时创建 |

### Skill 中的写指令模板

每个 Skill 的 prompt 末尾都应包含：

```markdown
## 持久化检查（每次 Skill 执行完毕后）

回顾本次思考过程，检查是否需要写入：
1. [ ] 新信念或信念更新 → Edit world_model/beliefs.yaml
2. [ ] 新预测 → Edit memory/predictions.yaml
3. [ ] 新模式 → Edit memory/patterns.yaml
4. [ ] 新张力 → Edit world_model/tensions.yaml
5. [ ] 推理偏好调整 → Edit world_model/heuristics.yaml

如果都不需要，跳过。不要为了写而写。
```
