# multi-lazy
a multi-lazy load directive of vue
1、基于Intersection Observer，当dom可见时才发起请求
2、会将N秒内的可见节点放进队列中，或者当请求队列超过M时也会直接发起请求
3、如果当前dom节点暴露时长小于O时，则会忽略该次请求
