# 哔哩哔哩（bilibili.com）播放页调整

一个简单的小脚本，主要是给自己用的。

**推荐使用 Violentmonkey(暴力猴) 加载本脚本，使用 Tampermonkey 可能会导致无法预料的错误。**

**视频会静音为浏览器安全行为，与本脚本无关，在浏览器地址栏左侧(不同浏览器位置及展现方式可能不同)网站权限中选择“允许音频和视频”即可。**

**如果发现脚本不能用，说明你的播放页面已经更新为新版。因本人多个账号均未收到新版播放页更新推送，无法进行适配，故暂时下架。**

**旧版可以使用（页面右侧没有‘新版反馈’或‘回到旧版’按钮即为旧版）。**

1.自动定位到播放器（进入播放页，可自动定位到播放器，可设置偏移量及是否在点击主播放器时定位）。

2.可设置是否自动选择最高画质。

3.可设置播放器默认模式。

部分代码借鉴了油小猴的网盘智能识别助手，特此感谢。

## 历史更新

### 2022

`07.15 15:48`：尝试修复自动切换播放器模式概率失效的问题。

`07.09 22:50`：修复自动定位会在首次定位成功后重复执行的问题。
