// exposeTime：停留N秒后放入请求队列
// forceTime：N秒内没有其他的请求则直接发起请求
// initDelay：初始延迟观察对象时长（需预留时间等待页面布局稳定）
const install = (Vue, num = 6, exposeTime = 300, forceTime = 200, initDelay = 0) => {
  const reqMaps = {}
  const startReq = (req, queue) => {
    req(queue)
    queue.length = 0
  }
  Vue.directive('multi-lazy', {
    inserted: (el, binding, vnode) => {
      const { arg, modifiers, value: reqFn } = binding
      const mapKey = Object.keys(modifiers)[0] || 'default'
      const reqInfo =
        reqMaps[mapKey] || (reqMaps[mapKey] = { queue: [], req: reqFn })
      const { flush, queue, req, clearFn } = reqInfo
      if (!clearFn) {
        // 启动垃圾处理器，防止内存泄漏
        const initClearFn = () => {
          reqMaps[mapKey] = null
        }
        vnode.context.$once('hook:beforeDestroy', initClearFn)
        reqInfo.clearFn = initClearFn
      }
      el.__arg = arg
      // 绑定收集器，方便unbind时干掉
      el.__queue = queue

      const io = new IntersectionObserver((entries) => {
        if (entries[0].intersectionRatio <= 0) {
          // 如果N秒内还没有放进队列，则取消请求
          if (el.__exposeTimer) {
            clearTimeout(el.exposeTimer)
            el.__exposeTimer = null
          }
          return
        }
        // 曝光N秒后则放到请求队列中
        el.__exposeTimer = setTimeout(() => {
          queue.push(arg)
          if (queue.length >= num) {
            startReq(req, queue)
          } else if (!flush) {
            // 直接flush掉
            reqInfo.flush = setTimeout(() => {
              if (!queue.length) return
              startReq(req, queue)
              reqInfo.flush = null
            }, forceTime)
          }
          io.disconnect()
          el.__exposeTimer = null
        }, exposeTime)
      })
      // 需要一定的延迟，防止observer收集不到当前信息
      el.__observeTimer = setTimeout(() => {
        io.observe(el)
        el.__observeTimer = null
      }, initDelay)
    },
    unbind (el) {
      // 清理掉计时器以及queue里的内容
      if (el.__observeTimer) clearTimeout(el.__observeTimer)
      if (el.__exposeTimer) clearTimeout(el.__exposeTimer)
      if (el.__queue && el.__queue.includes(el.__arg)) {
        const queueIdx = el.__queue.indexOf(el.__arg)
        el.__queue.splice(queueIdx, 1)
      }
    }
  })
}
export default install
