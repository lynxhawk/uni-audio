if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const _sfc_main$1 = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const isPlaying = vue.ref(false);
      const currentTrackIndex = vue.ref(0);
      const progress = vue.ref(0);
      const tracks = vue.reactive([]);
      const currentLoopMode = vue.ref(0);
      const visualizerType = vue.ref("circle");
      const autoScrollEnabled = vue.ref(true);
      const isApp = vue.ref(false);
      const visualizationStarted = vue.ref(false);
      let audioContext = null;
      let canvasContext = null;
      const fileInputRef = vue.ref(null);
      const analyser = vue.ref(null);
      const dataArray = vue.ref(null);
      const toggleVisualizerType = () => {
        visualizerType.value = visualizerType.value === "circle" ? "tree" : "circle";
      };
      const initCanvas = () => {
        const query = uni.createSelectorQuery();
        query.select("#visualizer").boundingClientRect((data) => {
          if (!data)
            return;
          const ctx = uni.createCanvasContext("visualizer", vue.getCurrentInstance());
          canvasContext = ctx;
          visualize();
        }).exec();
      };
      const initAudio = () => {
        audioContext = uni.createInnerAudioContext();
        audioContext.onTimeUpdate(() => {
          if (audioContext == null ? void 0 : audioContext.duration) {
            progress.value = audioContext.currentTime / audioContext.duration * 100;
          }
        });
        audioContext.onPlay(() => {
          isPlaying.value = true;
          if (!visualizationStarted.value) {
            visualizationStarted.value = true;
            visualize();
          }
        });
        audioContext.onPause(() => {
          isPlaying.value = false;
        });
        audioContext.onStop(() => {
          isPlaying.value = false;
        });
        audioContext.onEnded(() => {
          isPlaying.value = false;
          onTrackEnd();
        });
        initAnalyser();
      };
      const initAnalyser = () => {
        if (!audioContext)
          return;
        const bufferLength = 256;
        dataArray.value = new Uint8Array(bufferLength);
      };
      const updateAudioData = () => {
        if (!audioContext || !dataArray.value)
          return;
        const bufferLength = dataArray.value.length;
        for (let i = 0; i < bufferLength; i++) {
          if (isPlaying.value) {
            dataArray.value[i] = Math.floor(
              128 + Math.sin(i / 2) * 128 + Math.random() * 30
            );
          } else {
            dataArray.value[i] = 5 + Math.random() * 2;
          }
        }
      };
      const visualize = () => {
        if (!canvasContext)
          return;
        const ctx = canvasContext;
        const query = uni.createSelectorQuery();
        query.select("#visualizer").boundingClientRect((data) => {
          if (!data)
            return;
          const canvas = {
            width: data.width,
            height: data.height
          };
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const bufferLength = dataArray.value ? dataArray.value.length : 256;
          if (visualizerType.value === "circle") {
            drawCircleVisualizer(ctx, canvas, bufferLength);
          } else if (visualizerType.value === "tree") {
            drawTreeVisualizer(ctx, canvas, bufferLength);
          }
          ctx.draw();
          setTimeout(() => {
            visualize();
          }, 1e3 / 30);
        }).exec();
      };
      const drawCircleVisualizer = (ctx, canvas, bufferLength) => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width / 3;
        const totalAngle = Math.PI * 2;
        const segmentAngle = totalAngle / bufferLength * 4 / 3;
        for (let i = 0; i < 192; i++) {
          const value = dataArray.value ? Math.max(dataArray.value[i], 5) : 5;
          const barLength = value / 2;
          const angle = i * segmentAngle;
          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barLength);
          const y2 = centerY + Math.sin(angle) * (radius + barLength);
          ctx.setStrokeStyle("#22de9c");
          ctx.setLineWidth(3);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      };
      const drawTreeVisualizer = (ctx, canvas, bufferLength) => {
        const totalBars = bufferLength / 2;
        const barWidth = canvas.width / totalBars * 0.6;
        const barSpacing = canvas.width / totalBars * 0.4;
        for (let i = 0; i < totalBars; i++) {
          const barHeight = dataArray.value ? dataArray.value[i] / 255 * canvas.height * 0.8 : 0;
          ctx.setFillStyle("#22de9c");
          ctx.fillRect(
            i * (barWidth + barSpacing),
            canvas.height - barHeight,
            barWidth,
            barHeight
          );
        }
      };
      const saveToLocalStorage = async (file) => {
        try {
          formatAppLog("log", "at pages/index/index.vue:320", "开始保存文件:", file);
          const fileName = `${Date.now()}_${file.name}`;
          const result = await new Promise((resolve, reject) => {
            const Context = plus.android.importClass("android.content.Context");
            const ContentResolver = plus.android.importClass(
              "android.content.ContentResolver"
            );
            const Uri = plus.android.importClass("android.net.Uri");
            const main = plus.android.runtimeMainActivity();
            const contentResolver = main.getContentResolver();
            const uri = Uri.parse(file.path);
            try {
              const inputStream = contentResolver.openInputStream(uri);
              const docDir = plus.io.convertLocalFileSystemURL("_doc/");
              const musicDir = `${docDir}music/`;
              plus.io.resolveLocalFileSystemURL(
                musicDir,
                (entry) => {
                  entry.getFile(
                    fileName,
                    { create: true },
                    (fileEntry) => {
                      fileEntry.createWriter((writer) => {
                        writer.onwriteend = () => {
                          const fileUrl = plus.io.convertLocalFileSystemURL(
                            `_doc/music/${fileName}`
                          );
                          const trackInfo = {
                            name: file.name,
                            url: fileUrl,
                            id: Date.now() + Math.random()
                          };
                          formatAppLog("log", "at pages/index/index.vue:370", "文件保存成功:", trackInfo);
                          uni.$emit("music-added", trackInfo);
                          resolve(trackInfo);
                        };
                        writer.onerror = (e) => {
                          formatAppLog("error", "at pages/index/index.vue:379", "写入文件错误:", e);
                          reject(e);
                        };
                        writer.write(inputStream);
                      });
                    },
                    (error) => {
                      formatAppLog("error", "at pages/index/index.vue:388", "创建文件失败:", error);
                      reject(error);
                    }
                  );
                },
                (error) => {
                  plus.io.resolveLocalFileSystemURL("_doc/", (docEntry) => {
                    docEntry.getDirectory(
                      "music",
                      { create: true },
                      (musicEntry) => {
                        saveToLocalStorage(file).then(resolve).catch(reject);
                      },
                      (dirError) => {
                        formatAppLog("error", "at pages/index/index.vue:404", "创建音乐目录失败:", dirError);
                        reject(dirError);
                      }
                    );
                  });
                }
              );
            } catch (error) {
              formatAppLog("error", "at pages/index/index.vue:412", "处理文件流错误:", error);
              reject(error);
            }
          });
          formatAppLog("log", "at pages/index/index.vue:417", "文件保存结果:", result);
          return result;
        } catch (error) {
          formatAppLog("error", "at pages/index/index.vue:420", "保存文件失败:", error);
          uni.showToast({
            title: "文件保存失败",
            icon: "none"
          });
          throw error;
        }
      };
      const loadLocalTracks = async () => {
        try {
          await new Promise((resolve, reject) => {
            plus.io.resolveLocalFileSystemURL(
              "_doc/music/",
              (entry) => {
                entry.createReader().readEntries(
                  (entries) => {
                    const musicFiles = entries.filter((entry2) => {
                      var _a;
                      const ext = (_a = entry2.name.split(".").pop()) == null ? void 0 : _a.toLowerCase();
                      return ["mp3", "wav", "aac", "m4a"].includes(ext || "");
                    });
                    tracks.length = 0;
                    for (const entry2 of musicFiles) {
                      tracks.push({
                        name: entry2.name.substring(entry2.name.indexOf("_") + 1),
                        // 移除时间戳前缀
                        url: plus.io.convertLocalFileSystemURL(
                          `_doc/music/${entry2.name}`
                        ),
                        id: Date.now() + Math.random()
                      });
                    }
                    resolve(null);
                  },
                  (error) => {
                    formatAppLog("error", "at pages/index/index.vue:457", "读取目录失败:", error);
                    reject(error);
                  }
                );
              },
              (error) => {
                plus.io.resolveLocalFileSystemURL("_doc/", (docEntry) => {
                  docEntry.getDirectory(
                    "music",
                    { create: true },
                    () => {
                      resolve(null);
                    },
                    reject
                  );
                });
              }
            );
          });
        } catch (error) {
          formatAppLog("error", "at pages/index/index.vue:478", "加载本地音乐失败:", error);
          uni.showToast({
            title: "加载本地音乐失败",
            icon: "none"
          });
        }
      };
      const chooseFiles = async () => {
        if (!isApp.value)
          return;
        try {
          if (uni.getSystemInfoSync().platform === "android") {
            await new Promise((resolve, reject) => {
              plus.android.requestPermissions(
                [
                  "android.permission.READ_EXTERNAL_STORAGE",
                  "android.permission.WRITE_EXTERNAL_STORAGE"
                ],
                function(resultObj) {
                  formatAppLog("log", "at pages/index/index.vue:499", "权限请求结果:", resultObj);
                  const granted = resultObj.granted.length === 2;
                  granted ? resolve(true) : reject("未授予存储权限");
                },
                function(error) {
                  formatAppLog("error", "at pages/index/index.vue:504", "权限请求错误:", error);
                  reject(error);
                }
              );
            });
          }
          const Intent = plus.android.importClass("android.content.Intent");
          const intent = new Intent();
          intent.setAction(Intent.ACTION_GET_CONTENT);
          intent.setType("audio/*");
          intent.addCategory(Intent.CATEGORY_OPENABLE);
          const main = plus.android.runtimeMainActivity();
          main.startActivityForResult(intent, 1);
          main.onActivityResult = (requestCode, resultCode, data) => {
            formatAppLog("log", "at pages/index/index.vue:524", "完整选择结果对象:", JSON.stringify(data));
            formatAppLog("log", "at pages/index/index.vue:525", "收到选择结果:", {
              requestCode,
              resultCode,
              hasData: !!data
            });
            if (requestCode === 1 && resultCode === -1 && data) {
              try {
                if (!data || !data.getData) {
                  formatAppLog("error", "at pages/index/index.vue:535", "无效的文件选择数据");
                  uni.showToast({
                    title: "文件选择无效",
                    icon: "none"
                  });
                  return;
                }
                const uri = data.getData();
                if (!uri) {
                  formatAppLog("error", "at pages/index/index.vue:545", "无法获取文件 URI");
                  uni.showToast({
                    title: "无法获取文件",
                    icon: "none"
                  });
                  return;
                }
                let path = plus.io.convertLocalFileSystemURL(uri.toString());
                formatAppLog("log", "at pages/index/index.vue:555", "原始文件路径:", path);
                if (path.startsWith("file://")) {
                  path = path.substring(7);
                }
                formatAppLog("log", "at pages/index/index.vue:561", "处理后的文件路径:", path);
                const DocumentFile = plus.android.importClass(
                  "androidx.documentfile.provider.DocumentFile"
                );
                const documentFile = DocumentFile.fromSingleUri(main, uri);
                let displayName = documentFile ? documentFile.getName() : null;
                if (!displayName) {
                  const decodedUri = decodeURIComponent(uri.toString());
                  const matches = decodedUri.match(/[^/]+$/);
                  displayName = matches ? matches[0] : "未知音乐";
                }
                formatAppLog("log", "at pages/index/index.vue:580", "获取到的文件名:", displayName);
                formatAppLog("log", "at pages/index/index.vue:581", "文件路径:", path);
                const file = {
                  name: displayName,
                  path
                };
                if (!file.name || !file.path) {
                  formatAppLog("error", "at pages/index/index.vue:591", "无效的文件对象:", file);
                  uni.showToast({
                    title: "文件信息获取失败",
                    icon: "none"
                  });
                  return;
                }
                saveToLocalStorage(file).then((trackInfo) => {
                  formatAppLog("log", "at pages/index/index.vue:602", "音乐保存成功:", trackInfo);
                  if (trackInfo && trackInfo.name && trackInfo.url) {
                    tracks.push(trackInfo);
                    if (tracks.length === 1) {
                      playSpecificTrack(0);
                    }
                    uni.showToast({
                      title: "添加成功",
                      icon: "success"
                    });
                  } else {
                    formatAppLog("error", "at pages/index/index.vue:618", "无效的音乐信息:", trackInfo);
                    uni.showToast({
                      title: "音乐添加失败",
                      icon: "none"
                    });
                  }
                }).catch((error) => {
                  formatAppLog("error", "at pages/index/index.vue:626", "保存到本地失败:", error);
                  uni.showToast({
                    title: "保存失败",
                    icon: "none"
                  });
                });
              } catch (err) {
                formatAppLog("error", "at pages/index/index.vue:633", "处理文件时出错:", err);
                uni.showToast({
                  title: "处理文件失败",
                  icon: "none"
                });
              }
            }
          };
        } catch (error) {
          formatAppLog("error", "at pages/index/index.vue:642", "选择文件失败:", error);
          if (error === "未授予存储权限") {
            uni.showModal({
              title: "需要权限",
              content: "请在系统设置中允许应用访问存储权限",
              showCancel: false
            });
          } else {
            uni.showToast({
              title: "选择文件失败",
              icon: "none",
              duration: 2e3
            });
          }
        }
      };
      const triggerFileInput = () => {
        if (fileInputRef.value) {
          fileInputRef.value.click();
        }
        formatAppLog("log", "at pages/index/index.vue:664", "fileInput", fileInputRef);
      };
      const onFileChange = (event) => {
        var _a;
        const input = event.target;
        if ((_a = input.files) == null ? void 0 : _a.length) {
          for (const file of Array.from(input.files)) {
            const fileURL = URL.createObjectURL(file);
            tracks.push({
              name: file.name,
              url: fileURL,
              id: Date.now() + Math.random()
            });
          }
        }
      };
      const togglePlay = () => {
        if (!audioContext)
          return;
        if (isPlaying.value) {
          audioContext.pause();
        } else {
          audioContext.play();
        }
        isPlaying.value = !isPlaying.value;
      };
      const seekTrack = (e) => {
        if (!audioContext)
          return;
        const value = typeof e === "object" ? e.detail.value : e;
        const seekTime = value / 100 * (audioContext.duration || 0);
        audioContext.seek(seekTime);
      };
      const playSpecificTrack = (index) => {
        if (index < 0 || index >= tracks.length || !audioContext)
          return;
        currentTrackIndex.value = index;
        const track = tracks[index];
        audioContext.src = track.url;
        audioContext.play();
        isPlaying.value = true;
        scrollToCurrentTrack();
      };
      const scrollToCurrentTrack = () => {
        if (!autoScrollEnabled.value)
          return;
        vue.nextTick(() => {
          const query = uni.createSelectorQuery().in(vue.getCurrentInstance());
          query.select(".playing").boundingClientRect();
          query.select(".playlist").boundingClientRect();
          query.exec((res) => {
            if (res[0] && res[1]) {
              const [track, playlist] = res;
              const scrollTop = track.top - playlist.top;
              uni.pageScrollTo({
                scrollTop,
                duration: 300
              });
            }
          });
        });
      };
      const disableAutoScroll = () => {
        autoScrollEnabled.value = false;
        setTimeout(() => {
          autoScrollEnabled.value = true;
        }, 1e3);
      };
      const removeTrack = async (index) => {
        const track = tracks[index];
        try {
          await new Promise((resolve, reject) => {
            plus.io.resolveLocalFileSystemURL(track.url, (entry) => {
              entry.remove(
                () => resolve(null),
                (error) => reject(error)
              );
            });
          });
          tracks.splice(index, 1);
          if (currentTrackIndex.value === index) {
            if (isPlaying.value && audioContext) {
              audioContext.stop();
              isPlaying.value = false;
            }
            currentTrackIndex.value = Math.min(index, tracks.length - 1);
          }
        } catch (error) {
          formatAppLog("error", "at pages/index/index.vue:765", "删除文件失败:", error);
          uni.showToast({
            title: "删除文件失败",
            icon: "none"
          });
        }
      };
      const toggleLoopMode = () => {
        currentLoopMode.value = (currentLoopMode.value + 1) % 3;
      };
      const nextTrack = () => {
        if (tracks.length === 0)
          return;
        let nextIndex;
        if (currentLoopMode.value === 1) {
          nextIndex = Math.floor(Math.random() * tracks.length);
        } else {
          nextIndex = (currentTrackIndex.value + 1) % tracks.length;
        }
        playSpecificTrack(nextIndex);
      };
      const prevTrack = () => {
        if (tracks.length === 0)
          return;
        let prevIndex;
        if (currentLoopMode.value === 1) {
          prevIndex = Math.floor(Math.random() * tracks.length);
        } else {
          prevIndex = (currentTrackIndex.value - 1 + tracks.length) % tracks.length;
        }
        playSpecificTrack(prevIndex);
      };
      const onTrackEnd = () => {
        if (currentLoopMode.value === 2) {
          playSpecificTrack(currentTrackIndex.value);
        } else {
          nextTrack();
        }
      };
      vue.onMounted(() => {
        const sysInfo = uni.getSystemInfoSync();
        isApp.value = sysInfo.platform === "android" || sysInfo.platform === "ios";
        if (isApp.value) {
          loadLocalTracks().then(() => {
            formatAppLog("log", "at pages/index/index.vue:827", "本地音乐加载完成，总数:", tracks.length);
          });
          uni.$on("music-added", (trackInfo) => {
            formatAppLog("log", "at pages/index/index.vue:832", "收到新音轨:", trackInfo);
            const exists = tracks.some((track) => track.name === trackInfo.name);
            if (!exists) {
              tracks.push(trackInfo);
              if (tracks.length === 1) {
                playSpecificTrack(0);
              }
            }
          });
        }
        initCanvas();
        initAudio();
      });
      const __returned__ = { isPlaying, currentTrackIndex, progress, tracks, currentLoopMode, visualizerType, autoScrollEnabled, isApp, visualizationStarted, get audioContext() {
        return audioContext;
      }, set audioContext(v) {
        audioContext = v;
      }, get canvasContext() {
        return canvasContext;
      }, set canvasContext(v) {
        canvasContext = v;
      }, fileInputRef, analyser, dataArray, toggleVisualizerType, initCanvas, initAudio, initAnalyser, updateAudioData, visualize, drawCircleVisualizer, drawTreeVisualizer, saveToLocalStorage, loadLocalTracks, chooseFiles, triggerFileInput, onFileChange, togglePlay, seekTrack, playSpecificTrack, scrollToCurrentTrack, disableAutoScroll, removeTrack, toggleLoopMode, nextTrack, prevTrack, onTrackEnd };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock(
      vue.Fragment,
      null,
      [
        vue.createElementVNode("div", { class: "container" }, [
          vue.createElementVNode("div", { class: "player" }, [
            vue.createElementVNode("div", { class: "visualizer-controls" }, [
              vue.createElementVNode("button", { onClick: $setup.toggleVisualizerType }, [
                vue.createElementVNode("span", { class: "mdi mdi-autorenew" })
              ])
            ]),
            vue.createElementVNode("canvas", {
              "canvas-id": "visualizer",
              id: "visualizer",
              type: "2d",
              class: "canvas"
            }),
            vue.createElementVNode("div", { class: "control_list" }, [
              vue.createElementVNode("slider", {
                value: $setup.progress,
                min: 0,
                max: 100,
                step: 0.1,
                "block-size": "12",
                activeColor: "#22de9c",
                backgroundColor: "#444",
                onChange: $setup.seekTrack,
                class: "progress-slider"
              }, null, 40, ["value"]),
              vue.createElementVNode("div", { class: "controls" }, [
                vue.createCommentVNode(" 上一首按钮 "),
                vue.createElementVNode("button", { onClick: $setup.prevTrack }, [
                  vue.createElementVNode("span", { class: "mdi mdi-skip-previous" })
                ]),
                vue.createCommentVNode(" 播放/暂停按钮 "),
                vue.createElementVNode("button", { onClick: $setup.togglePlay }, [
                  vue.createElementVNode(
                    "span",
                    {
                      class: vue.normalizeClass($setup.isPlaying ? "mdi mdi-pause" : "mdi mdi-play")
                    },
                    null,
                    2
                    /* CLASS */
                  )
                ]),
                vue.createCommentVNode(" 下一首按钮 "),
                vue.createElementVNode("button", { onClick: $setup.nextTrack }, [
                  vue.createElementVNode("span", { class: "mdi mdi-skip-next" })
                ]),
                vue.createCommentVNode(" 循环模式按钮 "),
                vue.createElementVNode("button", { onClick: $setup.toggleLoopMode }, [
                  $setup.currentLoopMode === 0 ? (vue.openBlock(), vue.createElementBlock("span", {
                    key: 0,
                    class: "mdi mdi-repeat"
                  })) : $setup.currentLoopMode === 1 ? (vue.openBlock(), vue.createElementBlock("span", {
                    key: 1,
                    class: "mdi mdi-shuffle"
                  })) : (vue.openBlock(), vue.createElementBlock("span", {
                    key: 2,
                    class: "mdi mdi-repeat-variant"
                  }))
                ]),
                vue.createCommentVNode(" 选择文件按钮 "),
                $setup.isApp ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 0,
                  class: "custom-file-upload",
                  onClick: $setup.chooseFiles
                }, [
                  vue.createElementVNode("span", { class: "mdi mdi-folder-music" })
                ])) : (vue.openBlock(), vue.createElementBlock("button", {
                  key: 2,
                  class: "custom-file-upload",
                  onClick: $setup.triggerFileInput
                }, [
                  vue.createElementVNode("span", { class: "mdi mdi-folder-music" })
                ]))
              ]),
              vue.createElementVNode("div", { class: "playlist-title" }, [
                vue.createElementVNode("span", { class: "mdi mdi-playlist-music" }),
                vue.createElementVNode("h3", null, "播放列表")
              ]),
              vue.createElementVNode(
                "div",
                {
                  class: "playlist",
                  onScroll: $setup.disableAutoScroll
                },
                [
                  vue.createElementVNode("ul", null, [
                    (vue.openBlock(true), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList($setup.tracks, (track, index) => {
                        return vue.openBlock(), vue.createElementBlock("li", {
                          key: index,
                          class: vue.normalizeClass({ playing: index === $setup.currentTrackIndex }),
                          onClick: ($event) => $setup.playSpecificTrack(index)
                        }, [
                          vue.createTextVNode(
                            vue.toDisplayString(track.name) + " ",
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode("span", {
                            onClick: vue.withModifiers(($event) => $setup.removeTrack(index), ["stop"]),
                            class: "mdi mdi-trash-can-outline"
                          }, null, 8, ["onClick"])
                        ], 10, ["onClick"]);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ])
                ],
                32
                /* NEED_HYDRATION */
              )
            ])
          ])
        ]),
        vue.createCommentVNode(" 音频播放元素 "),
        vue.createCommentVNode('  <audio\r\n    ref="audioElement"\r\n    @timeupdate="updateProgressDisplay"\r\n    @ended="onTrackEnd"\r\n    @loadedmetadata="initializeAudio"\r\n  ></audio> '),
        vue.createElementVNode("footer", { class: "footer" }, [
          vue.createCommentVNode(" <p>&copy; 2024 版权所有 | LynxHawk's Player</p> "),
          vue.createElementVNode("p", null, "© LynxHawk's Player")
        ])
      ],
      64
      /* STABLE_FRAGMENT */
    );
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-1cf27b2a"], ["__file", "C:/Work/uni-audio/pages/index/index.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "C:/Work/uni-audio/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
