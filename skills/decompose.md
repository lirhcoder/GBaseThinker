# /decompose — 用动词引擎解构任意概念

将一个汉语词汇或概念解构为可执行的认知程序。

## 用法
`/decompose <词汇>`

## 执行流程

### Step 1: 加载动词库
读取 `verb_engine/cognitive_verbs.yaml`（以及 action_verbs.yaml、meta_verbs.yaml 如果存在）

### Step 2: 查找已有定义
检查动词库中是否已有该词的解构。

### Step 3: 执行解构（如果是新词）

**3a. 字级拆解**
将词拆为单字，提取每个字的核心动作含义。

**3b. 组合分析**
分析字与字的组合逻辑：
- 并列关系（A + B = A 且 B）
- 递进关系（A → B = 先 A 再 B）
- 修饰关系（A 修饰 B = 以 A 的方式做 B）
- 因果关系（A → B = 因为 A 所以 B）

**3c. 程序生成**
将组合逻辑转化为操作序列（procedure）。

**3d. 前置条件和输出**
推导执行这个程序需要什么输入，会产生什么输出。

**3e. 反模式识别**
识别常见的误用方式。

### Step 4: 输出

```yaml
{词汇}:
  decompose: [{字1}, {字2}, ...]
  meaning:
    {字1}: "{动作含义}"
    {字2}: "{动作含义}"
  combination: "{组合逻辑类型}"
  procedure:
    - "{步骤1}"
    - "{步骤2}"
    - "..."
  preconditions: [{前置条件}]
  output: "{输出形态}"
  anti_patterns:
    - "{反模式1}"
    - "{反模式2}"
  activation: "{什么时候该调用这个程序}"
```

### Step 5: 持久化
如果解构有价值，写入对应的动词库文件：
- 认知类动词 → `verb_engine/cognitive_verbs.yaml`
- 行动类动词 → `verb_engine/action_verbs.yaml`
- 元认知动词 → `verb_engine/meta_verbs.yaml`
