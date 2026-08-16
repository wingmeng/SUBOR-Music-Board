---
title: "Bash中Windows盘符路径写法"
usage_scenario: []
keywords:
    - "Bash"
    - "Windows路径"
    - "cd命令"
---

在 Bash 中切换 Windows 盘符路径时，必须使用 `/e/...` 格式（如 `/e/GitHub/SUBOR-Music-Board`），不能使用 `e:\...` 或 `e:/...` 格式，否则报 'No such file or directory'。（来源：Bash）
