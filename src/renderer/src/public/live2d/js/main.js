/* eslint-disable */
var v
// v.l2d.models
$(document).ready(() => {
  v = new Viewer('model')
})

class Viewer {
  constructor(basePath) {
    this.l2d = new L2D(basePath)

    this.canvas = $('.Canvas')
    this.selectCharacter = $('.selectCharacter')
    this.selectAnimation = $('.selectAnimation')

    let stringCharacter = "<option value='null'>选择模型/服装</option>" // 添加一个默认的提示选项
    for (let displayName in charData) {
      // 遍历 charData 的显示名称
      // value 是实际的模型路径，显示文本是友好的 displayName
      stringCharacter += `<option value="${charData[displayName]}">${displayName}</option>`
    }
    this.selectCharacter.html(stringCharacter)

    // 设置默认选中项
    if (typeof defaultModelDisplayName !== 'undefined' && charData[defaultModelDisplayName]) {
      this.selectCharacter.val(charData[defaultModelDisplayName])
    }

    this.selectCharacter.change((event) => {
      // 如果选中了默认提示选项，则不执行任何操作
      if (event.target.value === 'null') {
        return
      }
      let name = event.target.value // name 指的是模型的实际路径
      this.l2d.load(name, this)
    })

    this.app = new PIXI.Application({
      width: 250, // 和窗口一致
      height: 350, // 和窗口一致
      transparent: true,
      backgroundAlpha: 0,
      // 🌟 性能优化：降低渲染质量以减少GPU占用
      antialias: false, // 禁用抗锯齿
      resolution: 1, // 使用标准分辨率（避免高DPI屏的额外开销）
      autoDensity: false, // 不自动调整像素密度
      powerPreference: 'low-power' // 偏好低功耗模式
    })

    // 🌟 性能优化：限制PixiJS渲染帧率为15fps
    // 💥 关键：15fps对Live2D模型已足够流畅，同时大幅降低GPU占用
    // 避免与视频播放器的硬件解码争抢GPU进程资源
    this.app.ticker.maxFPS = 15
    let width = window.innerWidth
    let height = (width / 16.0) * 9.0
    this.app.view.style.width = width + 'px'
    this.app.view.style.height = height + 'px'
    this.app.renderer.resize(width, height)
    this.canvas.html(this.app.view)

    this.app.ticker.add((deltaTime) => {
      if (!this.model) {
        return
      }

      this.model.update(deltaTime)
      this.model.masks.update(this.app.renderer)
    })

    // 💥 性能优化：窗口不可见时暂停PixiJS渲染，减少GPU竞争
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.app.ticker.stop()
      } else {
        this.app.ticker.start()
      }
    })
    window.onresize = (event) => {
      if (event === void 0) {
        event = null
      }

      // 🌟 1. 这里填入你 index.ts 中 live2dWindow 设置的真实宽高
      const windowWidth = 250
      const windowHeight = 350

      this.app.view.style.width = windowWidth + 'px'
      this.app.view.style.height = windowHeight + 'px'
      this.app.renderer.resize(windowWidth, windowHeight)

      if (this.model) {
        // 🌟 2. 设置位置居中
        // 如果觉得人物太偏上，可以把 height * 0.5 改成 height * 0.6 或 0.7 往下移
        this.model.position = new PIXI.Point(windowWidth * 0.5, windowHeight * 0.5)

        // 🌟 3. 设置固定的缩放比例（直接写死，不要再自动计算了！）
        // 根据 Live2D 的坐标系，这里大约填 10 ~ 25 左右比较合适。
        // 【调试指南】：
        // - 如果还是太大：把 15 改成 8、5 甚至更小
        // - 如果突然变得太小：把 15 改成 20、30
        const fixedScale = 15
        this.model.scale = new PIXI.Point(fixedScale, fixedScale)

        this.model.masks.resize(this.app.view.width, this.app.view.height)
      }
    }
    this.isClick = false
    this.app.view.addEventListener('mousedown', (event) => {
      this.isClick = true
    })
    this.app.view.addEventListener('mousemove', (event) => {
      if (this.isClick) {
        this.isClick = false
        if (this.model) {
          this.model.inDrag = true
        }
      }

      if (this.model) {
        let mouse_x = this.model.position.x - event.offsetX
        let mouse_y = this.model.position.y - event.offsetY
        this.model.pointerX = -mouse_x / this.app.view.height
        this.model.pointerY = -mouse_y / this.app.view.width
      }
    })
    this.app.view.addEventListener('mouseup', (event) => {
      if (!this.model) {
        return
      }

      if (this.isClick) {
        if (this.isHit('TouchHead', event.offsetX, event.offsetY)) {
          this.startAnimation('touch_head', 'base')
        } else if (this.isHit('TouchSpecial', event.offsetX, event.offsetY)) {
          this.startAnimation('touch_special', 'base')
        } else {
          const bodyMotions = ['touch_body', 'main_1', 'main_2', 'main_3']
          let currentMotion = bodyMotions[Math.floor(Math.random() * bodyMotions.length)]
          this.startAnimation(currentMotion, 'base')
        }
      }

      this.isClick = false
      this.model.inDrag = false
    })
  }

  changeCanvas(model) {
    this.app.stage.removeChildren()

    this.selectAnimation.empty()

    // 辅助函数：格式化动画名称为更友好的显示文本
    const formatAnimationDisplayName = (key) => {
      if (key === 'idle') return '空闲'
      if (key === 'home') return '主页'
      if (key.startsWith('main_')) return `主要动作 ${key.split('_')[1]}`
      // 根据需要添加更多自定义映射
      // 例如：if (key === 'login') return '登录';
      // 默认情况下，将下划线替换为空格，并首字母大写
      return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }

    model.motions.forEach((value, key) => {
      // 过滤掉 "effect" 和以 "touch_" 开头的动画
      if (key !== 'effect' && !key.startsWith('touch_')) {
        let btn = document.createElement('button')
        btn.innerHTML = formatAnimationDisplayName(key) // 使用格式化后的名称作为按钮文本
        btn.className = 'btn btn-secondary'
        btn.addEventListener('click', () => {
          this.startAnimation(key, 'base')
        })
        this.selectAnimation.append(btn)
      }
    })

    this.model = model
    this.model.update = this.onUpdate // HACK: use hacked update fn for drag support
    this.model.animator.addLayer('base', LIVE2DCUBISMFRAMEWORK.BuiltinAnimationBlenders.OVERRIDE, 1)

    this.app.stage.addChild(this.model)
    this.app.stage.addChild(this.model.masks)

    window.onresize()
  }

  onUpdate(delta) {
    let deltaTime = 0.016 * delta

    if (!this.animator.isPlaying) {
      let m = this.motions.get('idle')
      this.animator.getLayer('base').play(m)
    }
    this._animator.updateAndEvaluate(deltaTime)

    if (this.inDrag) {
      this.addParameterValueById('ParamAngleX', this.pointerX * 30)
      this.addParameterValueById('ParamAngleY', -this.pointerY * 30)
      this.addParameterValueById('ParamBodyAngleX', this.pointerX * 10)
      this.addParameterValueById('ParamBodyAngleY', -this.pointerY * 10)
      this.addParameterValueById('ParamEyeBallX', this.pointerX)
      this.addParameterValueById('ParamEyeBallY', -this.pointerY)
    }

    if (this._physicsRig) {
      this._physicsRig.updateAndEvaluate(deltaTime)
    }

    this._coreModel.update()

    let sort = false
    for (let m = 0; m < this._meshes.length; ++m) {
      this._meshes[m].alpha = this._coreModel.drawables.opacities[m]
      this._meshes[m].visible = Live2DCubismCore.Utils.hasIsVisibleBit(
        this._coreModel.drawables.dynamicFlags[m]
      )
      if (
        Live2DCubismCore.Utils.hasVertexPositionsDidChangeBit(
          this._coreModel.drawables.dynamicFlags[m]
        )
      ) {
        this._meshes[m].vertices = this._coreModel.drawables.vertexPositions[m]
        this._meshes[m].dirtyVertex = true
      }
      if (
        Live2DCubismCore.Utils.hasRenderOrderDidChangeBit(this._coreModel.drawables.dynamicFlags[m])
      ) {
        sort = true
      }
    }

    if (sort) {
      this.children.sort((a, b) => {
        let aIndex = this._meshes.indexOf(a)
        let bIndex = this._meshes.indexOf(b)
        let aRenderOrder = this._coreModel.drawables.renderOrders[aIndex]
        let bRenderOrder = this._coreModel.drawables.renderOrders[bIndex]

        return aRenderOrder - bRenderOrder
      })
    }

    this._coreModel.drawables.resetDynamicFlags()
  }

  startAnimation(motionId, layerId) {
    if (!this.model) {
      return
    }

    let m = this.model.motions.get(motionId)
    if (!m) {
      return
    }

    let l = this.model.animator.getLayer(layerId)
    if (!l) {
      return
    }

    l.play(m)
  }

  isHit(id, posX, posY) {
    if (!this.model) {
      return false
    }

    let m = this.model.getModelMeshById(id)
    if (!m) {
      return false
    }

    const vertexOffset = 0
    const vertexStep = 2
    const vertices = m.vertices

    let left = vertices[0]
    let right = vertices[0]
    let top = vertices[1]
    let bottom = vertices[1]

    for (let i = 1; i < 4; ++i) {
      let x = vertices[vertexOffset + i * vertexStep]
      let y = vertices[vertexOffset + i * vertexStep + 1]

      if (x < left) {
        left = x
      }
      if (x > right) {
        right = x
      }
      if (y < top) {
        top = y
      }
      if (y > bottom) {
        bottom = y
      }
    }

    let mouse_x = m.worldTransform.tx - posX
    let mouse_y = m.worldTransform.ty - posY
    let tx = -mouse_x / m.worldTransform.a
    let ty = -mouse_y / m.worldTransform.d

    return left <= tx && tx <= right && top <= ty && ty <= bottom
  }
}
