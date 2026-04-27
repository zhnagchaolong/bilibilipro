import { ref, computed, type Ref, watch } from 'vue'

interface DraggablePanelApi {
  panelStyle: Ref<{ left: string; top: string; transform: string }>
  startDrag: (e: MouseEvent) => void
}

// ✨ 修改：不再返回 panelRef，而是接收一个 Ref
export function useDraggablePanel(panelRef: Ref<HTMLElement | null>): DraggablePanelApi {
  const position = ref({ x: 0, y: 0, isInitial: true })

  const panelStyle = computed(() => ({
    left: position.value.isInitial ? '50%' : `${position.value.x}px`,
    top: position.value.isInitial ? '50%' : `${position.value.y}px`,
    transform: position.value.isInitial ? 'translate(-50%, -50%)' : 'none'
  }))

  // 监视 panelRef 是否有值
  watch(panelRef, (el) => {
    if (!el) return // 如果元素被销毁，则停止

    // 如果是第一次挂载，并且位置是初始的，可以做一些初始化
    if (position.value.isInitial) {
      // (可选) 如果需要打开时就计算一次位置，可以在这里做
    }
  })

  const startDrag = (e: MouseEvent): void => {
    e.preventDefault()
    const el = panelRef.value // ✨ 直接使用传入的 panelRef
    if (!el) return

    if (position.value.isInitial) {
      const rect = el.getBoundingClientRect()
      position.value.x = rect.left
      position.value.y = rect.top
      position.value.isInitial = false
    }

    const shiftX = e.clientX - position.value.x
    const shiftY = e.clientY - position.value.y

    const onMouseMove = (moveEvent: MouseEvent): void => {
      let newX = moveEvent.clientX - shiftX
      let newY = moveEvent.clientY - shiftY

      const rect = el.getBoundingClientRect() // 实时获取尺寸
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height
      if (newX < 0) newX = 0
      if (newY < 0) newY = 0
      if (newX > maxX) newX = maxX
      if (newY > maxY) newY = maxY

      position.value.x = newX
      position.value.y = newY
    }

    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // ✨ 不再返回 panelRef
  return { panelStyle, startDrag }
}
