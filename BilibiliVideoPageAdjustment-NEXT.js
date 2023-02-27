// ==UserScript==
// @name              NEXT-哔哩哔哩（bilibili.com）播放页调整
// @license           GPL-3.0 License
// @namespace         https://greasyfork.org/zh-CN/scripts/415804-bilibili%E6%92%AD%E6%94%BE%E9%A1%B5%E8%B0%83%E6%95%B4-%E8%87%AA%E7%94%A8
// @version           0.12.1
// @description       1.自动定位到播放器（进入播放页，可自动定位到播放器，可设置偏移量及是否在点击主播放器时定位）；2.可设置是否自动选择最高画质；3.可设置播放器默认模式；
// @author            QIAN
// @match             *://*.bilibili.com/video/*
// @match             *://*.bilibili.com/bangumi/play/*
// @match             *://*.bilibili.com/list/watchlater*
// @run-at            document-start
// @require           https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js
// @require           https://unpkg.com/sweetalert2@11.7.2/dist/sweetalert2.min.js
// @resource          swalStyle https://unpkg.com/sweetalert2@11.7.2/dist/sweetalert2.min.css
// @grant             GM_setValue
// @grant             GM_getValue
// @grant             GM_registerMenuCommand
// @grant             GM_getResourceText
// @grant             GM.info
// @supportURL        https://github.com/QIUZAIYOU/Bilibili-VideoPage-Adjustment
// @homepageURL       https://github.com/QIUZAIYOU/Bilibili-VideoPage-Adjustment
// @icon              https://www.bilibili.com/favicon.ico?v=1
// ==/UserScript==
$(() => {
  const globalVariables = {
    currentUrl: window.location.href,
    theMainFunctionRunningTimes: 0,
    thePrepFunctionRunningTimes: 0,
    autoSelectScreenModeTimes: 0,
    autoCancelMuteTimes: 0,
    webfullUnlockTimes: 0,
    insertGoToCommentsButtonTimes: 0,
    autoSelectVideoHightestQualityTimes: 0
  }
  const utils = {
    getValue(name) {
      return GM_getValue(name);
    },
    setValue(name, value) {
      GM_setValue(name, value);
    },
    sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    },
    addStyle(id, tag, css) {
      tag = tag || "style";
      const doc = document;
      const styleDom = doc.getElementById(id);
      if (styleDom) return;
      const style = doc.createElement(tag);
      style.rel = "stylesheet";
      style.id = id;
      tag === "style" ? (style.innerHTML = css) : (style.href = css);
      document.head.appendChild(style);
    },
    historyListener() {
      class Dep {
        constructor(name) {
          this.id = new Date();
          this.subs = [];
        }
        defined() {
          Dep.watch.add(this);
        }
        notify() {
          this.subs.forEach((e, i) => {
            if (typeof e.update === "function") {
              try {
                e.update.apply(e);
              } catch (err) {
                console.warr(err);
              }
            }
          });
        }
      }
      Dep.watch = null;
      class Watch {
        constructor(name, fn) {
          this.name = name;
          this.id = new Date();
          this.callBack = fn;
        }
        add(dep) {
          dep.subs.push(this);
        }
        update() {
          var cb = this.callBack;
          cb(this.name);
        }
      }
      var addHistoryMethod = (function() {
        var historyDep = new Dep();
        return function(name) {
          if (name === "historychange") {
            return function(name, fn) {
              var event = new Watch(name, fn);
              Dep.watch = event;
              historyDep.defined();
              Dep.watch = null;
            };
          } else if (name === "pushState" || name === "replaceState") {
            var method = history[name];
            return function() {
              method.apply(history, arguments);
              historyDep.notify();
              // utils.logger.info("访问历史｜变化")
            };
          }
        };
      })();
      window.addHistoryListener = addHistoryMethod("historychange");
      history.pushState = addHistoryMethod("pushState");
      history.replaceState = addHistoryMethod("replaceState");
      window.addHistoryListener("history", function() {
        const throttleAutoLocation = utils.throttle(methods.autoLocation, 500)
        throttleAutoLocation();
      });
    },
    checkBrowserHistory() {
      window.addEventListener('popstate', () => {
        this.autoLocation();
      });
    },
    throttle(func, delay) {
      let wait = false;
      return (...args) => {
        if (wait) {
          return;
        }
        func(...args);
        wait = true;
        setTimeout(() => {
          wait = false;
        }, delay);
      }
    },
    getClientHeight() {
      var clientHeight = 0;
      if (document.body.clientHeight && document.documentElement.clientHeight) {
        var clientHeight = document.body.clientHeight < document.documentElement.clientHeight ? document.body.clientHeight : document.documentElement.clientHeight;
      } else {
        var clientHeight = document.body.clientHeight > document.documentElement.clientHeight ? document.body.clientHeight : document.documentElement.clientHeight;
      }
      return clientHeight;
    },
    cookie(key) {
      return document.cookie.replace(new RegExp(String.raw`(?:(?:^|.*;\s*)${key}\s*=\s*([^;]*).*$)|^.*$`), '$1')
    },
    isLogin() {
      // utils.logger.info(`登录｜${Boolean(this.cookie('bili_jct'))}`)
      return Boolean(this.cookie('bili_jct'))
    },
    logger: {
      info(content) {
        console.info('%c 播放页调整 ', 'color:white;background:#006aff;padding:3px 2px;border-radius:2px', content);
      },
      warn(content) {
        console.warn('%c 播放页调整 ', 'color:white;background:#ff6d00;padding:3px 2px;border-radius:2px', content);
      },
      error(content) {
        console.error('%c 播放页调整 ', 'color:white;background:#f33;padding:3px 2px;border-radius:2px', content);
      }
    }
  }
  const methods = {
    // 初始化设置参数
    initValue() {
      const value = [
      {
        name: "player_type",
        value: "video"
      },
      {
        name: "offset_top",
        value: 7
      },
      {
        name: "auto_locate",
        value: true
      },
      {
        name: "auto_locate_video",
        value: true
      },
      {
        name: "auto_locate_bangumi",
        value: true
      },
      {
        name: "player_offset_top",
        value: 160
      },
      {
        name: "is_vip",
        value: false
      },
      {
        name: "click_player_auto_locate",
        value: true
      },
      {
        name: "current_screen_mode",
        value: "normal"
      },
      {
        name: "selected_screen_mode",
        value: "wide"
      },
      {
        name: "auto_select_video_highest_quality",
        value: true
      },
      {
        name: "contain_quality_4k",
        value: false
      },
      {
        name: "contain_quality_8k",
        value: false
      },
      {
        name: "webfull_unlock",
        value: false
      }];
      value.forEach((v) => {
        if (utils.getValue(v.name) === undefined) {
          utils.setValue(v.name, v.value);
        }
      });
    },
    // 检查播放器是否存在
    checkVideoPlayerExists() {
      return new Promise((resolve, reject) => {
        let count = 100;
        let checkVideoPlayerExistsInterval = setInterval(() => {
          if ($('#bilibili-player video').length > 0) {
            clearInterval(checkVideoPlayerExistsInterval);
            checkVideoPlayerExistsInterval = null
            resolve(true);
          } else if (count <= 0) {
            clearInterval(checkVideoPlayerExistsInterval);
            checkVideoPlayerExistsInterval = null
            resolve(false);
          }
          count--;
        }, 100)
      })
    },
    // 检查视频资源是否加载完毕处于可播放状态
    async checkVideoCanPlayThrough() {
      return new Promise((resolve, reject) => {
        $('#bilibili-player video').on('canplaythrough', () => {
          // utils.logger.info("视频资源加载｜成功")
          let count = 100;
          let timer = setInterval(() => {
            const isHidden = $('#bilibili-player .bpx-player-container').attr('data-ctrl-hidden');
            if (isHidden === 'false') {
              clearInterval(timer);
              timer = null
              // utils.logger.info(`视频可播放`)
              // utils.logger.info(`控制条｜出现(hidden:${isHidden})`)
              resolve(true);
            } else if (count <= 0) {
              clearInterval(timer);
              timer = null
              // utils.logger.error("控制条｜检查失败")
              resolve(false);
            }
            // utils.logger.info("控制条｜检查中")
            count--;
          }, 100);
        });
      });
    },
    // 获取当前视频类型(video/bangumi)
    getCurrentPlayerType() {
      if (globalVariables['currentUrl'].includes("www.bilibili.com/video") || globalVariables['currentUrl'].includes("www.bilibili.com/list/watchlater")) utils.setValue("player_type", "video");
      if (globalVariables['currentUrl'].includes("www.bilibili.com/bangumi")) utils.setValue("player_type", "bangumi");
    },
    // 获取当前屏幕模式(normal/wide/web/full)
    getCurrentScreenMode() {
      return new Promise((resolve, reject) => {
        if ($('#bilibili-player .bpx-player-container')) {
          const screenMode = $('#bilibili-player .bpx-player-container').attr('data-screen')
          resolve(screenMode)
        } else {
          reject(false)
        }
      })
    },
    // 监听屏幕模式变化(normal/wide/web/full)
    watchScreenModeChange() {
      const screenModObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          const playerDataScreen = $('#bilibili-player .bpx-player-container').attr('data-screen')
          utils.setValue('current_screen_mode', playerDataScreen)
        });
      });
      screenModObserver.observe($('#bilibili-player .bpx-player-container')[0], {
        attributes: true,
        attributeFilter: ['data-screen']
      });
    },
    // 判断自动切换屏幕模式是否切换成功
    async checkScreenModeSuccess(expect_mode) {
      const selected_screen_mode = utils.getValue('selected_screen_mode')
      const current_screen_mode = await this.getCurrentScreenMode()
      const player_data_screen = $('#bilibili-player .bpx-player-container').attr('data-screen')
      const equal = new Set([expect_mode, selected_screen_mode, current_screen_mode, player_data_screen]).size === 1
      return new Promise((resolve, reject) => {
        if (equal) {
          // utils.logger.info(`屏幕模式｜${selected_screen_mode}｜切换成功`)
          resolve(true)
        } else {
          resolve(false)
        }
      })
    },
    // 自动选择屏幕模式
    autoSelectScreenMode() {
      globalVariables.autoSelectScreenModeTimes++
      if (globalVariables.autoSelectScreenModeTimes === 1) {
        const player_type = utils.getValue('player_type')
        const selected_screen_mode = utils.getValue('selected_screen_mode')
        return new Promise((resolve, reject) => {
          const wideEnterBtn = player_type === 'video' ? '.bpx-player-ctrl-wide-enter' : '.squirtle-widescreen-inactive'
          const webEnterBtn = player_type === 'video' ? '.bpx-player-ctrl-web-enter' : '.squirtle-pagefullscreen-inactive'
          if (selected_screen_mode === 'wide') {
            $(wideEnterBtn).click()
            let checkScreenModeInterval = setInterval(async () => {
              const success = await this.checkScreenModeSuccess('wide')
              if (success) {
                clearInterval(checkScreenModeInterval)
                checkScreenModeInterval = null
                utils.setValue('current_screen_mode', selected_screen_mode)
                resolve({
                  flag: true,
                  mode: selected_screen_mode
                })
              } else {
                $(wideEnterBtn).click()
                utils.logger.warn("自动选择屏幕模式失败正在重试");
              }
            }, 100)
          }
          if (selected_screen_mode === 'web') {
            $(webEnterBtn).click()
            let checkScreenModeInterval = setInterval(async () => {
              const success = await this.checkScreenModeSuccess('web')
              if (success) {
                clearInterval(checkScreenModeInterval)
                checkScreenModeInterval = null
                utils.setValue('current_screen_mode', selected_screen_mode)
                resolve({
                  flag: true,
                  mode: selected_screen_mode
                })
              } else {
                $(webEnterBtn).click()
                utils.logger.warn("自动选择屏幕模式失败正在重试");
              }
            }, 100)
          }
        })
      }
    },
    // 网页全屏解锁
    fixedWebfullUnlockStyle() {
      globalVariables.webfullUnlockTimes++;
      if (globalVariables.webfullUnlockTimes === 1) {
        const clientHeight = utils.getClientHeight();
        $("body.webscreen-fix").css({
          "padding-top": clientHeight,
          position: "unset"
        });
        $("#bilibili-player.mode-webscreen").css({
          height: clientHeight,
          position: "absolute"
        });
        $("#app").prepend($("#bilibili-player.mode-webscreen"));
        $("#playerWrap").css("display", "none");
        utils.logger.info("网页全屏解锁成功");
        utils.setValue("current_screen_mode", "web");
        this.insertGoToCommentsButton();
        // 退出网页全屏
        $(".bpx-player-ctrl-btn-icon.bpx-player-ctrl-web-leave").click(function() {
          $("body").css({
            "padding-top": 0,
            position: "auto"
          });
          $("#playerWrap").css("display", "block");
          const playerWrapHeight = $("#playerWrap").height();
          $("#bilibili-player").css({
            height: playerWrapHeight,
            position: "unset"
          });
          $("#playerWrap").append($("#bilibili-player.mode-webscreen"));
          utils.setValue("selected_screen_mode", "wide");
          this.autoLocation();
          utils.setValue("selected_screen_mode", "web");
          $(".float-nav-exp .mini").css("display", "");
        });
        // 再次进入网页全屏
        $(".bpx-player-ctrl-btn-icon.bpx-player-ctrl-web-enter").click(function() {
          $("body").css({
            "padding-top": clientHeight,
            position: "unset"
          });
          $("#bilibili-player").css({
            height: clientHeight,
            position: "absolute"
          });
          $("#app").prepend($("#bilibili-player"));
          $("#playerWrap").css("display", "none");
          $(".float-nav-exp .mini").css("display", "none");
          $("#danmukuBox").css("margin-top", "20px");
          $("html,body").scrollTop(0);
        });
      }
    },
    // 插入跳转评论按钮
    insertGoToCommentsButton() {
      globalVariables.insertGoToCommentsButtonTimes++;
      const player_type = utils.getValue("player_type");
      const webfull_unlock = utils.getValue("webfull_unlock");
      if (player_type === "video" && webfull_unlock && globalVariables.insertGoToCommentsButtonTimes === 1) {
        const goToCommentsBtnHtml = `<div class="bpx-player-ctrl-btn bpx-player-ctrl-comment" role="button" aria-label="前往评论" tabindex="0"><div id="goToComments" class="bpx-player-ctrl-btn-icon"><span class="bpx-common-svg-icon"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="88" height="88" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: 100%; transform: translate3d(0px, 0px, 0px);"><path d="M512 85.333c235.637 0 426.667 191.03 426.667 426.667S747.637 938.667 512 938.667a424.779 424.779 0 0 1-219.125-60.502A2786.56 2786.56 0 0 0 272.82 866.4l-104.405 28.48c-23.893 6.507-45.803-15.413-39.285-39.296l28.437-104.288c-11.008-18.688-18.219-31.221-21.803-37.91A424.885 424.885 0 0 1 85.333 512c0-235.637 191.03-426.667 426.667-426.667zm-102.219 549.76a32 32 0 1 0-40.917 49.216A223.179 223.179 0 0 0 512 736c52.97 0 103.19-18.485 143.104-51.67a32 32 0 1 0-40.907-49.215A159.19 159.19 0 0 1 512 672a159.19 159.19 0 0 1-102.219-36.907z" fill="#currentColor"/></svg></span></div></div>`;
        $(".bpx-player-control-bottom-right").append(goToCommentsBtnHtml);
        $("#goToComments").on('click', function(event) {
          event.stopPropagation()
          $("body,html").scrollTop($("#comment").offset().top - 10)
          utils.logger.info("到达评论区");
        });
      }
    },
    // 添加返回播放器按钮
    async insertBackToPlayerButton() {
      const player_type = utils.getValue("player_type");
      const playerDataScreen = await this.getCurrentScreenMode()
      if (player_type === "video") {
        const locateButtonHtml = `<div class="item locate" title="定位至播放器">\n<svg t="1643419779790" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1775" width="200" height="200" style="width: 50%;height: 100%;fill: currentColor;"><path d="M512 352c-88.008 0-160.002 72-160.002 160 0 88.008 71.994 160 160.002 160 88.01 0 159.998-71.992 159.998-160 0-88-71.988-160-159.998-160z m381.876 117.334c-19.21-177.062-162.148-320-339.21-339.198V64h-85.332v66.134c-177.062 19.198-320 162.136-339.208 339.198H64v85.334h66.124c19.208 177.062 162.144 320 339.208 339.208V960h85.332v-66.124c177.062-19.208 320-162.146 339.21-339.208H960v-85.334h-66.124zM512 810.666c-164.274 0-298.668-134.396-298.668-298.666 0-164.272 134.394-298.666 298.668-298.666 164.27 0 298.664 134.396 298.664 298.666S676.27 810.666 512 810.666z" p-id="1776"></path></svg></div>`;
        const floatNav = $(".float-nav-exp .nav-menu");
        const locateButton = $(".float-nav-exp .nav-menu .item.locate");
        const offset_top = Math.trunc(utils.getValue("offset_top"));
        const player_offset_top = Math.trunc(utils.getValue("player_offset_top"));
        $(".fixed-nav").css("bottom", "274px");
        floatNav.prepend(locateButtonHtml);
        locateButton.not(":first-child").remove();
        floatNav.on("click", ".locate", function() {
          if (playerDataScreen !== "web") {
            $("html,body").scrollTop(player_offset_top - offset_top);
          } else {
            $("html,body").scrollTop(0);
          }
        });
      }
      if (player_type === "bangumi") {
        const locateButtonHtml = `<div class="tool-item locate" title="定位至播放器">\n<svg t="1643419779790" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1775" width="200" height="200" style="width: 50%;height: 100%;fill: currentColor;"><path d="M512 352c-88.008 0-160.002 72-160.002 160 0 88.008 71.994 160 160.002 160 88.01 0 159.998-71.992 159.998-160 0-88-71.988-160-159.998-160z m381.876 117.334c-19.21-177.062-162.148-320-339.21-339.198V64h-85.332v66.134c-177.062 19.198-320 162.136-339.208 339.198H64v85.334h66.124c19.208 177.062 162.144 320 339.208 339.208V960h85.332v-66.124c177.062-19.208 320-162.146 339.21-339.208H960v-85.334h-66.124zM512 810.666c-164.274 0-298.668-134.396-298.668-298.666 0-164.272 134.394-298.666 298.668-298.666 164.27 0 298.664 134.396 298.664 298.666S676.27 810.666 512 810.666z" p-id="1776"></path></svg></div>`;
        const floatNav = $(".nav-tools");
        const locateButton = $(".nav-tools .tool-item.locate");
        const offset_top = Math.trunc(utils.getValue("offset_top"));
        const player_offset_top = Math.trunc(utils.getValue("player_offset_top"));
        floatNav.prepend(locateButtonHtml);
        locateButton.not(":first-child").remove();
        floatNav.on("click", ".locate", function() {
          if (playerDataScreen !== "web") {
            $("html,body").scrollTop(player_offset_top - offset_top);
          } else {
            $("html,body").scrollTop(0);
          }
        });
      }
    },
    // 自动定位至播放器
    autoLocation() {
      const player_type = utils.getValue("player_type");
      const selected_screen_mode = utils.getValue("selected_screen_mode");
      const click_player_auto_locate = utils.getValue("click_player_auto_locate");
      const offset_top = Math.trunc(utils.getValue("offset_top"));
      const auto_locate = utils.getValue("auto_locate");
      const auto_locate_video = utils.getValue("auto_locate_video");
      const auto_locate_bangumi = utils.getValue("auto_locate_bangumi");
      const player_offset_top = Math.trunc($('#bilibili-player').offset().top);
      utils.setValue("player_offset_top", player_offset_top);
      $("html,body").scrollTop(player_offset_top - offset_top);
      return new Promise((resolve, reject) => {
        if (((auto_locate && !auto_locate_video && !auto_locate_bangumi)) || (auto_locate && auto_locate_video && auto_locate_bangumi) || (auto_locate && auto_locate_video && player_type === 'video') || (auto_locate && auto_locate_bangumi && player_type === 'bangumi')) {
          if (selected_screen_mode !== 'web') {
            let applyAutoLocationInterval = setInterval(() => {
              const document_scroll_top = $(document).scrollTop();
              utils.logger.warn("自动定位失败，继续尝试", "\n", "-----------------", "\n", "当前文档顶部偏移量：" + document_scroll_top, "\n", "期望文档顶部偏移量：" + (player_offset_top - offset_top), "\n", "播放器顶部偏移量：" + player_offset_top, "\n", "设置偏移量：" + offset_top);
              $("html,body").scrollTop(player_offset_top - offset_top);
            }, 200)
            let checkAutoLocationStatus = setInterval(() => {
              const document_scroll_top = $(document).scrollTop();
              const success = document_scroll_top === player_offset_top - offset_top;
              if (success) {
                clearInterval(checkAutoLocationStatus);
                clearInterval(applyAutoLocationInterval);
                checkAutoLocationStatus = null
                applyAutoLocationInterval = null
                // utils.logger.info("自动定位成功");
                resolve(true)
              }
            }, 100);
          }
        }
        else resolve(false)
      })
    },
    // 点击播放器自动定位至播放器
    async clickPlayerAutoLocation() {
      const click_player_auto_locate = utils.getValue("click_player_auto_locate");
      const offset_top = Math.trunc(utils.getValue("offset_top"));
      const player_offset_top = Math.trunc(utils.getValue("player_offset_top"));
      const playerDataScreen = await this.getCurrentScreenMode()
      if (click_player_auto_locate) {
        $('#bilibili-player').on("click", function(event) {
          event.stopPropagation();
          if ($(this).attr("status") === "adjustment-mini") {
            utils.logger.info("点击迷你播放器");
          } else {
            if (playerDataScreen !== "web") {
              $("html,body").scrollTop(player_offset_top - offset_top);
            } else {
              $("html,body").scrollTop(0);
            }
          }
        });
      }
    },
    // 点击时间锚点自动返回播放器
    jumpVideoTime() {
      const selected_screen_mode = utils.getValue("selected_screen_mode");
      const offset_top = Math.trunc(utils.getValue("offset_top"));
      const player_type = utils.getValue("player_type");
      const player_offset_top = $('#bilibili-player').offset().top;
      const video = $('#bilibili-player video')[0]
      if (player_type === "video") {
        utils.setValue("player_offset_top", player_offset_top);
        $("#comment").unbind('click').on("click", ".video-time,.video-seek", function(event) {
          event.stopPropagation();
          const targetTime = $(this).attr('data-video-time');
          video.currentTime = targetTime;
          video.play();
          if (selected_screen_mode === "web") $("html,body").scrollTop(0);
          if (selected_screen_mode !== "web") $("html,body").scrollTop(player_offset_top - offset_top);
          // console.log(player_offset_top - offset_top)
        })
      }
      if (player_type === "bangumi") {
        utils.setValue("player_offset_top", player_offset_top);
        $("#comment_module").unbind('click').on("click", ".video-time,.video-seek", function(event) {
          event.stopPropagation();
          const targetTime = $(this).attr('data-time');
          video.currentTime = targetTime;
          video.play();
          if (selected_screen_mode === "web") $("html,body").scrollTop(0);
          if (selected_screen_mode !== "web") $("html,body").scrollTop(player_offset_top - offset_top);
          // console.log(player_offset_top - offset_top)
        })
      }
    },
    // 自动取消静音
    autoCancelMute() {
      globalVariables.autoCancelMuteTimes++;
      const player_type = utils.getValue("player_type");
      if (player_type === "video" && globalVariables.autoCancelMuteTimes === 1) {
        const cancelMuteButtn = $(".bpx-player-ctrl-muted-icon");
        const cancelMuteButtnDisplay = cancelMuteButtn.css("display");
        if (cancelMuteButtnDisplay === "block") {
          cancelMuteButtn.click();
          utils.logger.info("已自动取消静音");
        }
      }
      if (player_type === "bangumi" && globalVariables.autoCancelMuteTimes === 1) {
        const cancelMuteButtn = $(".squirtle-volume-wrap .squirtle-volume .squirtle-volume-icon");
        const cancelMuteButtnClass = cancelMuteButtn.attr("class");
        if (cancelMuteButtnClass.includes("squirtle-volume-mute-state")) {
          cancelMuteButtn.click();
          utils.logger.info("已自动取消静音");
        }
      }
    },
    // 自动选择最高画质
    autoSelectVideoHightestQuality() {
      globalVariables.autoSelectVideoHightestQualityTimes++;
      const player_type = utils.getValue("player_type");
      const is_vip = utils.getValue("is_vip");
      const contain_quality_4k = utils.getValue("contain_quality_4k");
      const contain_quality_8k = utils.getValue("contain_quality_8k");
      const auto_select_video_highest_quality = utils.getValue("auto_select_video_highest_quality");
      if (auto_select_video_highest_quality) {
        if (is_vip) {
          if (player_type === "video" && globalVariables.autoSelectVideoHightestQualityTimes === 1) {
            // 同时不勾选包含4K和包含8K，自动选除这两项之外最高画质
            if (!contain_quality_4k && !contain_quality_8k) {
              const qualityValue = $(".bpx-player-ctrl-quality > ul > li").filter(function() {
                return (!$(this).children("span.bpx-player-ctrl-quality-text").text().includes("4K") && !$(this).children("span.bpx-player-ctrl-quality-text").text().includes("8K"));
              });
              qualityValue.eq(0).click();
              utils.logger.info("最高画质｜VIP｜不包含4K及8K｜切换成功");
            }
            // 同时勾选包含4K和包含8K,自动选择8K
            if (contain_quality_4k && contain_quality_8k) {
              const qualityValue = $(".bpx-player-ctrl-quality > ul > li").filter(function() {
                return $(this).children("span.bpx-player-ctrl-quality-text").text().includes("8K");
              });
              qualityValue.eq(0).click();
              utils.logger.info("最高画质｜VIP｜8K｜切换成功");
            }
            // 仅勾选包含4K,选择4K
            if (contain_quality_4k && !contain_quality_8k) {
              const qualityValue = $(".bpx-player-ctrl-quality > ul > li").filter(function() {
                return $(this).children("span.bpx-player-ctrl-quality-text").text().includes("4K");
              });
              qualityValue.eq(0).click();
              utils.logger.info("最高画质｜VIP｜4K｜切换成功");
            }
            // 仅勾选包含8K,选择8K
            if (!contain_quality_4k && contain_quality_8k) {
              const qualityValue = $(".bpx-player-ctrl-quality > ul > li").filter(function() {
                return $(this).children("span.bpx-player-ctrl-quality-text").text().includes("8K");
              });
              qualityValue.eq(0).click();
              utils.logger.info("最高画质｜VIP｜8K｜切换成功");
            }
          }
          if (player_type === "bangumi" && globalVariables.autoSelectVideoHightestQualityTimes === 1) {
            if (contain_quality_4k) {
              $(".squirtle-quality-wrap >.squirtle-video-quality > ul > li").eq(0).click();
              utils.logger.info("最高画质｜VIP｜包含4K｜切换成功");
            } else {
              const qualityValue = $(".squirtle-quality-wrap > .squirtle-video-quality > ul > li").filter(function() {
                return (!$(this).children(".squirtle-quality-text-c").children(".squirtle-quality-text").text().includes("4K") && $(this).children(".squirtle-quality-text-c").children(".squirtle-quality-text").text().includes("8K"));
              });
              qualityValue.eq(0).click();
              utils.logger.info("最高画质｜VIP｜不包含4K｜切换成功");
            }
          }
        } else {
          if (player_type === "video" && globalVariables.autoSelectVideoHightestQualityTimes === 1) {
            const selectVipItemLength = $(".bpx-player-ctrl-quality > ul > li").children(".bpx-player-ctrl-quality-badge-bigvip").length;
            $(".bpx-player-ctrl-quality > ul > li").eq(selectVipItemLength).click();
            utils.logger.info("最高画质｜非VIP｜切换成功");
          }
          if (player_type === "bangumi" && globalVariables.autoSelectVideoHightestQualityTimes === 1) {
            const selectVipItemLength = $(".squirtle-quality-wrap >.squirtle-video-quality > ul > li").children(".squirtle-bigvip").length;
            $(".squirtle-quality-wrap >.squirtle-video-quality > ul > li").eq(selectVipItemLength).click();
            utils.logger.info("最高画质｜非VIP｜切换成功");
          }
        }
      } else {
        main.fixStyle();
      }
    },
    // 添加样式文件
    addPluginStyle() {
      const style = `#playerAdjustment{height:500px;overflow:auto;overscroll-behavior:contain;padding-right:10px}.swal2-popup{width:34em!important;padding:1.25em!important}.swal2-html-container{margin:0!important;padding:16px 5px 0!important;width:100%!important;box-sizing:border-box!important}.swal2-footer{flex-direction:column!important}.swal2-close{top:5px!important;right:3px!important}.swal2-actions{margin:7px auto 0!important}.swal2-styled.swal2-confirm{background-color:#23ade5!important}.swal2-icon.swal2-info.swal2-icon-show{display:none!important}.player-adjustment-container,.swal2-container{z-index:999999999!important}.player-adjustment-popup{font-size:14px!important}.player-adjustment-setting-label{display:flex!important;align-items:center!important;justify-content:space-between!important;padding-top:10px!important}.player-adjustment-setting-checkbox{width:16px!important;height:16px!important}.player-adjustment-setting-tips{width:100%!important;display:flex!important;align-items:center!important;padding:5px!important;margin-top:10px!important;background:#f5f5f5!important;box-sizing:border-box!important;font-size:14px;color:#666!important;border-radius:2px!important;text-align:left!important}.player-adjustment-setting-tips svg{margin-right:5px!important}label.player-adjustment-setting-label input{border:1px solid #cecece!important;background:#fff!important}label.player-adjustment-setting-label input[type=checkbox],label.player-adjustment-setting-label input[type=radio]{width:16px!important;height:16px!important}label.player-adjustment-setting-label input:checked{border-color:#1986b3!important;background:#23ade5!important}.auto-quality-sub-options,.auto-locate-sub-options{display:flex;align-items:center;padding-left:15px}.auto-quality-sub-options label.player-adjustment-setting-label.fourK,.auto-locate-sub-options label.player-adjustment-setting-label.video{margin-right:10px}.auto-quality-sub-options .player-adjustment-setting-label input[type="checkbox"]{margin-left:5px!important}.player-adjustment-setting-label.screen-mod input{margin-right:5px!important}`;
      if (document.head) {
        utils.addStyle("swal-pub-style", "style", GM_getResourceText("swalStyle"));
        utils.addStyle("player-adjustment-style", "style", style);
      }
      const headObserver = new MutationObserver(() => {
        utils.addStyle("swal-pub-style", "style", GM_getResourceText("swalStyle"));
        utils.addStyle("player-adjustment-style", "style", style);
      });
      headObserver.observe(document.head, {
        childList: true,
        subtree: true
      });
    },
    // 注册脚本设置控件
    registerMenuCommand() {
      GM_registerMenuCommand("设置", () => {
        const html = `
                <div id="playerAdjustment" style="font-size: 1em;">
                  <label class="player-adjustment-setting-label" style="padding-top:0!important;"> 是否为大会员
                    <input type="checkbox" id="Is-Vip" ${
                      utils.getValue("is_vip") ? "checked" : ""
                    } class="player-adjustment-setting-checkbox">
                  </label>
                  <span class="player-adjustment-setting-tips"> -> 请如实勾选，否则影响自动选择清晰度</span>
                  <label class="player-adjustment-setting-label"> 自动定位至播放器
                    <input type="checkbox" id="Auto-Locate" ${
                      utils.getValue("auto_locate")
                        ? "checked"
                        : ""
                    } class="player-adjustment-setting-checkbox">
                  </label>
                  <div class="auto-locate-sub-options">
                    <label class="player-adjustment-setting-label video"> 普通视频(video)
                      <input type="checkbox" id="Auto-Locate-Video" ${
                        utils.getValue("auto_locate_video") ? "checked" : ""
                      } class="player-adjustment-setting-checkbox">
                    </label>
                    <label class="player-adjustment-setting-label bangumi"> 其他视频(bangumi)
                      <input type="checkbox" id="Auto-Locate-Bangumi" ${
                        utils.getValue("auto_locate_bangumi") ? "checked" : ""
                      } class="player-adjustment-setting-checkbox">
                    </label>
                  </div>
                  <span class="player-adjustment-setting-tips"> -> 只有勾选自动定位至播放器，才会执行自动定位的功能；勾选自动定位至播放器后，video 和 bangumi 两者全选或全不选，默认在这两种类型视频播放页都执行；否则勾选哪种类型，就只在这种类型的播放页才执行。</span>
                  <label class="player-adjustment-setting-label" id="player-adjustment-Range-Wrapper">
                    <span>播放器顶部偏移(px)</span>
                    <input id="Top-Offset" value="${utils.getValue(
                      "offset_top"
                    )}" style="padding:5px;width: 200px;border: 1px solid #cecece;">
                  </label>
                  <span class="player-adjustment-setting-tips"> -> 播放器距离浏览器窗口默认距离为 ${Math.trunc($('#bilibili-player').offset().top)}；请填写小于 ${Math.trunc($('#bilibili-player').offset().top)} 的正整数或 0；当值为 0 时，播放器上沿将紧贴浏览器窗口上沿、值为 ${Math.trunc($('#bilibili-player').offset().top)} 时，将保持B站默认。 </span>
                  <label class="player-adjustment-setting-label"> 点击播放器时定位
                    <input type="checkbox" id="Click-Player-Auto-Location" ${
                      utils.getValue("click_player_auto_locate")
                        ? "checked"
                        : ""
                    } class="player-adjustment-setting-checkbox">
                  </label>
                  <div class="player-adjustment-setting-label screen-mod" style="display: flex;align-items: center;justify-content: space-between;"> 播放器默认模式 <div style="width: 215px;display: flex;align-items: center;justify-content: space-between;">
                      <label class="player-adjustment-setting-label" style="padding-top:0!important;">
                        <input type="radio" name="Screen-Mod" value="wide" ${
                          utils.getValue("selected_screen_mode") === "wide"
                            ? "checked"
                            : ""
                        }>宽屏 </label>
                      <label class="player-adjustment-setting-label" style="padding-top:0!important;">
                        <input type="radio" name="Screen-Mod" value="web" ${
                          utils.getValue("selected_screen_mode") === "web"
                            ? "checked"
                            : ""
                        }> 网页全屏 </label>
                    </div>
                  </div>
                  <span class="player-adjustment-setting-tips"> -> 若遇到不能自动选择播放器模式可尝试点击重置</span>
                  <label class="player-adjustment-setting-label"> 网页全屏模式解锁
                    <input type="checkbox" id="Webfull-Unlock" ${
                      utils.getValue("webfull_unlock") ? "checked" : ""
                    } class="player-adjustment-setting-checkbox">
                  </label>
                  <span class="player-adjustment-setting-tips"> ->*实验性功能(不稳，可能会有这样或那样的问题)：勾选后网页全屏模式下可以滑动滚动条查看下方评论等内容，2秒延迟后解锁（番剧播放页不支持）<br>->新增迷你播放器显示，不过比较简陋，只支持暂停/播放操作，有条件的建议还是直接使用浏览器自带的小窗播放功能。</span>
                  <label class="player-adjustment-setting-label"> 自动选择最高画质
                    <input type="checkbox" id="Auto-Quality" ${
                      utils.getValue("auto_select_video_highest_quality")
                        ? "checked"
                        : ""
                    } class="player-adjustment-setting-checkbox">
                  </label>
                  <div class="auto-quality-sub-options">
                    <label class="player-adjustment-setting-label fourK"> 是否包含4K画质
                      <input type="checkbox" id="Quality-4K" ${
                        utils.getValue("contain_quality_4k") ? "checked" : ""
                      } class="player-adjustment-setting-checkbox">
                    </label>
                    <label class="player-adjustment-setting-label eightK"> 是否包含8K画质
                      <input type="checkbox" id="Quality-8K" ${
                        utils.getValue("contain_quality_8k") ? "checked" : ""
                      } class="player-adjustment-setting-checkbox">
                    </label>
                  </div>
                  <span class="player-adjustment-setting-tips"> -> 网络条件好时可以启用此项，勾哪项选哪项，都勾选8k，否则选择4k及8k外最高画质。</span>
                </div>
                `;
        Swal.fire({
          title: "播放页调整设置",
          html: html,
          icon: "info",
          showCloseButton: true,
          showDenyButton: true,
          confirmButtonText: "保存",
          denyButtonText: "重置",
          footer: '<div style="text-align: center;">如果发现脚本不能用，可能是播放页更新了，请耐心等待适配。</div><hr style="border: none;height: 1px;margin: 12px 0;background: #eaeaea;"><div style="text-align: center;font-size: 1.25em;"><a href="//userstyles.world/style/241/nightmode-for-bilibili-com" target="_blank">夜间哔哩 - </a><a href="//greasyfork.org/zh-CN/scripts/415804-bilibili%E6%92%AD%E6%94%BE%E9%A1%B5%E8%B0%83%E6%95%B4-%E8%87%AA%E7%94%A8" target="_blank">检查更新</a></div>'
        }).then((res) => {
          res.isConfirmed && location.reload(true);
          if (res.isConfirmed) {
            location.reload(true);
          } else if (res.isDenied) {
            utils.setValue("current_screen_mode", "normal");
            location.reload(true);
          }
        });
        $("#Is-Vip").change((e) => {
          utils.setValue("is_vip", e.target.checked);
          if (e.target.checked === true) {
            $(".fourK,.eightK").css("display", "flex!important");
          } else {
            $(".fourK,.eightK").css("display", "none!important");
          }
        });
        $("#Auto-Locate").change((e) => {
          utils.setValue("auto_locate", e.target.checked);
        });
        $("#Auto-Locate-Video").change((e) => {
          utils.setValue("auto_locate_video", e.target.checked);
        });
        $("#Auto-Locate-Bangumi").change((e) => {
          utils.setValue("auto_locate_bangumi", e.target.checked);
        });
        $("#Top-Offset").change((e) => {
          utils.setValue("offset_top", e.target.value * 1);
        });
        $("#Click-Player-Auto-Location").change((e) => {
          utils.setValue("click_player_auto_locate", e.target.checked);
        });
        $("#Auto-Quality").change((e) => {
          utils.setValue("auto_select_video_highest_quality", e.target.checked);
        });
        $("#Quality-4K").change((e) => {
          utils.setValue("contain_quality_4k", e.target.checked);
        });
        $("#Quality-8K").change((e) => {
          utils.setValue("contain_quality_8k", e.target.checked);
        });
        $('input[name="Screen-Mod"]').click(function() {
          utils.setValue("selected_screen_mode", $(this).val());
        });
        $("#Webfull-Unlock").change((e) => {
          utils.setValue("webfull_unlock", e.target.checked);
        });
      });
    },
    checkVideoPageLoaded() {
      return new Promise((resolve, reject) => {
        let counts = 10
        let checkVideoPageLoadedInterval = setInterval(() => {
          const commentExist = $('#comment > .comment').innerHTML !== ''
          if (commentExist) {
            clearInterval(checkVideoPageLoadedInterval)
            checkVideoPageLoadedInterval = null
            resolve(true)
          } else if (counts <= 0) {
            clearInterval(checkVideoPageLoadedInterval)
            checkVideoPageLoadedInterval = null
            resolve(false)
          }
          counts--
        }, 100)
      })
    },
    freezeHeaderAndVideoTitleStyles() {
      $('#biliMainHeader').attr("style", "height:64px!important");
      $('#viewbox_report').attr("style", "height:106px!important");
      $('#v_upinfo').attr("style", "height:80px!important");
      $('.members-info-v1').attr("style", "padding-top:0!important");
      $('.members-info-v1 .wide-members-header').attr("style", "height:0!important");
      $('.members-info-v1 .wide-members-container .up-card .info-tag').attr("style", "display:none!important");
    },
    // 判断当前窗口是否在最上方
    isTopWindow() {
      return window.self === window.top;
    },
    // 前期准备函数
    thePrepFunction() {
      globalVariables.thePrepFunctionRunningTimes++
      if (globalVariables.thePrepFunctionRunningTimes === 1) {
        utils.isLogin()
        utils.checkBrowserHistory()
        utils.historyListener();
        this.initValue();
        this.addPluginStyle();
        this.isTopWindow() && this.registerMenuCommand();
        this.getCurrentPlayerType();
        this.getCurrentScreenMode();
        this.jumpVideoTime();
      }
    },
    // 主函数
    async theMainFunction() {
      globalVariables.theMainFunctionRunningTimes++
      if (globalVariables.theMainFunctionRunningTimes === 1) {
        const videoPlayerExists = await this.checkVideoPlayerExists()
        if (videoPlayerExists) {
          utils.logger.info(`播放器｜存在`)
          $("body").css("overflow", "hidden");
          const isPlayable = await this.checkVideoCanPlayThrough();
          if (isPlayable) {
            utils.logger.info(`视频资源｜可以播放`)
            // console.time('播放页调整：切换模式耗时')
            this.watchScreenModeChange();
            const selectedScreenMode = await this.autoSelectScreenMode()
            // console.timeEnd('播放页调整：切换模式耗时')
            if (selectedScreenMode.flag) {
              utils.logger.info(`屏幕模式｜${selectedScreenMode.mode}｜切换成功`)
              this.autoCancelMute();
              this.autoSelectVideoHightestQuality();
              this.insertBackToPlayerButton();
              this.clickPlayerAutoLocation();
              const webfull_unlock = utils.getValue('webfull_unlock')
              if (webfull_unlock && selectedScreenMode.mode === 'web') {
                this.fixedWebfullUnlockStyle();
              }
              // console.time('播放页调整：自动定位耗时')
              this.freezeHeaderAndVideoTitleStyles();
              const auto_locate = utils.getValue('auto_locate');
              const auto_locate_video = utils.getValue('auto_locate_video');
              const auto_locate_bangumi = utils.getValue('auto_locate_bangumi');
              const autoLocationDone = await this.autoLocation()
              // console.timeEnd('播放页调整：自动定位耗时')
              if (auto_locate && autoLocationDone) {
                $("body").css("overflow", "unset");
                utils.logger.info(`自动定位｜成功`)
              }
              if (!auto_locate || (auto_locate && auto_locate_video && !auto_locate_bangumi) || (auto_locate && auto_locate_bangumi && !auto_locate_video)) {
                $("body").css("overflow", "unset");
                utils.logger.info(`自动定位｜未开启`)
              }
              const loaded = await this.checkVideoPageLoaded()
              setTimeout(() => {
                if (loaded) {
                  utils.logger.info(`页面加载｜完毕`)
                } else {
                  location.reload()
                }
              }, 2000)
            }
            else utils.logger.error(`屏幕模式｜${selectedScreenMode.mode}｜切换失败`)
          }
          else utils.logger.error(`视频资源｜加载失败`)
        }
        else utils.logger.error(`播放器｜不存在`)
      }
    }
  }
  if (utils.isLogin()) {
    methods.thePrepFunction();
    methods.theMainFunction();
  }
  else utils.logger.warn("请登录｜本脚本只能在登录状态下使用")
})
