<template>
  <div class="container">
    <div class="player">
      <div class="visualizer-controls">
        <button @click="toggleVisualizerType">
          <span class="mdi mdi-autorenew"></span>
        </button>
      </div>

      <canvas
        canvas-id="visualizer"
        id="visualizer"
        type="2d"
        class="canvas"
      ></canvas>

      <div class="control_list">
        <slider
          :value="progress"
          :min="0"
          :max="100"
          :step="0.1"
          block-size="12"
          activeColor="#22de9c"
          backgroundColor="#444"
          @change="seekTrack"
          class="progress-slider"
        />

        <div class="controls">
          <!-- 上一首按钮 -->
          <button @click="prevTrack">
            <span class="mdi mdi-skip-previous"></span>
          </button>
          <!-- 播放/暂停按钮 -->
          <button @click="togglePlay">
            <span :class="isPlaying ? 'mdi mdi-pause' : 'mdi mdi-play'"></span>
          </button>
          <!-- 下一首按钮 -->
          <button @click="nextTrack">
            <span class="mdi mdi-skip-next"></span>
          </button>
          <!-- 循环模式按钮 -->
          <button @click="toggleLoopMode">
            <span v-if="currentLoopMode === 0" class="mdi mdi-repeat"></span>
            <span
              v-else-if="currentLoopMode === 1"
              class="mdi mdi-shuffle"
            ></span>
            <span v-else class="mdi mdi-repeat-variant"></span>
          </button>
          <!-- 选择文件按钮 -->
          <button v-if="isApp" class="custom-file-upload" @click="chooseFiles">
            <span class="mdi mdi-folder-music"></span>
          </button>

          <!-- 兼容 H5 端的文件选择 -->
          <input
            v-else
            type="file"
            accept=".mp3,.wav,.aac,.m4a"
            @change="onFileChange"
            style="display: none"
            ref="fileInputRef"
            multiple
          />
          <button v-else class="custom-file-upload" @click="triggerFileInput">
            <span class="mdi mdi-folder-music"></span>
          </button>
        </div>

        <div class="playlist-title">
          <span class="mdi mdi-playlist-music"></span>
          <h3>播放列表</h3>
        </div>

        <div class="playlist" @scroll="disableAutoScroll">
          <ul>
            <li
              v-for="(track, index) in tracks"
              :key="index"
              :class="{ playing: index === currentTrackIndex }"
              @click="playSpecificTrack(index)"
            >
              {{ track.name }}
              <span
                @click.stop="removeTrack(index)"
                class="mdi mdi-trash-can-outline"
              ></span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  <!-- 音频播放元素 -->
  <!--  <audio
    ref="audioElement"
    @timeupdate="updateProgressDisplay"
    @ended="onTrackEnd"
    @loadedmetadata="initializeAudio"
  ></audio> -->
  <footer class="footer">
    <!-- <p>&copy; 2024 版权所有 | LynxHawk's Player</p> -->
    <p>&copy; LynxHawk's Player</p>
  </footer>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, getCurrentInstance } from "vue";

// 状态定义
const isPlaying = ref(false);
const currentTrackIndex = ref(0);
const progress = ref(0);
const tracks = reactive<Array<{ id: number; name: string; url: string }>>([]);
const currentLoopMode = ref(0);
const visualizerType = ref<"circle" | "tree">("circle");
const autoScrollEnabled = ref(true);
const isApp = ref(false);
const visualizationStarted = ref(false); // 添加此行，用于追踪可视化是否已启动

// 音频和画布相关引用
let audioContext: UniApp.InnerAudioContext | null = null;
let canvasContext: UniApp.CanvasContext | null = null;
const fileInputRef = ref<HTMLInputElement | null>(null);

// 添加音频分析器相关状态
const analyser = ref<null | any>(null);
const dataArray = ref<Uint8Array | null>(null);

// 切换可视化类型
const toggleVisualizerType = () => {
  visualizerType.value = visualizerType.value === "circle" ? "tree" : "circle";
};
// 初始化画布
const initCanvas = () => {
  const query = uni.createSelectorQuery();
  query
    .select("#visualizer")
    .boundingClientRect((data) => {
      if (!data) return;

      // 创建画布上下文
      const ctx = uni.createCanvasContext("visualizer", getCurrentInstance());
      canvasContext = ctx;

      // 开始可视化
      visualize();
    })
    .exec();
};
// 初始化音频
const initAudio = () => {
  audioContext = uni.createInnerAudioContext();

  audioContext.onTimeUpdate(() => {
    if (audioContext?.duration) {
      progress.value = (audioContext.currentTime / audioContext.duration) * 100;
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

  // 初始化分析器
  initAnalyser();
};
// 初始化音频分析器
const initAnalyser = () => {
  if (!audioContext) return;

  // 由于 uniapp 不支持 Web Audio API，我们模拟音频数据
  const bufferLength = 256;
  dataArray.value = new Uint8Array(bufferLength);
};

// 更新音频数据
const updateAudioData = () => {
  if (!audioContext || !dataArray.value) return;

  // 在 uniapp 中，我们根据音频的播放状态模拟数据
  const bufferLength = dataArray.value.length;
  for (let i = 0; i < bufferLength; i++) {
    if (isPlaying.value) {
      // 播放时生成动态数据
      dataArray.value[i] = Math.floor(
        128 + Math.sin(i / 2) * 128 + Math.random() * 30
      );
    } else {
      // 未播放时保持小幅度波动
      dataArray.value[i] = 5 + Math.random() * 2;
    }
  }
};

// 可视化处理
const visualize = () => {
  if (!canvasContext) return;

  const ctx = canvasContext;
  const query = uni.createSelectorQuery();

  query
    .select("#visualizer")
    .boundingClientRect((data) => {
      if (!data) return;

      const canvas = {
        width: data.width,
        height: data.height,
      };

      // 更新音频数据
      //updateAudioData();

      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bufferLength = dataArray.value ? dataArray.value.length : 256;

      if (visualizerType.value === "circle") {
        drawCircleVisualizer(ctx, canvas, bufferLength);
      } else if (visualizerType.value === "tree") {
        drawTreeVisualizer(ctx, canvas, bufferLength);
      }

      // 绘制到画布
      ctx.draw();

      // 继续动画
      setTimeout(() => {
        visualize();
      }, 1000 / 30); // 约 30fps
    })
    .exec();
};

// 绘制圆形可视化
const drawCircleVisualizer = (
  ctx: UniApp.CanvasContext,
  canvas: { width: number; height: number },
  bufferLength: number
) => {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 3;

  const totalAngle = Math.PI * 2;
  const segmentAngle = ((totalAngle / bufferLength) * 4) / 3;

  for (let i = 0; i < 192; i++) {
    const value = dataArray.value ? Math.max(dataArray.value[i], 5) : 5;
    const barLength = value / 2;

    const angle = i * segmentAngle;
    const x1 = centerX + Math.cos(angle) * radius;
    const y1 = centerY + Math.sin(angle) * radius;
    const x2 = centerX + Math.cos(angle) * (radius + barLength);
    const y2 = centerY + Math.sin(angle) * (radius + barLength);

    // uniapp 不支持渐变，使用固定颜色
    const hue = (i / 192) * 360;
    ctx.setStrokeStyle("#22de9c");
    ctx.setLineWidth(3);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
};

// 绘制树状可视化
const drawTreeVisualizer = (
  ctx: UniApp.CanvasContext,
  canvas: { width: number; height: number },
  bufferLength: number
) => {
  const totalBars = bufferLength / 2;
  const barWidth = (canvas.width / totalBars) * 0.6;
  const barSpacing = (canvas.width / totalBars) * 0.4;

  for (let i = 0; i < totalBars; i++) {
    const barHeight = dataArray.value
      ? (dataArray.value[i] / 255) * canvas.height * 0.8
      : 0;

    // uniapp 不支持 HSL，使用固定颜色
    ctx.setFillStyle("#22de9c");

    ctx.fillRect(
      i * (barWidth + barSpacing),
      canvas.height - barHeight,
      barWidth,
      barHeight
    );
  }
};

const saveToLocalStorage = async (file: { name: string; path: string }) => {
  try {
    console.log("开始保存文件:", file);

    // 生成唯一文件名
    const fileName = `${Date.now()}_${file.name}`;

    // 在 Android 平台处理 content:// URI
    const result = await new Promise((resolve, reject) => {
      // 获取 Android 上下文和 ContentResolver
      const Context = plus.android.importClass("android.content.Context");
      const ContentResolver = plus.android.importClass("android.content.ContentResolver");
      const Uri = plus.android.importClass("android.net.Uri");

      // 获取主 Activity
      const main = plus.android.runtimeMainActivity();
      const contentResolver = main.getContentResolver();

      // 解析 URI
      const uri = Uri.parse(file.path);

      try {
        // 打开输入流
        const inputStream = contentResolver.openInputStream(uri);
        
        // 获取文档目录
        const docDir = plus.io.convertLocalFileSystemURL("_doc/");
        const musicDir = `${docDir}music/`;

        // 确保音乐目录存在
        plus.io.resolveLocalFileSystemURL(musicDir, 
          (entry) => {
            // 目录存在，创建文件
            entry.getFile(fileName, { create: true }, 
              (fileEntry) => {
                // 打开文件输出流
                fileEntry.createWriter((writer) => {
                  writer.onwriteend = () => {
                    const fileUrl = plus.io.convertLocalFileSystemURL(`_doc/music/${fileName}`);
                    resolve({
                      name: file.name,
                      url: fileUrl,
                      id: Date.now() + Math.random()
                    });
                  };

                  writer.onerror = (e) => {
                    console.error("写入文件错误:", e);
                    reject(e);
                  };

                  // 开始写入
                  writer.write(inputStream);
                });
              },
              (error) => {
                console.error("创建文件失败:", error);
                reject(error);
              }
            );
          },
          (error) => {
            // 如果目录不存在，先创建
            plus.io.resolveLocalFileSystemURL("_doc/", 
              (docEntry) => {
                docEntry.getDirectory("music", { create: true }, 
                  (musicEntry) => {
                    // 重新调用保存逻辑
                    saveToLocalStorage(file);
                  },
                  (dirError) => {
                    console.error("创建音乐目录失败:", dirError);
                    reject(dirError);
                  }
                );
              }
            );
          }
        );
      } catch (error) {
        console.error("处理文件流错误:", error);
        reject(error);
      }
    });

    console.log("文件保存结果:", result);
    return result;
  } catch (error) {
    console.error("保存文件失败:", error);
    uni.showToast({
      title: "文件保存失败",
      icon: "none"
    });
    throw error;
  }
};

// 加载本地音乐列表
const loadLocalTracks = async () => {
  try {
    await new Promise((resolve, reject) => {
      plus.io.resolveLocalFileSystemURL(
        "_doc/music/",
        (entry) => {
          entry.createReader().readEntries(
            (entries) => {
              const musicFiles = entries.filter((entry) => {
                const ext = entry.name.split(".").pop()?.toLowerCase();
                return ["mp3", "wav", "aac", "m4a"].includes(ext || "");
              });

              tracks.length = 0; // 清空当前列表

              for (const entry of musicFiles) {
                tracks.push({
                  name: entry.name.substring(entry.name.indexOf("_") + 1), // 移除时间戳前缀
                  url: plus.io.convertLocalFileSystemURL(
                    `_doc/music/${entry.name}`
                  ),
                  id: Date.now() + Math.random(),
                });
              }
              resolve(null);
            },
            (error) => {
              console.error("读取目录失败:", error);
              reject(error);
            }
          );
        },
        (error) => {
          // 如果目录不存在，创建它
          plus.io.resolveLocalFileSystemURL("_doc/", (docEntry) => {
            docEntry.getDirectory(
              "music",
              { create: true },
              () => {
                resolve(null); // 新建的目录当然是空的
              },
              reject
            );
          });
        }
      );
    });
  } catch (error) {
    console.error("加载本地音乐失败:", error);
    uni.showToast({
      title: "加载本地音乐失败",
      icon: "none",
    });
  }
};

const chooseFiles = async () => {
  if (!isApp.value) return;

  try {
    // Android 权限检查
    if (uni.getSystemInfoSync().platform === "android") {
      await new Promise((resolve, reject) => {
        plus.android.requestPermissions(
          [
            "android.permission.READ_EXTERNAL_STORAGE",
            "android.permission.WRITE_EXTERNAL_STORAGE",
          ],
          function (resultObj) {
            console.log("权限请求结果:", resultObj);
            const granted = resultObj.granted.length === 2;
            granted ? resolve(true) : reject("未授予存储权限");
          },
          function (error) {
            console.error("权限请求错误:", error);
            reject(error);
          }
        );
      });
    }

    // 使用系统文件选择器
    const Intent = plus.android.importClass("android.content.Intent");
    const intent = new Intent();

    intent.setAction(Intent.ACTION_GET_CONTENT);
    intent.setType("audio/*");
    intent.addCategory(Intent.CATEGORY_OPENABLE);

    const main = plus.android.runtimeMainActivity();
    main.startActivityForResult(intent, 1);

    // 处理选择结果
    main.onActivityResult = (requestCode, resultCode, data) => {
      console.log("完整选择结果对象:", JSON.stringify(data));
      console.log("收到选择结果:", {
        requestCode,
        resultCode,
        hasData: !!data,
      });

      if (requestCode === 1 && resultCode === -1 && data) {
        try {
          // 安全检查：确保 data 存在且有效
          if (!data || !data.getData) {
            console.error("无效的文件选择数据");
            uni.showToast({
              title: "文件选择无效",
              icon: "none"
            });
            return;
          }

          const uri = data.getData();
          if (!uri) {
            console.error("无法获取文件 URI");
            uni.showToast({
              title: "无法获取文件",
              icon: "none"
            });
            return;
          }

          // 获取文件路径
          let path = plus.io.convertLocalFileSystemURL(uri.toString());
          console.log("原始文件路径:", path);

          // 移除 file:// 前缀
          if (path.startsWith("file://")) {
            path = path.substring(7);
          }
          console.log("处理后的文件路径:", path);

          // 使用 DocumentFile 获取文件名
          const DocumentFile = plus.android.importClass(
            "androidx.documentfile.provider.DocumentFile"
          );
          const documentFile = DocumentFile.fromSingleUri(main, uri);
          
          // 安全获取文件名
          let displayName = documentFile ? documentFile.getName() : null;

          if (!displayName) {
            // 如果无法获取文件名，从 URI 中提取
            const decodedUri = decodeURIComponent(uri.toString());
            const matches = decodedUri.match(/[^/]+$/);
            displayName = matches ? matches[0] : "未知音乐";
          }

          // 详细日志
          console.log("获取到的文件名:", displayName);
          console.log("文件路径:", path);

          // 准备文件信息
          const file = {
            name: displayName,
            path: path,
          };

          // 安全检查：确保文件对象有效
          if (!file.name || !file.path) {
            console.error("无效的文件对象:", file);
            uni.showToast({
              title: "文件信息获取失败",
              icon: "none"
            });
            return;
          }

          // 保存到本地存储并添加到播放列表
          saveToLocalStorage(file)
            .then((trackInfo) => {
              console.log("音乐保存成功:", trackInfo);
              
              // 安全检查：确保 trackInfo 有效
              if (trackInfo && trackInfo.name && trackInfo.url) {
                tracks.push(trackInfo);

                // 如果是第一首歌，自动播放
                if (tracks.length === 1) {
                  playSpecificTrack(0);
                }

                uni.showToast({
                  title: "添加成功",
                  icon: "success",
                });
              } else {
                console.error("无效的音乐信息:", trackInfo);
                uni.showToast({
                  title: "音乐添加失败",
                  icon: "none",
                });
              }
            })
            .catch((error) => {
              console.error("保存到本地失败:", error);
              uni.showToast({
                title: "保存失败",
                icon: "none",
              });
            });

        } catch (err) {
          console.error("处理文件时出错:", err);
          uni.showToast({
            title: "处理文件失败",
            icon: "none",
          });
        }
      }
    };
  } catch (error) {
    console.error("选择文件失败:", error);
    if (error === "未授予存储权限") {
      uni.showModal({
        title: "需要权限",
        content: "请在系统设置中允许应用访问存储权限",
        showCancel: false,
      });
    } else {
      uni.showToast({
        title: "选择文件失败",
        icon: "none",
        duration: 2000,
      });
    }
  }
};

// H5 端文件选择逻辑
const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click(); // 直接触发点击
  }
  console.log("fileInput", fileInputRef);
};

// H5 端文件变化处理函数
const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    for (const file of Array.from(input.files)) {
      const fileURL = URL.createObjectURL(file);
      tracks.push({
        name: file.name,
        url: fileURL,
        id: Date.now() + Math.random(),
      });
    }
  }
};

// 控制相关方法
const togglePlay = () => {
  if (!audioContext) return;

  if (isPlaying.value) {
    audioContext.pause();
  } else {
    audioContext.play();
  }
  isPlaying.value = !isPlaying.value;
};

const seekTrack = (e: any) => {
  if (!audioContext) return;
  const value = typeof e === "object" ? e.detail.value : e;
  const seekTime = (value / 100) * (audioContext.duration || 0);
  audioContext.seek(seekTime);
};

const playSpecificTrack = (index: number) => {
  if (index < 0 || index >= tracks.length || !audioContext) return;

  currentTrackIndex.value = index;
  const track = tracks[index];

  audioContext.src = track.url;
  audioContext.play();
  isPlaying.value = true;
  scrollToCurrentTrack();
};

// 自动滚动
const scrollToCurrentTrack = () => {
  if (!autoScrollEnabled.value) return;

  nextTick(() => {
    const query = uni.createSelectorQuery().in(getCurrentInstance());
    query.select(".playing").boundingClientRect();
    query.select(".playlist").boundingClientRect();
    query.exec((res) => {
      if (res[0] && res[1]) {
        const [track, playlist] = res;
        const scrollTop = track.top - playlist.top;
        uni.pageScrollTo({
          scrollTop,
          duration: 300,
        });
      }
    });
  });
};

const disableAutoScroll = () => {
  autoScrollEnabled.value = false;
  setTimeout(() => {
    autoScrollEnabled.value = true;
  }, 1000);
};

// 删除本地文件
const removeTrack = async (index: number) => {
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
    console.error("删除文件失败:", error);
    uni.showToast({
      title: "删除文件失败",
      icon: "none",
    });
  }
};

// 循环模式
const toggleLoopMode = () => {
  currentLoopMode.value = (currentLoopMode.value + 1) % 3;
};

// 下一首
const nextTrack = () => {
  if (tracks.length === 0) return;

  let nextIndex;
  if (currentLoopMode.value === 1) {
    // 随机播放
    nextIndex = Math.floor(Math.random() * tracks.length);
  } else {
    nextIndex = (currentTrackIndex.value + 1) % tracks.length;
  }

  playSpecificTrack(nextIndex);
};

// 上一首
const prevTrack = () => {
  if (tracks.length === 0) return;

  let prevIndex;
  if (currentLoopMode.value === 1) {
    // 随机播放
    prevIndex = Math.floor(Math.random() * tracks.length);
  } else {
    prevIndex = (currentTrackIndex.value - 1 + tracks.length) % tracks.length;
  }

  playSpecificTrack(prevIndex);
};

// 曲目结束处理
const onTrackEnd = () => {
  if (currentLoopMode.value === 2) {
    // 单曲循环
    playSpecificTrack(currentTrackIndex.value);
  } else {
    nextTrack();
  }
};

// 生命周期
onMounted(() => {
  // 更准确的平台检测
  const sysInfo = uni.getSystemInfoSync();
  isApp.value = sysInfo.platform === "android" || sysInfo.platform === "ios";
  console.log("当前平台:", sysInfo.platform); // 添加平台信息日志

  if (isApp.value) {
    loadLocalTracks(); // 加载本地音乐列表
  }
  console.log("fileInput after mount:", fileInputRef.value);
  initCanvas();
  initAudio();
});
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background: linear-gradient(to bottom, #372963, #000000);
  color: white;
}

.player {
  text-align: center;
  flex-direction: row;
  display: flex;
  justify-content: center;
  margin: 0 auto;
}

.visualizer-controls {
  display: flex;
  justify-content: center;
  /* 控件居中 */
  width: 85%;
  /* 确保控件占据整个宽度 */
}

.visualizer-controls button {
  background-color: transparent;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 24px;
  height: 100px;
}

.visualizer-controls button:hover {
  color: #22de9c;
}

canvas {
  background-color: transparent;
  display: block;
  width: 600px;
  height: 600px;
  margin-right: 100px;
}

.control_list {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.controls {
  margin-top: 30px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

button span.mdi,
.custom-file-upload span.mdi {
  font-size: 60px;
  /* 图标大小 */
  vertical-align: middle;
  /* 垂直居中 */
}

button {
  margin: 0 5px;
  padding: 10px 20px;
  font-size: 16px;
  background-color: transparent;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 100px;
  border: none;
  transition: background 0.3s;
  /* 平滑过渡 */
}

button:focus {
  outline: none;
  /* 确保点击聚焦时也没有白边 */
}

button:hover {
  background-color: #b6b6b636;
  color: #22de9c;
}

.custom-file-upload {
  display: inline-flex;
  /* 使用 flex 布局 */
  justify-content: center;
  /* 水平居中 */
  align-items: center;
  /* 垂直居中 */
  padding: 10px 20px;
  font-size: 16px;
  background-color: transparent;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin: 0 5px;
  width: 100px;
  transition: background 0.3s;
  /* 平滑过渡 */
  height: 76px;
}

.custom-file-upload:hover {
  background-color: #b6b6b636;
  color: #22de9c;
}

.custom-file-upload input {
  display: none;
}

.playlist {
  text-align: left;
  width: 100%;
  max-height: 380px;
  overflow-y: auto;
  transition: all 0.3s ease-in-out;
  box-sizing: border-box;
  /* 始终保留滚动条空间 */
  scrollbar-gutter: stable;
}

.playlist-title {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: 30px;
  margin-top: 30px;
}

.playlist-title h3 {
  margin-left: 10px;
}

.playlist-title span {
  margin-left: 10px;
  font-size: 35px;
}

/* 滚动条基础样式 */
.playlist::-webkit-scrollbar {
  width: 6px;
  /* 滚动条默认宽度 */
  opacity: 0;
  /* 初始透明 */
  transition: opacity 0.3s ease-in-out;
  /* 平滑透明度 */
}

/* 滚动条轨道 */
.playlist::-webkit-scrollbar-track {
  background: transparent;
  /* 轨道背景透明 */
}

/* 滚动条滑块 */
.playlist::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0);
  /* 初始完全透明 */
  border-radius: 3px;
  /* 圆角 */
  transition: background 0.3s ease-in-out;
  /* 平滑滑块颜色 */
}

/* 鼠标悬停在列表区域时 */
.playlist:hover::-webkit-scrollbar {
  opacity: 1;
  /* 过渡显示滚动条 */
}

.playlist:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  /* 滑块半透明 */
}

/* 鼠标悬浮在滚动条滑块上时 */
.playlist::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
  /* 滑块更明显 */
}

.playlist ul {
  list-style: none;
  padding: 0;
}

.playlist li {
  cursor: pointer;
  padding: 10px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  /* 为 span 绝对定位提供参考 */
}

.playlist li.playing {
  background-color: #b6b6b636;
  color: #22de9c;
}

.playlist li span {
  opacity: 0;
  /* 初始透明 */
  transition: opacity 0.2s ease-in-out;
  /* 平滑过渡 */
  font-size: 25px;
  pointer-events: auto;
  /* 确保按钮可接收鼠标事件 */
}

.playlist li:hover span {
  opacity: 1;
  /* 鼠标悬停在 li 上时按钮可见 */
}

.playlist li span:hover {
  opacity: 1;
  /* 鼠标悬停在按钮上时保持显示 */
}

/* 定义进度条的基础样式 */
.progress-bar {
  -webkit-appearance: none; /* 去除默认样式 */
  width: 100%; /* 使进度条宽度自适应 */
  height: 10px; /* 调整进度条的高度 */
  background: #444; /* 设置进度条背景颜色 */
  border-radius: 5px; /* 圆角效果 */
  outline: none; /* 去除进度条的外边框 */
  transition: background 0.3s ease; /* 平滑过渡效果 */
}

/* 自定义滑块样式 */
.progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none; /* 去除默认滑块样式 */
  width: 20px; /* 设置滑块的宽度 */
  height: 20px; /* 设置滑块的高度 */
  border-radius: 50%; /* 使滑块圆形 */
  background: #ffffff; /* 设置滑块的背景色 */
  cursor: pointer; /* 设置滑块的光标为指针 */
  transition: background 0.3s ease; /* 平滑过渡效果 */
}

/* 滑块悬停时的样式 */
.progress-bar::-webkit-slider-thumb:hover {
  background: #22de9c; /* 悬停时改变滑块颜色 */
}

/* 当进度条被拖动时，改变轨道的颜色 */
.progress-bar:active {
  background: #22de9c; /* 进度条拖动时的颜色 */
}

/* 对 Firefox 和其他浏览器的支持 */
.progress-bar::-moz-range-track {
  background: #ddd;
  height: 10px;
  border-radius: 5px;
}

.progress-bar::-moz-range-thumb {
  background: #22de9c;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.footer {
  position: fixed;
  /* 固定在页面底部 */
  bottom: 0;
  /* 距离底部 0px */
  left: 0;
  /* 从左侧开始 */
  width: 100%;
  /* 宽度占满整个页面 */
  color: #22de9c;
  /* 字体颜色 */
  text-align: center;
  /* 文本居中 */
  padding: 10px 0;
  /* 上下内边距 */
  font-size: 14px;
  /* 字体大小 */
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.3);
  /* 添加阴影，提升立体感 */
  z-index: 1000;
  /* 确保不会被其他内容覆盖 */
  background: linear-gradient(to right, #003366, #663399, #ff66cc, #ff9933),
    /* 水平颜色渐变 */
      linear-gradient(to bottom, rgba(19, 9, 6, 1) 0%, rgba(16, 9, 6, 0.5) 100%);
  /* 垂直方向渐变调整比例 */
  background-blend-mode: multiply;
  /* 混合模式叠加 */
  height: 50px;
}

.footer p {
  margin: 30px;
  /* 去掉段落默认外边距 */
  line-height: 1.5;
  /* 设置行高 */
}

/* 媒体查询：屏幕宽度小于等于 768px 时 */
@media (max-width: 768px) {
  .player {
    flex-direction: column;
    /* 改为竖直排列 */
    align-items: center;
    justify-content: center;
    max-width: 100%;
  }

  canvas {
    width: 80%;
    /* 画布宽度适应小屏幕 */
    height: 300px;
    /* 画布高度减小 */
    margin-right: 0;
    margin-bottom: 20px;
  }

  .control_list {
    max-width: 100%;
  }

  button span.mdi,
  .custom-file-upload span.mdi {
    font-size: 40px;
    /* 图标大小 */
  }

  button {
    padding: 0px 5px;
  }

  .visualizer-controls button {
    margin-right: auto;
    /* 按钮左对齐 */
    width: 70px;
    height: 70px;
  }

  .custom-file-upload {
    height: 60%;
    width: 20%;
    padding: 0px 15px;
  }

  span.mdi.mdi-folder-music::before {
    height: 80%;
  }

  .progress-bar {
    width: 80%;
    /* 进度条宽度适应屏幕 */
  }

  .playlist-title {
    width: 90%;
  }

  .playlist {
    width: 90%;
  }
}
</style>
