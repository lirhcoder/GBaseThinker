#!/usr/bin/env node

/**
 * GBaseThinker — UserPromptSubmit Hook
 *
 * 每当用户提交新消息时触发。
 * 注入一个轻量提醒，让 LLM 在回答前先以 Thinker 视角审视。
 *
 * 这不是完整的 Advisor 流程（那个在 /think skill 中），
 * 而是一个"轻推"——让 Thinker 始终在场。
 *
 * 触发点: UserPromptSubmit
 */

const nudge = `**[Thinker 轻推]** 回答前，花 2 秒想：
- 用户真正想要什么？（意图 ≠ 字面意思）
- 这个问题适合什么思维框架？
- 我有没有未经检验的假设？
- Thinker 的哪条信念与此相关？`;

const output = {
  additionalContext: nudge
};

process.stdout.write(JSON.stringify(output));
