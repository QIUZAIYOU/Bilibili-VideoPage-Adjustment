// ==UserScript==
// @name              哔哩哔哩（bilibili.com）播放页调整
// @license           GPL-3.0 License
// @namespace         https://greasyfork.org/zh-CN/scripts/415804-bilibili%E6%92%AD%E6%94%BE%E9%A1%B5%E8%B0%83%E6%95%B4-%E8%87%AA%E7%94%A8
// @version           0.10.9
// @description       1.自动定位到播放器（进入播放页，可自动定位到播放器，可设置偏移量及是否在点击主播放器时定位）；2.可设置是否自动选择最高画质；3.可设置播放器默认模式；
// @author            QIAN
// @match             *://*.bilibili.com/video/*
// @match             *://*.bilibili.com/bangumi/play/*
// @match             *://*.bilibili.com/list/watchlater*
// @require           https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js
// @require           https://cdn.jsdelivr.net/npm/sweetalert2@11.3.6/dist/sweetalert2.all.min.js
// @resource          swalStyle https://cdn.jsdelivr.net/npm/sweetalert2@11.3.6/dist/sweetalert2.min.css
// @grant             GM_setValue
// @grant             GM_getValue
// @grant             GM_registerMenuCommand
// @grant             GM_getResourceText
// @grant             GM.info
// @supportURL        https://github.com/QIUZAIYOU/Bilibili-VideoPage-Adjustment
// @homepageURL       https://github.com/QIUZAIYOU/Bilibili-VideoPage-Adjustment
// @icon              https://www.bilibili.com/favicon.ico?v=1
// ==/UserScript==
$(function () {
  console.time("播放页调整：总用时");
  let globalCounts = {
    autoSelectScreenModCounts: 0,
    autoSelectVideoHightestQualityCounts: 0,
    insertLocateButtonCounts: 0,
    insertGoToCommentsButtonCounts: 0,
    webfullUnlockCounts: 0,
    autoCancelMuteCounts: 0
  };
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
    waitElement(selector, times, interval, flag = true) {
      var _times = times || -1;
      var _interval = interval || 500;
      var _selector = selector;
      var _iIntervalID;
      var _flag = flag;
      return new Promise(function (resolve, reject) {
        _iIntervalID = setInterval(() => {
          if (!_times) {
            clearInterval(_iIntervalID);
            reject();
          }
          _times <= 0 || _times--;
          var _self = $(_selector);
          if ((_flag && _self.length) || (!_flag && !_self.length)) {
            clearInterval(_iIntervalID);
            resolve(_iIntervalID);
          }
        }, _interval);
      });
    },
    waitSameValue(selector, attr, value, times, interval, flag = true) {
      var _times = times || -1;
      var _interval = interval || 500;
      var _selector = selector;
      var _iIntervalID;
      var _flag = flag;
      return new Promise(function (resolve, reject) {
        _iIntervalID = setInterval(() => {
          if (!_times) {
            clearInterval(_iIntervalID);
            reject();
          }
          _times <= 0 || _times--;
          var _self = $(_selector).attr(attr);
          if ((_flag && _self === value) || (!_flag && _self !== value)) {
            clearInterval(_iIntervalID);
            resolve(_iIntervalID);
          }
        }, _interval);
      });
    },
    getClientHeight() {
      var clientHeight = 0;
      if (document.body.clientHeight && document.documentElement.clientHeight) {
        var clientHeight =
          document.body.clientHeight < document.documentElement.clientHeight
            ? document.body.clientHeight
            : document.documentElement.clientHeight;
      } else {
        var clientHeight =
          document.body.clientHeight > document.documentElement.clientHeight
            ? document.body.clientHeight
            : document.documentElement.clientHeight;
      }
      return clientHeight;
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
      var addHistoryMethod = (function () {
        var historyDep = new Dep();
        return function (name) {
          if (name === "historychange") {
            return function (name, fn) {
              var event = new Watch(name, fn);
              Dep.watch = event;
              historyDep.defined();
              Dep.watch = null;
            };
          } else if (name === "pushState" || name === "replaceState") {
            var method = history[name];
            return function () {
              method.apply(history, arguments);
              historyDep.notify();
            };
          }
        };
      })();
      window.addHistoryListener = addHistoryMethod("historychange");
      history.pushState = addHistoryMethod("pushState");
      history.replaceState = addHistoryMethod("replaceState");
      window.addHistoryListener("history", function () {
        main.autoLocation();
      });
    },
    documentHidden() {
      var hidden = "hidden";
      if (hidden in document)
        document.addEventListener("visibilitychange", onchange);
      else if ((hidden = "mozHidden") in document)
        document.addEventListener("mozvisibilitychange", onchange);
      else if ((hidden = "webkitHidden") in document)
        document.addEventListener("webkitvisibilitychange", onchange);
      else if ((hidden = "msHidden") in document)
        document.addEventListener("msvisibilitychange", onchange);
      else if ("onfocusin" in document)
        document.onfocusin = document.onfocusout = onchange;
      else
        window.onpageshow =
          window.onpagehide =
          window.onfocus =
          window.onblur =
            onchange;
      function onchange(evt) {
        var v = "visible";
        var h = "hidden";
        var evtMap = {
          focus: v,
          focusin: v,
          pageshow: v,
          blur: h,
          focusout: h,
          pagehide: h
        };
        evt = evt || window.event;
        if (evt.type in evtMap) {
          return evtMap[evt.type] === "hidden";
        } else {
          return this[hidden];
        }
      }
      if (document[hidden] !== undefined) return document[hidden];
    }
  };
  const main = {
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
          name: "current_screen_mod",
          value: "normal"
        },
        {
          name: "selected_screen_mod",
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
        }
      ];
      value.forEach((v) => {
        if (utils.getValue(v.name) === undefined) {
          utils.setValue(v.name, v.value);
        }
      });
    },
    getCurrentPlayerTypeAndScreenMod() {
      utils.setValue("current_screen_mod", "normal");
      const currentUrl = window.location.href;
      if (
        currentUrl.includes("www.bilibili.com/video") ||
        currentUrl.includes("www.bilibili.com/list/watchlater")
      ) {
        utils.setValue("player_type", "video");
      }
      if (currentUrl.includes("www.bilibili.com/bangumi/play")) {
        utils.setValue("player_type", "bangumi");
      }
      const playerSelecter = ".bpx-player-container";
      utils
        .waitElement(playerSelecter, 10, 100)
        .then(() => {
          const playerDataScreen =
            $(".bpx-player-container").attr("data-screen") || null;
          const screenModObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
              if ([null, "null", "normal"].includes(playerDataScreen)) {
                utils.setValue("current_screen_mod", "normal");
              }
              if (playerDataScreen === "wide") {
                utils.setValue("current_screen_mod", "wide");
              }
              if (playerDataScreen === "web") {
                utils.setValue("current_screen_mod", "web");
              }
            });
          });
          screenModObserver.observe($(playerSelecter)[0], {
            attributes: true
          });
        })
        .catch(() => {
          console.log("播放页调整：未找到播放器");
        });
    },
    showInformation() {
      console.group(GM.info.script.name);
      console.log(
        " author：" + GM.info.script.author,
        "\n",
        "player_type: " + utils.getValue("player_type"),
        "\n",
        "offset_top: " + utils.getValue("offset_top"),
        "\n",
        "player_offset_top: " + utils.getValue("player_offset_top"),
        "\n",
        "is_vip: " + utils.getValue("is_vip"),
        "\n",
        "click_player_auto_locate: " +
          utils.getValue("click_player_auto_locate"),
        "\n",
        "current_screen_mod: " + utils.getValue("current_screen_mod"),
        "\n",
        "selected_screen_mod: " + utils.getValue("selected_screen_mod"),
        "\n",
        "auto_select_video_highest_quality: " +
          utils.getValue("auto_select_video_highest_quality"),
        "\n",
        "webfull_unlock: " + utils.getValue("webfull_unlock")
      );
      console.groupEnd(GM.info.script.name);
    },
    autoSelectScreenMod() {
      globalCounts.autoSelectScreenModCounts++;
      const playerSelecter = ".bpx-player-container";
      const player_type = utils.getValue("player_type");
      const selected_screen_mod = utils.getValue("selected_screen_mod");
      const current_screen_mod = utils.getValue("current_screen_mod");
      const checkDocumentHidden = setInterval(async () => {
        if (
          (await !utils.documentHidden()) &&
          globalCounts.autoSelectScreenModCounts === 1
        ) {
          clearInterval(checkDocumentHidden);
          utils
            .waitElement(playerSelecter, 10, 100)
            .then(() => {
              const startTime = new Date().getTime();
              console.log("播放页调整：播放器已找到，开始监控");
              const screenModObserver = new MutationObserver(function (
                mutations
              ) {
                mutations.forEach(async function (mutation) {
                  let playerDataScreen =
                    $(playerSelecter).attr("data-screen") || null;
                  if (player_type === "video") {
                    if (
                      selected_screen_mod === "normal" &&
                      current_screen_mod === "normal" &&
                      playerDataScreen === "normal"
                    ) {
                      screenModObserver.disconnect();
                      console.log("播放页调整：小屏切换成功，停止监控");
                      utils.setValue("current_screen_mod", "normal");
                      main.autoLocation();
                      main.fixStyle();
                      main.insertLocateButton();
                    }
                    if (
                      selected_screen_mod === "normal" &&
                      current_screen_mod !== "normal" &&
                      playerDataScreen === "wide"
                    ) {
                      screenModObserver.disconnect();
                      console.log("播放页调整：小屏切换成功，停止监控");
                      $(".bpx-player-ctrl-wide-leave").click();
                      utils.setValue("current_screen_mod", "normal");
                      main.autoLocation();
                      main.fixStyle();
                      main.insertLocateButton();
                    }
                    if (
                      selected_screen_mod === "normal" &&
                      current_screen_mod !== "normal" &&
                      playerDataScreen === "web"
                    ) {
                      screenModObserver.disconnect();
                      console.log("播放页调整：小屏切换成功，停止监控");
                      $(".bpx-player-ctrl-web-leave").click();
                      utils.setValue("current_screen_mod", "normal");
                      main.autoLocation();
                      main.fixStyle();
                      main.insertLocateButton();
                    }
                    if (
                      selected_screen_mod === "wide" &&
                      current_screen_mod !== "wide" &&
                      playerDataScreen !== "wide"
                    ) {
                      $(".bpx-player-ctrl-wide-enter").click();
                      utils
                        .waitSameValue(
                          playerSelecter,
                          "data-screen",
                          "wide",
                          100,
                          10
                        )
                        .then(async () => {
                          playerDataScreen =
                            $(playerSelecter).attr("data-screen");
                          if (selected_screen_mod === playerDataScreen) {
                            console.log("播放页调整：宽屏切换成功，停止监控");
                            utils.setValue("current_screen_mod", "wide");
                            screenModObserver.disconnect();
                            main.autoSelectVideoHightestQuality();
                            main.autoCancelMute();
                            await utils.sleep(1e3);
                            main.autoLocation();
                            main.fixStyle();
                            main.insertLocateButton();
                          }
                        })
                        .catch(async () => {
                          console.log("播放页调整：宽屏切换失败，尝试重试");
                          $(".bpx-player-ctrl-wide-enter").click();
                          playerDataScreen =
                            $(playerSelecter).attr("data-screen");
                          if (selected_screen_mod === playerDataScreen) {
                            console.log("播放页调整：宽屏切换成功，停止监控");
                            utils.setValue("current_screen_mod", "wide");
                            screenModObserver.disconnect();
                            main.autoSelectVideoHightestQuality();
                            main.autoCancelMute();
                            await utils.sleep(1e3);
                            main.autoLocation();
                            main.fixStyle();
                            main.insertLocateButton();
                          } else {
                            $(".bpx-player-ctrl-wide-enter").click();
                          }
                        });
                    }
                    if (
                      selected_screen_mod === "web" &&
                      current_screen_mod !== "web" &&
                      playerDataScreen !== "web"
                    ) {
                      $(".bpx-player-ctrl-web-enter").click();
                      utils
                        .waitSameValue(
                          playerSelecter,
                          "data-screen",
                          "web",
                          100,
                          10
                        )
                        .then(async () => {
                          playerDataScreen =
                            $(playerSelecter).attr("data-screen");
                          if (selected_screen_mod === playerDataScreen) {
                            console.log(
                              "播放页调整：网页全屏切换成功，停止监控"
                            );
                            utils.setValue("current_screen_mod", "web");
                            screenModObserver.disconnect();
                            main.autoSelectVideoHightestQuality();
                            main.autoCancelMute();
                            main.insertLocateButton();
                            $(".float-nav-exp .mini").css("display", "none");
                            await utils.sleep(2e3);
                            main.fixedWebfullUnlockStyle();
                            // 进入宽屏
                            $(
                              ".bpx-player-ctrl-btn-icon.bpx-player-ctrl-wide-enter"
                            ).click(function () {
                              $("body").css({
                                "padding-top": 0,
                                position: "auto"
                              });
                              $("#playerWrap").css("display", "block");
                              $("#bilibili-player").css({
                                width: "",
                                height: "",
                                position: "unset"
                              });
                              $("#playerWrap").append(
                                $("#bilibili-player.mode-webscreen")
                              );
                              utils.setValue("selected_screen_mod", "wide");
                              main.autoLocation();
                              utils.setValue("selected_screen_mod", "web");
                              $(".float-nav-exp .mini").css("display", "");
                            });
                            // 退出宽屏
                            $(
                              ".bpx-player-ctrl-btn-icon.bpx-player-ctrl-wide-enter"
                            ).click(function () {
                              $(".float-nav-exp .mini").css("display", "");
                            });
                            // 进入或离开全屏
                            $(
                              ".bpx-player-ctrl-full .bpx-player-ctrl-btn-icon"
                            ).click(function () {
                              const playerFullStatusText = $(
                                ".bpx-player-tooltip-title"
                              ).text();
                              if (playerFullStatusText.includes("进入全屏")) {
                                console.log("播放页调整：进入全屏");
                                utils.setValue("current_screen_mod", "full");
                              }
                              if (playerFullStatusText.includes("退出全屏")) {
                                console.log("播放页调整：退出全屏");
                                $("body").css({
                                  "padding-top": 0,
                                  position: "auto"
                                });
                                $("#playerWrap").css("display", "block");
                                $("#bilibili-player").css({
                                  height: "",
                                  position: "unset"
                                });
                                $("#playerWrap").append(
                                  $("#bilibili-player.mode-webscreen")
                                );
                                utils.setValue("selected_screen_mod", "wide");
                                main.autoLocation();
                                utils.setValue("selected_screen_mod", "web");
                                $(".float-nav-exp .mini").css("display", "");
                              }
                            });
                            // 劫持原全屏快捷键(f)
                            $(document).keypress(function (event) {
                              if (event.keyCode === 102) {
                                const playerFullStatusText = $(
                                  ".bpx-player-tooltip-title"
                                ).text();
                                if (playerFullStatusText.includes("进入全屏")) {
                                  console.log("播放页调整：进入全屏");
                                  utils.setValue("current_screen_mod", "full");
                                }
                                if (playerFullStatusText.includes("退出全屏")) {
                                  console.log("播放页调整：退出全屏");
                                  $("body").css({
                                    "padding-top": 0,
                                    position: "auto"
                                  });
                                  $("#playerWrap").css("display", "block");
                                  $("#bilibili-player").css({
                                    height: "",
                                    position: "unset"
                                  });
                                  $("#playerWrap").append(
                                    $("#bilibili-player.mode-webscreen")
                                  );
                                  utils.setValue("selected_screen_mod", "wide");
                                  main.autoLocation();
                                  utils.setValue("selected_screen_mod", "web");
                                  $(".float-nav-exp .mini").css("display", "");
                                }
                              }
                            });

                            // $('#webMiniPlayer').remove()
                            // $('body').after(`<div id="webMiniPlayer" style="width:360px;height: 203px;position:fixed;right:60px;bottom:120px;z-index:999999"></div>`)
                            // const a = $('#bilibili-player > div[data-injector="nano"]').clone()
                            // $('#webMiniPlayer').html(a)

                            $(document).scroll(function () {
                              const selected_screen_mod = utils.getValue(
                                "selected_screen_mod"
                              );
                              const current_screen_mod =
                                $("#bilibili-player").attr("class");
                              // console.log(`播放页调整：${selected_screen_mod},${current_screen_mod}`)
                              if (
                                selected_screen_mod === "web" &&
                                current_screen_mod === "mode-webscreen"
                              ) {
                                const playerHeight =
                                  $("#bilibili-player").height();
                                const biliMainHeaderOffsetTop =
                                  $("#biliMainHeader").offset().top;
                                const documentScrollTop = $(this).scrollTop();
                                if (documentScrollTop > playerHeight) {
                                  $("#bilibili-player").attr(
                                    "status",
                                    "adjustment-mini"
                                  );
                                  $("#bilibili-player").css({
                                    width: "400px",
                                    height: "243px",
                                    top: "unset",
                                    bottom: "70px",
                                    left: "unset",
                                    right: "60px",
                                    position: "fixed"
                                  });
                                }
                                if (
                                  documentScrollTop < biliMainHeaderOffsetTop
                                ) {
                                  $("#bilibili-player").attr(
                                    "status",
                                    "normal"
                                  );
                                  $("#bilibili-player").css({
                                    height: "auto",
                                    width: "auto",
                                    bottom: "0",
                                    right: "0",
                                    top: "0",
                                    left: "0",
                                    position: "absolute",
                                    "z-index": 10000
                                  });
                                }
                              }
                            });
                          }
                        })
                        .catch(() => {
                          console.log("播放页调整：网页全屏切换失败，尝试重试");
                          $(".bpx-player-ctrl-web-enter").click();
                          playerDataScreen =
                            $(playerSelecter).attr("data-screen");
                          if (selected_screen_mod === playerDataScreen) {
                            console.log(
                              "播放页调整：网页全屏切换成功，停止监控"
                            );
                            utils.setValue("current_screen_mod", "web");
                            screenModObserver.disconnect();
                            main.autoSelectVideoHightestQuality();
                            main.autoCancelMute();
                            main.insertLocateButton();
                          } else {
                            $(".bpx-player-ctrl-web-enter").click();
                          }
                        });
                    }
                  }
                  if (player_type === "bangumi") {
                    if (
                      selected_screen_mod === "normal" &&
                      current_screen_mod === "normal" &&
                      playerDataScreen === "normal"
                    ) {
                      screenModObserver.disconnect();
                      console.log("播放页调整：小屏切换成功，停止监控");
                      utils.setValue("current_screen_mod", "normal");
                      main.autoLocation();
                      main.fixStyle();
                      main.insertLocateButton();
                    }
                    if (
                      selected_screen_mod === "normal" &&
                      current_screen_mod !== "normal" &&
                      playerDataScreen === "wide"
                    ) {
                      screenModObserver.disconnect();
                      console.log("播放页调整：小屏切换成功，停止监控");
                      $(".squirtle-wide-active").click();
                      utils.setValue("current_screen_mod", "normal");
                      main.autoLocation();
                      main.fixStyle();
                      main.insertLocateButton();
                    }
                    if (
                      selected_screen_mod === "normal" &&
                      current_screen_mod !== "normal" &&
                      playerDataScreen === "web"
                    ) {
                      screenModObserver.disconnect();
                      console.log("播放页调整：小屏切换成功，停止监控");
                      $(".squirtle-pagefullscreen-active").click();
                      utils.setValue("current_screen_mod", "normal");
                      main.autoLocation();
                      main.fixStyle();
                      main.insertLocateButton();
                    }
                    if (
                      selected_screen_mod === "wide" &&
                      current_screen_mod !== "wide" &&
                      playerDataScreen !== "wide"
                    ) {
                      $(".squirtle-widescreen-inactive").click();
                      utils
                        .waitSameValue(
                          playerSelecter,
                          "data-screen",
                          "wide",
                          100,
                          10
                        )
                        .then(async () => {
                          playerDataScreen =
                            $(playerSelecter).attr("data-screen");
                          if (selected_screen_mod === playerDataScreen) {
                            console.log("播放页调整：宽屏切换成功，停止监控");
                            utils.setValue("current_screen_mod", "wide");
                            screenModObserver.disconnect();
                            main.autoSelectVideoHightestQuality();
                            main.autoCancelMute();
                            await utils.sleep(1e3);
                            main.autoLocation();
                            main.fixStyle();
                            main.insertLocateButton();
                          }
                        })
                        .catch(async () => {
                          console.log("播放页调整：宽屏切换失败，尝试重试");
                          $(".squirtle-widescreen-inactive").click();
                          playerDataScreen =
                            $(playerSelecter).attr("data-screen");
                          if (selected_screen_mod === playerDataScreen) {
                            console.log("播放页调整：宽屏切换成功，停止监控");
                            utils.setValue("current_screen_mod", "wide");
                            screenModObserver.disconnect();
                            main.autoSelectVideoHightestQuality();
                            main.autoCancelMute();
                            await utils.sleep(1e3);
                            main.autoLocation();
                            main.fixStyle();
                            main.insertLocateButton();
                          } else {
                            $(".squirtle-widescreen-inactive").click();
                          }
                        });
                    }
                    if (
                      selected_screen_mod === "web" &&
                      current_screen_mod !== "web" &&
                      playerDataScreen !== "web"
                    ) {
                      $(".squirtle-pagefullscreen-inactive").click();
                      utils
                        .waitSameValue(
                          playerSelecter,
                          "data-screen",
                          "web",
                          100,
                          10
                        )
                        .then(async () => {
                          playerDataScreen =
                            $(playerSelecter).attr("data-screen");
                          if (selected_screen_mod === playerDataScreen) {
                            console.log(
                              "播放页调整：网页全屏切换成功，停止监控"
                            );
                            utils.setValue("current_screen_mod", "web");
                            screenModObserver.disconnect();
                            main.autoSelectVideoHightestQuality();
                            main.autoCancelMute();
                            main.insertLocateButton();
                          }
                        })
                        .catch(() => {
                          console.log("播放页调整：网页全屏切换失败，尝试重试");
                          $(".squirtle-pagefullscreen-inactive").click();
                          playerDataScreen =
                            $(playerSelecter).attr("data-screen");
                          if (selected_screen_mod === playerDataScreen) {
                            console.log(
                              "播放页调整：网页全屏切换成功，停止监控"
                            );
                            utils.setValue("current_screen_mod", "web");
                            screenModObserver.disconnect();
                            main.autoSelectVideoHightestQuality();
                            main.autoCancelMute();
                            main.insertLocateButton();
                          } else {
                            $(".squirtle-pagefullscreen-inactive").click();
                          }
                        });
                    }
                  }
                });
              });
              screenModObserver.observe($(playerSelecter)[0], {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ["data-screen"]
              });
              $(playerSelecter).attr("data-screen", "normal");
            })
            .catch(() => {
              console.log("播放页调整：播放器模式切换失败");
            });
        } else {
          console.log("播放页调整：当前标签未激活，正在重试");
        }
      }, 100);
    },
    autoSelectVideoHightestQuality() {
      globalCounts.autoSelectVideoHightestQualityCounts++;
      const videoPlayerSelecter = ".bpx-player-ctrl-quality";
      const bangumiPlayerSelecter = ".squirtle-quality-wrap";
      const player_type = utils.getValue("player_type");
      const is_vip = utils.getValue("is_vip");
      const contain_quality_4k = utils.getValue("contain_quality_4k");
      const contain_quality_8k = utils.getValue("contain_quality_8k");
      const auto_select_video_highest_quality = utils.getValue(
        "auto_select_video_highest_quality"
      );
      if (auto_select_video_highest_quality) {
        if (is_vip) {
          if (
            player_type === "video" &&
            globalCounts.autoSelectVideoHightestQualityCounts === 1
          ) {
            utils
              .waitElement(videoPlayerSelecter, 10, 100)
              .then(() => {
                // 同时不勾选包含4K和包含8K，自动选除这两项之外最高画质
                if (!contain_quality_4k && !contain_quality_8k) {
                  const qualityValue = $(
                    ".bpx-player-ctrl-quality > ul > li"
                  ).filter(function () {
                    return (
                      !$(this)
                        .children("span.bpx-player-ctrl-quality-text")
                        .text()
                        .includes("4K") &&
                      !$(this)
                        .children("span.bpx-player-ctrl-quality-text")
                        .text()
                        .includes("8K")
                    );
                  });
                  qualityValue.eq(0).click();
                  console.log(
                    "播放页调整：VIP最高画质（不包含4K及8K）切换成功"
                  );
                  main.fixStyle();
                }
                // 同时勾选包含4K和包含8K,自动选择8K
                if (contain_quality_4k && contain_quality_8k) {
                  const qualityValue = $(
                    ".bpx-player-ctrl-quality > ul > li"
                  ).filter(function () {
                    return $(this)
                      .children("span.bpx-player-ctrl-quality-text")
                      .text()
                      .includes("8K");
                  });
                  qualityValue.eq(0).click();
                  console.log("播放页调整：VIP最高画质（8K）切换成功");
                  main.fixStyle();
                }
                // 仅勾选包含4K,选择4K
                if (contain_quality_4k && !contain_quality_8k) {
                  const qualityValue = $(
                    ".bpx-player-ctrl-quality > ul > li"
                  ).filter(function () {
                    return $(this)
                      .children("span.bpx-player-ctrl-quality-text")
                      .text()
                      .includes("4K");
                  });
                  qualityValue.eq(0).click();
                  console.log("播放页调整：VIP最高画质（4K）切换成功");
                  main.fixStyle();
                }
                // 仅勾选包含8K,选择8K
                if (!contain_quality_4k && contain_quality_8k) {
                  const qualityValue = $(
                    ".bpx-player-ctrl-quality > ul > li"
                  ).filter(function () {
                    return $(this)
                      .children("span.bpx-player-ctrl-quality-text")
                      .text()
                      .includes("8K");
                  });
                  qualityValue.eq(0).click();
                  console.log("播放页调整：VIP最高画质（8K）切换成功");
                  main.fixStyle();
                }
              })
              .catch(() => {
                console.log("播放页调整：VIP最高画质切换失败");
              });
          }
          if (
            player_type === "bangumi" &&
            globalCounts.autoSelectVideoHightestQualityCounts === 1
          ) {
            utils
              .waitElement(bangumiPlayerSelecter, 10, 100)
              .then(() => {
                if (contain_quality_4k) {
                  $(".squirtle-quality-wrap >.squirtle-video-quality > ul > li")
                    .eq(0)
                    .click();
                  console.log("播放页调整：VIP最高画质（包含4K）切换成功");
                  main.fixStyle();
                } else {
                  const qualityValue = $(
                    ".squirtle-quality-wrap > .squirtle-video-quality > ul > li"
                  ).filter(function () {
                    return (
                      !$(this)
                        .children(".squirtle-quality-text-c")
                        .children(".squirtle-quality-text")
                        .text()
                        .includes("4K") &&
                      $(this)
                        .children(".squirtle-quality-text-c")
                        .children(".squirtle-quality-text")
                        .text()
                        .includes("8K")
                    );
                  });
                  qualityValue.eq(0).click();
                  console.log("播放页调整：VIP最高画质（不包含4K）切换成功");
                  main.fixStyle();
                }
              })
              .catch(() => {
                console.log("播放页调整：VIP最高画质切换失败");
              });
          }
        } else {
          if (
            player_type === "video" &&
            globalCounts.autoSelectVideoHightestQualityCounts === 1
          ) {
            utils
              .waitElement(videoPlayerSelecter, 10, 100)
              .then(() => {
                const selectVipItemLength = $(
                  ".bpx-player-ctrl-quality > ul > li"
                ).children(".bpx-player-ctrl-quality-badge-bigvip").length;
                $(".bpx-player-ctrl-quality > ul > li")
                  .eq(selectVipItemLength)
                  .click();
                console.log("播放页调整：非VIP最高画质切换成功");
                main.fixStyle();
              })
              .catch(() => {
                console.log("播放页调整：非VIP最高画质切换失败");
              });
          }
          if (
            player_type === "bangumi" &&
            globalCounts.autoSelectVideoHightestQualityCounts === 1
          ) {
            utils
              .waitElement(bangumiPlayerSelecter, 10, 100)
              .then(() => {
                const selectVipItemLength = $(
                  ".squirtle-quality-wrap >.squirtle-video-quality > ul > li"
                ).children(".squirtle-bigvip").length;
                $(".squirtle-quality-wrap >.squirtle-video-quality > ul > li")
                  .eq(selectVipItemLength)
                  .click();
                console.log("播放页调整：非VIP最高画质切换成功");
                main.fixStyle();
              })
              .catch(() => {
                console.log("播放页调整：非VIP最高画质切换失败");
              });
          }
        }
      } else {
        main.fixStyle();
      }
    },
    autoCancelMute() {
      globalCounts.autoCancelMuteCounts++;
      const player_type = utils.getValue("player_type");
      if (player_type === "video" && globalCounts.autoCancelMuteCounts === 1) {
        const cancelMuteButtn = $(".bpx-player-ctrl-muted-icon");
        const cancelMuteButtnDisplay = cancelMuteButtn.css("display");
        if (cancelMuteButtnDisplay === "block") {
          cancelMuteButtn.click();
          console.log("播放页调整：已自动取消静音");
        }
      }
      if (
        player_type === "bangumi" &&
        globalCounts.autoCancelMuteCounts === 1
      ) {
        const cancelMuteButtn = $(
          ".squirtle-volume-wrap .squirtle-volume .squirtle-volume-icon"
        );
        const cancelMuteButtnClass = cancelMuteButtn.attr("class");
        if (cancelMuteButtnClass.includes("squirtle-volume-mute-state")) {
          cancelMuteButtn.click();
          console.log("播放页调整：已自动取消静音");
        }
      }
    },
    autoLocation() {
      const selected_screen_mod = utils.getValue("selected_screen_mod");
      const click_player_auto_locate = utils.getValue(
        "click_player_auto_locate"
      );
      if (
        selected_screen_mod !== "web"
      ) {
        const offset_top = utils.getValue("offset_top");
        const player_type = utils.getValue("player_type");
        const player_offset_top = $("#bilibili-player").offset().top;
        utils.setValue("player_offset_top", player_offset_top);
        $("html,body").scrollTop(player_offset_top - offset_top);
        const checkAutoLocationStatus = setInterval(() => {
          const document_scroll_top = $(document).scrollTop();
          const success =
            document_scroll_top === player_offset_top - offset_top;
          if (success) {
            clearInterval(checkAutoLocationStatus);
            console.log("播放页调整：自动定位成功");
          } else {
            console.log(
              "播放页调整：自动定位失败，继续尝试",
              "\n",
              "-----------------",
              "\n",
              "当前文档顶部偏移量：" + document_scroll_top,
              "\n",
              "期望文档顶部偏移量：" + (player_offset_top - offset_top),
              "\n",
              "播放器顶部偏移量：" + player_offset_top,
              "\n",
              "设置偏移量：" + offset_top
            );
            $("html,body").scrollTop(player_offset_top - offset_top);
          }
        }, 100);
        if (click_player_auto_locate) {
          $("#bilibili-player").on("click", function(event) {
            event.stopPropagation();
            if ($(this).attr("status") === "adjustment-mini") {
              console.log("播放页调整：点击迷你播放器");
            } else {
              $("html,body").scrollTop(player_offset_top - offset_top);
            }
          });
        }
      }
      if(selected_screen_mod === "web"){
        $("html,body").scrollTop(0);
        if (click_player_auto_locate) {
          $("#bilibili-player").on("click", function(event) {
            event.stopPropagation();
            if ($(this).attr("status") === "adjustment-mini") {
              console.log("播放页调整：点击迷你播放器");
            } else {
              $("html,body").scrollTop(0);
            }
          });
        }
      }
    },
    jumpVideoTime(){
      const selected_screen_mod = utils.getValue("selected_screen_mod");
      const offset_top = utils.getValue("offset_top");
      const player_type = utils.getValue("player_type");
      let player_offset_top;
      if (player_type === "video") {
        player_offset_top = $("#playerWrap").offset().top;
        utils.setValue("player_offset_top", player_offset_top);
        $("#comment").unbind('click').on("click",".jump-link.video-time",function(event){
          event.stopPropagation();
          const targetTime = $(this).attr('data-video-time');
          const video = $('#bilibili-player video')[0]
          video.currentTime = targetTime;
          video.play();
          if (selected_screen_mod === "web") $("html,body").scrollTop(0);
          if (selected_screen_mod !== "web") $("html,body").scrollTop(player_offset_top - offset_top);
          // console.log(player_offset_top - offset_top)
        })
        $("#comment").unbind('click').on("click",".video-seek",function(event){
          event.stopPropagation();
          const targetTime = $(this).attr('data-time');
          const video = $('#bilibili-player video')[0]
          video.currentTime = targetTime;
          video.play();
          if (selected_screen_mod === "web") $("html,body").scrollTop(0);
          if (selected_screen_mod !== "web") $("html,body").scrollTop(player_offset_top - offset_top);
          // console.log(player_offset_top - offset_top)
        })
      }
      if (player_type === "bangumi") {
        player_offset_top = $("#player_module").offset().top;
        utils.setValue("player_offset_top", player_offset_top);
        $("#comment_module").unbind('click').on("click",".video-seek",function(event){
          event.stopPropagation();
          const targetTime = $(this).attr('data-time');
          const video = $('#bilibili-player video')[0]
          video.currentTime = targetTime;
          video.play();
          if (selected_screen_mod === "web") $("html,body").scrollTop(0);
          if (selected_screen_mod !== "web") $("html,body").scrollTop(player_offset_top - offset_top);
          // console.log(player_offset_top - offset_top)
        })
      }
    },
    fixStyle() {
      $("body").css("overflow", "unset");
      $("#viewbox_report").attr("style", "height:106px!important");
      $(".wide-members").attr(
        "style",
        "height: 99px; overflow: hidden; padding: 0; box-sizing: border-box;margin-top: -18px;"
      );
      $(".wide-members-header").attr("style", "display:none;");
      main.playerApplyedStatus();
    },
    insertLocateButton() {
      globalCounts.insertLocateButtonCounts++;
      const player_type = utils.getValue("player_type");
      const playerDataScreen = $(".bpx-player-container").attr("data-screen");
      if (
        player_type === "video" &&
        globalCounts.insertLocateButtonCounts === 1
      ) {
        const locateButtonHtml = `<div class="item locate" title="定位至播放器">\n        <svg t="1643419779790" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1775" width="200" height="200" style="width: 50%;height: 100%;fill: currentColor;"><path d="M512 352c-88.008 0-160.002 72-160.002 160 0 88.008 71.994 160 160.002 160 88.01 0 159.998-71.992 159.998-160 0-88-71.988-160-159.998-160z m381.876 117.334c-19.21-177.062-162.148-320-339.21-339.198V64h-85.332v66.134c-177.062 19.198-320 162.136-339.208 339.198H64v85.334h66.124c19.208 177.062 162.144 320 339.208 339.208V960h85.332v-66.124c177.062-19.208 320-162.146 339.21-339.208H960v-85.334h-66.124zM512 810.666c-164.274 0-298.668-134.396-298.668-298.666 0-164.272 134.394-298.666 298.668-298.666 164.27 0 298.664 134.396 298.664 298.666S676.27 810.666 512 810.666z" p-id="1776"></path></svg></div>`;
        const floatNav = $(".float-nav-exp .nav-menu");
        const locateButton = $(".float-nav-exp .nav-menu .item.locate");
        const offset_top = utils.getValue("offset_top");
        const player_offset_top = utils.getValue("player_offset_top");
        $(".fixed-nav").css("bottom", "274px");
        floatNav.prepend(locateButtonHtml);
        locateButton.not(":first-child").remove();
        floatNav.on("click", ".locate", function () {
          if (playerDataScreen !== "web") {
            $("html,body").scrollTop(player_offset_top - offset_top);
          } else {
            $("html,body").scrollTop(0);
          }
        });
      }
      if (
        player_type === "bangumi" &&
        globalCounts.insertLocateButtonCounts === 1
      ) {
        const locateButtonHtml = `<div class="tool-item locate" title="定位至播放器">\n        <svg t="1643419779790" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1775" width="200" height="200" style="width: 50%;height: 100%;fill: currentColor;"><path d="M512 352c-88.008 0-160.002 72-160.002 160 0 88.008 71.994 160 160.002 160 88.01 0 159.998-71.992 159.998-160 0-88-71.988-160-159.998-160z m381.876 117.334c-19.21-177.062-162.148-320-339.21-339.198V64h-85.332v66.134c-177.062 19.198-320 162.136-339.208 339.198H64v85.334h66.124c19.208 177.062 162.144 320 339.208 339.208V960h85.332v-66.124c177.062-19.208 320-162.146 339.21-339.208H960v-85.334h-66.124zM512 810.666c-164.274 0-298.668-134.396-298.668-298.666 0-164.272 134.394-298.666 298.668-298.666 164.27 0 298.664 134.396 298.664 298.666S676.27 810.666 512 810.666z" p-id="1776"></path></svg></div>`;
        const floatNav = $(".nav-tools");
        const locateButton = $(".nav-tools .tool-item.locate");
        const offset_top = utils.getValue("offset_top");
        const player_offset_top = utils.getValue("player_offset_top");
        floatNav.prepend(locateButtonHtml);
        locateButton.not(":first-child").remove();
        floatNav.on("click", ".locate", function () {
          if (playerDataScreen !== "web") {
            $("html,body").scrollTop(player_offset_top - offset_top);
          } else {
            $("html,body").scrollTop(0);
          }
        });
      }
    },
    fixedWebfullUnlockStyle() {
      globalCounts.webfullUnlockCounts++;
      const webfull_unlock = utils.getValue("webfull_unlock");
      if (webfull_unlock && globalCounts.webfullUnlockCounts === 1) {
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
        console.log("播放页调整：网页全屏解锁成功");
        utils.setValue("current_screen_mod", "web");
        main.insertGoToCommentsButton();
        // 退出网页全屏
        $(".bpx-player-ctrl-btn-icon.bpx-player-ctrl-web-leave").click(
          function () {
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
            utils.setValue("selected_screen_mod", "wide");
            main.autoLocation();
            utils.setValue("selected_screen_mod", "web");
            $(".float-nav-exp .mini").css("display", "");
          }
        );
        // 再次进入网页全屏
        $(".bpx-player-ctrl-btn-icon.bpx-player-ctrl-web-enter").click(
          function () {
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
            main.autoLocation();
            $(".float-nav-exp .mini").css("display", "none");
            $("#danmukuBox").css("margin-top", "20px");
          }
        );
      }
    },
    insertGoToCommentsButton() {
      globalCounts.insertGoToCommentsButtonCounts++;
      const player_type = utils.getValue("player_type");
      const webfull_unlock = utils.getValue("webfull_unlock");
      if (
        player_type === "video" &&
        webfull_unlock &&
        globalCounts.insertGoToCommentsButtonCounts === 1
      ) {
        const goToCommentsBtnHtml = `<div class="bpx-player-ctrl-btn bpx-player-ctrl-comment" role="button" aria-label="前往评论" tabindex="0"><div id="goToComments" class="bpx-player-ctrl-btn-icon"><span class="bpx-common-svg-icon"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="88" height="88" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: 100%; transform: translate3d(0px, 0px, 0px);"><path d="M512 85.333c235.637 0 426.667 191.03 426.667 426.667S747.637 938.667 512 938.667a424.779 424.779 0 0 1-219.125-60.502A2786.56 2786.56 0 0 0 272.82 866.4l-104.405 28.48c-23.893 6.507-45.803-15.413-39.285-39.296l28.437-104.288c-11.008-18.688-18.219-31.221-21.803-37.91A424.885 424.885 0 0 1 85.333 512c0-235.637 191.03-426.667 426.667-426.667zm-102.219 549.76a32 32 0 1 0-40.917 49.216A223.179 223.179 0 0 0 512 736c52.97 0 103.19-18.485 143.104-51.67a32 32 0 1 0-40.907-49.215A159.19 159.19 0 0 1 512 672a159.19 159.19 0 0 1-102.219-36.907z" fill="#currentColor"/></svg></span></div></div>`;
        $(".bpx-player-control-bottom-right").append(goToCommentsBtnHtml);
        $("#goToComments").on('click',function(event){
          event.stopPropagation()
          $("body,html").scrollTop($("#comment").offset().top - 10)
          console.log("播放页调整：到达评论区");
        });
      }
    },
    playerLoadStateWatcher() {
      const player_type = utils.getValue("player_type");
      if (player_type === "video") {
        utils.waitElement("#playerWrap #bilibili-player", 10, 100).then(() => {
          const playerLoadStateWatcher = setInterval(() => {
            const playerVideoLength = $(".bpx-player-video-wrap").children()
              .length;
            if (playerVideoLength === 0) {
              location.reload(true);
            } else {
              clearInterval(playerLoadStateWatcher);
            }
          }, 100);
        });
      }
      if (player_type === "bangumi") {
        utils
          .waitElement("#player_module #bilibili-player", 10, 100)
          .then(() => {
            const playerLoadStateWatcher = setInterval(() => {
              const playerVideoLength = $(".bpx-player-video-wrap").children()
                .length;
              if (playerVideoLength === 0) {
                location.reload(true);
              } else {
                clearInterval(playerLoadStateWatcher);
              }
            }, 1500);
          });
      }
    },
    playerApplyedStatus() {
      const checkApplyedStatus = setInterval(() => {
        const selected_screen_mod = utils.getValue("selected_screen_mod");
        const playerDataScreen = $(".bpx-player-container").attr("data-screen");
        if (selected_screen_mod === playerDataScreen) {
          clearInterval(checkApplyedStatus);
          console.timeEnd("播放页调整：总用时");
        } else {
          console.log("播放页调整：配置应用失败，尝试重试");
        }
      }, 100);
    },
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
                  <label class="player-adjustment-setting-label" id="player-adjustment-Range-Wrapper">
                    <span>播放器顶部偏移(px)</span>
                    <input id="Top-Offset" value="${utils.getValue(
                      "offset_top"
                    )}" style="padding:5px;width: 200px;border: 1px solid #cecece;">
                  </label>
                  <span class="player-adjustment-setting-tips"> -> 参考值：顶部导航栏吸顶时为 71 ，否则为 7</span>
                  <label class="player-adjustment-setting-label"> 点击播放器时定位
                    <input type="checkbox" id="Click-Player-Auto-Location" ${
                      utils.getValue("click_player_auto_locate")
                        ? "checked"
                        : ""
                    } class="player-adjustment-setting-checkbox">
                  </label>
                  <div class="player-adjustment-setting-label screen-mod" style="display: flex;align-items: center;justify-content: space-between;"> 播放器默认模式 <div style="width: 215px;display: flex;align-items: center;justify-content: space-between;">
                      <label class="player-adjustment-setting-label" style="padding-top:0!important;">
                        <input type="radio" name="Screen-Mod" value="normal" ${
                          utils.getValue("selected_screen_mod") === "normal"
                            ? "checked"
                            : ""
                        }> 小屏 </label>
                      <label class="player-adjustment-setting-label" style="padding-top:0!important;">
                        <input type="radio" name="Screen-Mod" value="wide" ${
                          utils.getValue("selected_screen_mod") === "wide"
                            ? "checked"
                            : ""
                        }>宽屏 </label>
                      <label class="player-adjustment-setting-label" style="padding-top:0!important;">
                        <input type="radio" name="Screen-Mod" value="web" ${
                          utils.getValue("selected_screen_mod") === "web"
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
          footer:
            '<div style="text-align: center;">如果发现脚本不能用，可能是播放页更新了，请耐心等待适配。</div><hr style="border: none;height: 1px;margin: 12px 0;background: #eaeaea;"><div style="text-align: center;font-size: 1.25em;"><a href="//userstyles.world/style/241/nightmode-for-bilibili-com" target="_blank">夜间哔哩 - </a><a href="//greasyfork.org/zh-CN/scripts/415804-bilibili%E6%92%AD%E6%94%BE%E9%A1%B5%E8%B0%83%E6%95%B4-%E8%87%AA%E7%94%A8" target="_blank">检查更新</a></div>'
        }).then((res) => {
          res.isConfirmed && location.reload(true);
          if (res.isConfirmed) {
            location.reload(true);
          } else if (res.isDenied) {
            utils.setValue("current_screen_mod", "normal");
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
        $("#Top-Offset").change((e) => {
          utils.setValue("offset_top", e.target.value);
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
        $('input[name="Screen-Mod"]').click(function () {
          utils.setValue("selected_screen_mod", $(this).val());
        });
        $("#Webfull-Unlock").change((e) => {
          utils.setValue("webfull_unlock", e.target.checked);
        });
      });
    },
    addPluginStyle() {
      const style = `.swal2-popup{width:34em!important;padding:1.25em!important}.swal2-html-container{margin:0!important;padding:16px 5px 0!important;width:100%!important;box-sizing:border-box!important}.swal2-footer{flex-direction:column!important}.swal2-close{top:5px!important;right:3px!important}.swal2-actions{margin:7px auto 0!important}.swal2-styled.swal2-confirm{background-color:#23ade5!important}.swal2-icon.swal2-info.swal2-icon-show{display:none!important}.player-adjustment-container,.swal2-container{z-index:999999999!important}.player-adjustment-popup{font-size:14px!important}.player-adjustment-setting-label{display:flex!important;align-items:center!important;justify-content:space-between!important;padding-top:10px!important}.player-adjustment-setting-checkbox{width:16px!important;height:16px!important}.player-adjustment-setting-tips{width:100%!important;display:flex!important;align-items:center!important;padding:5px!important;margin-top:10px!important;background:#f5f5f5!important;box-sizing:border-box!important;font-size:14px;color:#666!important;border-radius:2px!important;text-align:left!important}.player-adjustment-setting-tips svg{margin-right:5px!important}label.player-adjustment-setting-label input{border:1px solid #cecece!important;background:#fff!important}label.player-adjustment-setting-label input[type=checkbox],label.player-adjustment-setting-label input[type=radio]{width:16px!important;height:16px!important}label.player-adjustment-setting-label input:checked{border-color:#1986b3!important;background:#23ade5!important}.auto-quality-sub-options{display:flex;align-items:center;padding-left:15px}.auto-quality-sub-options label.player-adjustment-setting-label.fourK{margin-right:10px}.auto-quality-sub-options .player-adjustment-setting-label input[type="checkbox"]{margin-left:5px!important}.player-adjustment-setting-label.screen-mod input{margin-right:5px!important}`;
      if (document.head) {
        utils.addStyle(
          "swal-pub-style",
          "style",
          GM_getResourceText("swalStyle")
        );
        utils.addStyle("player-adjustment-style", "style", style);
      }
      const headObserver = new MutationObserver(() => {
        utils.addStyle(
          "swal-pub-style",
          "style",
          GM_getResourceText("swalStyle")
        );
        utils.addStyle("player-adjustment-style", "style", style);
      });
      headObserver.observe(document.head, {
        childList: true,
        subtree: true
      });
    },
    isTopWindow() {
      return window.self === window.top;
    },
    init() {
      $("body").css("overflow", "hidden");
      this.initValue();
      this.addPluginStyle();
      this.getCurrentPlayerTypeAndScreenMod();
      this.showInformation();
      this.autoSelectScreenMod();
      this.jumpVideoTime();
      this.playerLoadStateWatcher();
      this.isTopWindow() && this.registerMenuCommand();
      utils.historyListener();
    }
  };
  main.init();
});
