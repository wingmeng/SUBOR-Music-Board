---
title: "输入模式与Backspace/Delete行为规范"
usage_scenario: []
keywords:
    - "插入模式"
    - "覆盖模式"
    - "Backspace"
    - "Delete"
    - "右移"
    - "左移"
    - "位移"
    - "输入模式"
    - "INS"
    - "OVR"
---

SUBOR Music Board项目采用Insert/Overwrite双模式输入机制：
- 默认为插入模式（Insert Mode），按Insert键或UI按钮可切换至覆盖模式（Overwrite Mode）
- 插入操作只影响当前声部，不影响其他声部
- 光标始终在某个具体文本框内（每个音符一个input），不存在"光标在两个音符之间"的情况

插入模式下：
- 输入音符：当前列到末尾，同声部所有音符右移一位，末位丢弃（固定138列），新音符写入光标处，光标前进
- Backspace：删除光标前一个cell的音符，前一位置之后同声部所有音符左移一位填补空缺，末位补空格，光标后退一列；光标在第0列时无操作
- Delete：仅清空光标当前cell内容，不改变后续音符位置，光标不动

覆盖模式下：
- 输入音符：直接覆盖当前cell，不触发位移，光标前进
- Backspace：清空前一个cell内容，不触发位移，光标后退
- Delete：清空当前cell内容，不触发位移，光标不动
