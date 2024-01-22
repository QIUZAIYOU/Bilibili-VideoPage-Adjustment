# 哔哩哔哩（bilibili.com）播放页调整

一个简单的小脚本，主要是给自己用的。

**视频会静音为浏览器安全行为，与本脚本无关，在浏览器地址栏左侧(不同浏览器位置及展现方式可能不同)网站权限中选择“允许音频和视频”即可。**

**如果发现脚本不能用，说明你的播放页面已经更新为新版。因本人多个账号均未收到新版播放页更新推送，无法进行适配，故暂时下架。**

**旧版可以使用（页面右侧没有‘新版反馈’或‘回到旧版’按钮即为旧版）。**

1.自动定位到播放器（进入播放页，可自动定位到播放器，可设置偏移量及是否在点击主播放器时定位）。

2.可设置是否自动选择最高画质。

3.可设置播放器默认模式。

少部分代码借鉴了油小猴的网盘智能识别助手，特此感谢。

## 历史更新

### 2024

`01.22 09:45`：修复因 `01.17 09:48` 更新，误把「自动选择播放器默认模式」功能关闭状态检测删除，在功能关闭状态下错误尝试切换播放器模式导致页面闪烁的问题。

`01.21 21:07`：修复因播放页代码变动导致的「自动选择最高画质」功能失效的问题。

`01.19 18:30`：修复开启「网页全屏解锁」功能后错误循环执行「自动定位至播放器」的问题。[#2](https://github.com/QIUZAIYOU/Bilibili-VideoPage-Adjustment/issues/2)

`01.19 17:57`：增加检查视频是否处于可播放状态的次数。

`01.17 09:48`：优化代码，移除代码中已失效的部分。

`01.09 21:14`：修复「bangumi」页面右侧漂浮导航插入「自动定位至播放器」按钮失效的问题。

`01.09 11:10`：修复「bangumi」页面播放「电影」类型视频时自动选择「播放器默认模式」失败的问题。设置中新增「脚本执行失败自动刷新重试」选项。

### 2023

`12.28 20:20`：适配最新的「bangumi」页面代码，修复「自动定位至播放器」及「点击播放器自动定位至播放器」错位的问题，其他积累问题修复。

`11.14 20:58`：调整「自动定位至播放器」判定条件，提高定位成功率。

`11.11 21:49`：修复「bangumi」播放页自动选择「播放器默认模式」失败的问题。

`11.11 20:59`：修复因数字精度问题导致「自动定位至播放器」功能失效的问题。

`07.04 08:10`：修复因一行调试代码未注释导致火狐浏览器中脚本报错不执行的问题。

`06.19 23:23`：设置中新增「播放器默认模式」选项，可选择关闭。

`06.18 14:37`：重构后代码重新加入浏览器标签页激活状态检测，调整设置将在当前标签页激活时应用。

`04.08 14:21`：优化对「video」播放页新版网页结构的适配。

`04.01 23:41`：重构代码，优化脚本，适配「video」播放页新版网页结构。

`02.26 21:50`：设置中新增「自动定位至播放器」选项，可自由选择在「video」或「bangumi」类型播放页中开启本功能。默认全部开启。

`02.13 22:55`：修复点击浏览器前进后退按钮后「自动定位至播放器」功能不生效的问题。

`02.11 22:11`：修复点击「bangumi」播放页「时间锚点」自动定位至播放器功能失效的问题。

`02.11 20:37`：修复点击新加载评论中的「时间锚点」自动定位至播放器功能失效的问题。

`02.10 19:25`：修复因 `02.10 16:29` 更新覆盖评论区「时间锚点」原有功能导致的视频播放进度不跳转的问题。

`02.10 16:29`：新增点击评论区「时间锚点」自动定位至播放器功能。

`02.08 22:28`：1.优化代码，修复部分函数会重复执行的问题。2.「网页全屏模式解锁」功能开启状态下视频控制条「进入全屏」按钮旁新增「前往评论」按钮，可点击此按钮直达评论区，避免滚动鼠标滚轮出现调整音量提示。

`02.08 09:52`：适配「稍后再看」视频播放页面。

### 2022

`10.14 11:40`：开启「网页全屏模式解锁」功能后，下滑新增迷你播放器显示，不过比较简陋，只支持暂停/播放操作，有条件的建议还是直接使用浏览器自带的小窗播放功能。

`10.14 09:53`：修复开启「自动选择最高画质」功能后，未勾选 「是否包含4K」及「是否包含8K」的情况下错误选择 8K 画质的问题。

`10.11 20:45`：修复开启「网页全屏模式解锁」功能后，网页全屏状态下切换其他模式页面错乱的问题。

`09.30 23:00`：新增「网页全屏模式解锁」功能，网页全屏模式下可以滑动滚动条查看下方评论等内容（因bangumi播放页网页全屏时下方评论仍未加载所以暂不支持），需在设置里重新勾选播放器默认模式并保存后生效（如不生效多保存几次并清除浏览器缓存试试）。

`09.30 10:10`：重构部分代码，修复积累问题。

`08.09 09:15`：修复「自动选择最高画质」功能「是否包含4K」的问题。

`08.08 17:00`：加入浏览器标签页激活状态检测，调整设置将在当前标签页激活时应用。

`08.02 20:56`：适配新版播放页改动。

`07.18 10:16`：尝试修复「自动定位至播放器」概率失效的问题。

`07.15 16:27`：尝试修复自动选择「播放器默认模式」概率失效的问题。

`07.09 22:50`：修复「自动定位至播放器」会在首次定位成功后重复执行的问题。
