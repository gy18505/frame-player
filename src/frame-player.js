import requestAnimationFrame from 'raf'
import EventEmitter from 'eventemitter3'

export default class FramePlayer extends EventEmitter {
  static get version () {
    return process.env.VERSION
  }

  constructor ({canvas = 'canvas', width = 0, height = 0, images = [], fps = 24, loop = 0, alternate = false, transparent = false, autoPlay = false} = {}) {
    super()
    if (typeof canvas === 'string') {
      canvas = document.querySelector(canvas)
    }
    this._ctx2d = canvas.getContext('2d')
    canvas.setAttribute('width', width)
    canvas.setAttribute('height', height)
    this._width = width
    this._height = height
    this._startFrame = 0
    this._endFrame = images.length - 1
    this._currentFrame = 0
    this._fps = fps
    this._loop = loop
    this._alternate = alternate
    this._transparent = transparent
    this._isPlay = false
    this._times = 0
    this._timestamp = 0
    this._autoPlay = autoPlay
    this._frames = this._load(images)
  }

  get frame () {
    return this._currentFrame
  }

  play (desc = false) {
    if (this._isPlay) {
      return
    }
    this._isPlay = true
    this._continue = false
    this._desc = desc
    this.emit('play')
    this._tick()
  }

  stop (frame) {
    this._isPlay = false
    requestAnimationFrame.cancel(this._rafId)
    this._times = 0
    this._draw(frame)
    this.emit('stop')
  }

  _load (images) {
    let count = 0
    let length = images.length
    return images.map(src => {
      const image = new Image()
      image.onload = () => {
        this.emit('loading', {
          count: ++count,
          total: length
        })
        if (count >= length) {
          this.emit('ready')
          if (this._autoPlay) {
            this.play()
          }
        }
      }
      image.src = src
      return image
    })
  }

  _tick () {
    const timestamp = new Date().getTime()
    if (timestamp - this._timestamp >= 1000 / this._fps) {
      this._timestamp = timestamp
      this._update()
    }
    this._rafId = requestAnimationFrame(() => this._tick())
  }

  _update () {
    if (!this._isPlay) {
      return
    }
    this._draw(this._currentFrame)
    if ((this._currentFrame === this._endFrame || this._currentFrame === this._startFrame) && this._continue) {
      if (this._loop && (this._times + 1 < this._loop || this._loop === -1)) {
        const [minFrame, maxFrame] = [this._startFrame, this._endFrame].sort()
        if (this._alternate) {
          this._currentFrame = this._desc ? minFrame + 1 : maxFrame - 1
          this._desc = !this._desc
        } else {
          this._continue = false
          this._currentFrame = this._desc ? maxFrame : minFrame
        }
        this._times++
      } else {
        this.stop()
      }
    } else {
      this._currentFrame += this._desc ? -1 : 1
      this._continue = true
    }
  }

  _draw (frame) {
    if (typeof frame !== 'number') {
      return
    }
    if (frame < 0) {
      frame = 0
    }
    if (frame > this._endFrame) {
      frame = this._endFrame
    }
    this._currentFrame = frame
    if (this._transparent) {
      this._ctx2d.clearRect(0, 0, this._width, this._height)
    }
    this._ctx2d.drawImage(this._frames[frame], 0, 0, this._width, this._height)
    this.emit('update', {
      frame,
      times: this._times + 1,
      desc: this._desc
    })
  }
}
