<template>
  <!-- 
    整体容器，用于定位 Live2D 模型的显示位置和大小。
    它被设置为 fixed 定位，使其相对于视口固定，通常在 Electron 应用中这样可以悬浮在最上层。
  -->
  <div class="iframe-container">
    <!-- 
      iframe 元素用于加载 Live2D 的 HTML 页面。
      我们使用 iframe 是因为它提供了一个独立的运行环境，避免 Live2D 的 JS/CSS 与主应用冲突。

      - src="/live2d-display.html": 指定了 Live2D 页面的路径。
        由于 live2d-display.html 放在了 src/renderer/public/ 目录下，
        Vite 会在构建时将其作为静态资源，因此可以直接通过根路径 / 访问。
      - frameborder="0": 移除 iframe 的边框，使其看起来更加无缝。
      - scrolling="no": 禁用 iframe 内部的滚动条。Live2D 通常不需要滚动。
      - allowtransparency="true": 允许 iframe 背景透明。
        这是让 Live2D 模型看起来直接显示在应用内的关键属性。
      - style="background-color: transparent;": 进一步确保 iframe 本身没有背景色。
      - pointer-events: auto; 在 iframe 的 CSS 中单独设置，确保鼠标事件能传递给 Live2D 模型，实现交互。
        （这里通过 CSS 类覆盖了容器的 pointer-events: none;）
    -->
    <iframe
      src="live2d://live2d-display.html"
      frameborder="0"
      scrolling="no"
      allowtransparency="true"
      style="background-color: transparent"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
// 这里通常不需要额外的 script setup 内容，因为 Live2D 的逻辑都在 iframe 内部运行。
// 如果未来你需要从 Vue 应用与 Live2D 进行通信（例如发送消息、改变模型），
// 则需要在这里添加 JS 代码，使用 postMessage 或其他 IPC 机制。
</script>

<style scoped>
/* 
  scoped 属性确保这里的样式只会应用于当前 assistant.vue 组件，
  不会影响到应用的其他部分，也不会被其他样式影响。
*/

.iframe-container {
  position: fixed; /* 固定定位，相对于浏览器视口 */
  bottom: 0; /* 距离底部 0px */
  right: 0; /* 距离右侧 0px */
  width: 350px; /* Live2D 模型的宽度（可以根据需要调整） */
  height: 450px; /* Live2D 模型的高度（可以根据需要调整） */
  z-index: 9999; /* 设置一个较高的层级，确保 Live2D 模型总是在最上层显示 */
  /* 
    初始设置为 none，意味着鼠标事件穿透容器，不会捕获，
    让用户可以直接点击 iframe 下方的元素。
    iframe 内部会通过自身样式覆盖为 auto，从而实现当鼠标悬停在 Live2D 模型上时，
    可以与模型进行交互，而模型区域外则可以点击下层应用元素。
  */
  pointer-events: none;
}

iframe {
  width: 100%; /* iframe 宽度占满父容器 */
  height: 100%; /* iframe 高度占满父容器 */
  border: none; /* 移除 iframe 默认边框 */
  /*
    此处将 iframe 的 pointer-events 设为 auto，
    这样当鼠标进入 iframe 区域时，可以与 Live2D 模型进行交互。
    如果设为 none，则模型将无法响应点击或触摸事件。
  */
  pointer-events: auto;
}
</style>
