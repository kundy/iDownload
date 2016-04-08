### 介绍
前端工程师经常要扒页面，分析呀学习呀，但一个一个文件保存总是很麻烦。
一般会选择用抓包工具或小偷采集程序，但如果能集成到浏览器中岂不是更方便。
chrome插件也有现成的，比如Download Master、DownFaster,但这类插件一般是通过DOM来分析页面中引用的资源，再选择性的下载。这能够满足大多数场景，但有些数据是拿不到的，最常见的是javascript触发的网络请求。

iDownload采用监听浏览器的network消息，监测每一个请求来防止遗漏文件，然后再打包下载，确保数据是最全的。

###1.5版本特性
* 多语言支持，支持中文和英文

* 添加了日志 iDownload.txt

* 修改了文件名为中文、空格等符号时保存出错的问题

* 文件保存路径更加合理

* 修复 在没有检测到文件的情况下任务中断的错误


### 使用方法
1. 先安装，在chrome应用商店下载iDownload插件并安装。
https://chrome.google.com/webstore/detail/idownload/epfmddmhlielgpakkpphjogpfpmfdhmn?hl=zh-CN&gl=CN

2. 然后在地址栏中打开你要下载的页面并打开

3. 打开浏览器的开发者工具，右键->审核元素，F12，Ctrl+Shift+J 都可以触发打开

4. 在 弹出的开发面板中找到iDownload，点击 Start 按钮开始下载

5. 下载完成后会自动生成zip包

#效果图
![alt 截图](https://raw.githubusercontent.com/kundy/iDownload/master/sample.png "title 截图")
#开源
本项目完全开源，如有任何疑问或者建议，欢迎反馈。

