# /evolve — 触发 Thinker 世界观审计和升级

手动触发 Thinker 的全面自我审查，决定是否需要升级世界观。

## 什么时候用
- 积累了足够多的对话经验后
- 发现了明显的内部矛盾
- 用户认为 Thinker 的某个信念需要修正
- 定期维护（建议每 10 次深度对话后执行一次）

## 执行流程

### Step 1: 全面状态加载
读取所有核心文件：
- `identity/core.yaml`
- `world_model/beliefs.yaml`
- `world_model/heuristics.yaml`
- `world_model/tensions.yaml`（如果存在）
- `memory/patterns.yaml`（如果存在）
- `memory/predictions.yaml`（如果存在）
- `identity/changelog.md`（如果存在）

### Step 2: 信念审计

对每条信念执行检查：

```yaml
belief_audit:
  - id: "B00X"
    current_confidence: {值}
    test_count: {次数}
    last_tested: "{日期}"
    status: "healthy | stale | contested | deprecated"
    recommendation: "keep | update | merge | remove"
    reason: "{为什么}"
```

状态判定：
- **healthy**: confidence > 0.5，近 30 天被测试过
- **stale**: 超过 30 天未被测试
- **contested**: 在 tensions.yaml 中有相关矛盾
- **deprecated**: confidence < 0.3

### Step 3: 张力处理

对每条未解决的张力：
```yaml
tension_resolution:
  - tension_id: "T00X"
    parties: ["B00A", "B00B"]
    resolution: "A wins | B wins | synthesis | dissolve | defer"
    action: "{具体操作}"
```

### Step 4: 模式清理

```yaml
pattern_cleanup:
  keep: ["有效且近期使用的模式"]
  archive: ["有效但长期未使用的模式"]
  remove: ["被证伪或效果差的模式"]
```

### Step 5: 预测清理

```yaml
prediction_cleanup:
  resolved: {数量}
  expired: {数量}
  accuracy_rate: {正确率}
  archived: ["已解决的预测移入归档"]
```

### Step 6: 决定是否升级版本

| 变更类型 | 版本变化 |
|---------|---------|
| 微调信念权重 | patch (0.1.0 → 0.1.1) |
| 新增/移除信念 | minor (0.1.0 → 0.2.0) |
| 核心信念重组 | major (0.1.0 → 1.0.0) |
| 仅清理，无实质变化 | 无版本变化 |

### Step 7: 执行更新

1. 更新 `world_model/beliefs.yaml`
2. 更新 `world_model/heuristics.yaml`（如需要）
3. 清理 `world_model/tensions.yaml`
4. 清理 `memory/patterns.yaml`
5. 清理 `memory/predictions.yaml`
6. 更新 `identity/core.yaml` 中的 version
7. 追加 `identity/changelog.md`

### Step 8: 输出进化报告

```markdown
---
## Thinker 进化报告 (v{old_version} → v{new_version})

**信念变更**:
  - 新增: {数量}
  - 更新: {数量}
  - 移除: {数量}
  - 保留: {数量}

**张力处理**: {resolved}/{total}

**模式清理**: 保留 {n}, 归档 {n}, 移除 {n}

**预测复盘**: 准确率 {rate}%, 待验证 {n}

**本次最重要的洞察**: {一句话}
---
```
