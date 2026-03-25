1.使用最多250个parallel subagents学习@specs/下所有需求, 为所有用户操作场景生成gherkin格式的.feature文件, 使用中文，放在根目录e2e文件下。

2.更新@AGENTS.md, 在validation部分增加一个e2e测试方式： 依次使用@e2e/文件夹下的feature文件， 学习一个文件，使用playwright-cli进行测试，把遇到的bug(包括对应的feature文件链接)更新到@IMPLEMENTATION_PLAN.md 的待修改bug中, 然后去处理下一个feature文件。