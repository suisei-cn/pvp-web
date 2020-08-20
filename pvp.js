'use strict'

let control

console.log('Precise Video Playback is up. Watching for video players...')

function collectCutTiming(cutBar) {
  return [...cutBar.querySelectorAll('div > button:nth-child(1)')].map((x) =>
    Number(x.innerText)
  )
}

function createCutButton(time, videoElement) {
  const btnJump = document.createElement('button')
  const btnRemove = document.createElement('button')
  const btnContainer = document.createElement('div')
  btnJump.innerText = time
  btnRemove.innerText = 'x'
  btnJump.addEventListener('click', () => {
    videoElement.currentTime = time
  })
  btnRemove.addEventListener('click', () => {
    btnContainer.style.display = 'none'
  })
  applyStyle(btnContainer, {
    marginRight: '0.5vw',
    flexShrink: '0',
    marginTop: '3px',
  })
  btnContainer.append(btnJump, btnRemove)
  return btnContainer
}

function getVideoId(url) {
  return String(url).match(/v=([^&#]+)/)[1]
}

function applyStyle(elem, styles) {
  for (const [key, value] of Object.entries(styles)) {
    elem.style[key] = value
  }
}

function parseTime(str) {
  const hms = str.split(':')
  let time = 0
  for (const i of hms) {
    time *= 60
    time += Number(i)
    if (isNaN(time)) return -1
  }
  return time
}

function generateControl() {
  const app = document.createElement('div')
  const cutBar = document.createElement('div')
  const inputFrom = document.createElement('input')
  inputFrom.placeholder = 'from 0'
  const inputTo = document.createElement('input')
  inputTo.placeholder = 'to ...'
  const currentTime = document.createElement('span')
  const btn = document.createElement('button')
  const btnStop = document.createElement('button')
  const btnExport = document.createElement('button')
  const btnCut = document.createElement('button')
  applyStyle(app, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '700px',
    marginTop: '15px',
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '80vw',
  })
  applyStyle(cutBar, {
    display: 'flex',
    flexWrap: 'wrap',
    marginTop: '1vh',
  })
  applyStyle(currentTime, {
    fontSize: '1.3rem',
    minWidth: '8.1rem',
    textAlign: 'center',
    color: 'var(--yt-spec-text-primary)',
  })
  const inputCommonStyle = {
    width: '120px',
  }
  applyStyle(inputFrom, inputCommonStyle)
  applyStyle(inputTo, inputCommonStyle)
  btn.innerText = 'Jump'
  btnStop.innerText = 'Stop'
  btnExport.innerText = 'Export'
  btnCut.innerText = 'Cut'
  app.appendChild(inputFrom)
  app.appendChild(inputTo)
  app.appendChild(currentTime)
  app.appendChild(btn)
  app.appendChild(btnStop)
  app.appendChild(btnExport)
  app.appendChild(btnCut)
  return {
    app,
    cutBar,
    inputFrom,
    inputTo,
    currentTime,
    btn,
    btnStop,
    btnExport,
    btnCut,
  }
}

function generateFullControl(videoElement, videoId) {
  const control = generateControl()

  // States
  let fromValue = 0
  let toValue = 0
  let stopAtEndTime = false

  // Initial state update attempt
  const urlTime = window.location.hash.match(
    /#pvp([0-9]+\.?[0-9]?)-([0-9]+\.?[0-9]?)/
  )
  if (urlTime !== null) {
    console.log('Attempting to recover time from URL...')
    control.inputFrom.value = fromValue = Number(urlTime[1]) || 0
    control.inputTo.value = toValue = Number(urlTime[2]) || 0
  }

  // Current playback time
  function updateCurrentTime() {
    const currTime = videoElement.currentTime
    control.currentTime.innerText = Number(currTime).toFixed(2)
    if (stopAtEndTime && currTime >= toValue) {
      videoElement.currentTime = fromValue
    }
    requestAnimationFrame(updateCurrentTime)
  }
  requestAnimationFrame(updateCurrentTime)

  // Repeat playback
  function onTimeUpdate() {
    if (videoElement.currentTime >= Number(toValue)) {
      videoElement.currentTime = Number(fromValue)
    }
  }

  control.btn.addEventListener('click', (evt) => {
    evt.preventDefault()
    videoElement.pause()
    videoElement.currentTime = fromValue
    if (fromValue < toValue) {
      videoElement.play()
      stopAtEndTime = true
    } else {
      stopAtEndTime = false
    }
  })

  control.btnStop.addEventListener('click', (evt) => {
    evt.preventDefault()
    stopAtEndTime = false
    videoElement.pause()
  })

  control.btnCut.addEventListener('click', () => {
    const nowTime = Number(videoElement.currentTime).toFixed(2)
    const btn = createCutButton(nowTime, videoElement)
    control.cutBar.append(btn)
  })

  control.btnCut.addEventListener('contextmenu', (evt) => {
    evt.preventDefault()
    if (!control.cutBar) return
    const timings = collectCutTiming(control.cutBar)
    const newTimings = prompt(
      'This is your current cut list. Change it to import cut from others.',
      JSON.stringify(timings)
    )
    if (newTimings === null) return
    const parsedNewTimings = (() => {
      try {
        return JSON.parse(newTimings)
      } catch {
        console.warn('Failed to parse the new cut list.')
        return []
      }
    })()
    if (JSON.stringify(timings) === JSON.stringify(parsedNewTimings)) {
      console.log('No changes on the cut list.')
      return
    }
    control.cutBar.innerHTML = ''
    for (const i of parsedNewTimings) {
      const btn = createCutButton(i, videoElement)
      control.cutBar.append(btn)
    }
  })

  // Start/end time setting
  function updateURL() {
    history.pushState(null, null, `#pvp${fromValue}-${toValue}`)
  }
  control.inputFrom.addEventListener('change', () => {
    const input = control.inputFrom.value
    if (input === '') {
      fromValue = 0
      control.inputFrom.placeholder = 'from 0'
      return
    }
    const time = parseTime(input)
    if (time === -1) {
      control.btn.disabled = true
      return
    }
    control.btn.disabled = false
    fromValue = time
    updateURL()
  })
  control.inputTo.addEventListener('change', () => {
    const input = control.inputTo.value
    if (input === '') {
      toValue = videoElement.duration || 0
      control.inputTo.placeholder = `to ${toValue.toFixed(2)}`
      control.btn.innerText = 'Jump'
      return
    }
    control.btn.innerText = 'Repeat'
    const time = parseTime(input)
    if (time === -1) {
      control.btn.disabled = true
      return
    }
    control.btn.disabled = false
    toValue = time
    updateURL()
  })

  // Button export
  control.btnExport.addEventListener('click', (evt) => {
    evt.preventDefault()
    alert(`youtube-dl -f bestaudio "https://www.youtube.com/watch?v=${videoId}" \\
-x --audio-format mp3 --audio-quality 192k \\
--postprocessor-args "-ss ${fromValue} -to ${toValue} -af loudnorm=I=-16:TP=-2:LRA=11" \\
-o "output-%(id)s-${fromValue}-${toValue}.%(ext)s"`)
  })

  function setInitialDuration(dur) {
    control.inputTo.placeholder = `to ${dur.toFixed(2)}`
    const input = control.inputTo.value
    if (input !== '') return
    toValue = dur
  }

  if (videoElement.duration) {
    setInitialDuration(videoElement.duration)
  } else {
    videoElement.addEventListener('loadedmetadata', () => {
      setInitialDuration(videoElement.duration)
    })
  }

  return control
}

class mockVideo {
  constructor(player) {
    this.pl = player
  }

  get currentTime() {
    return this.pl.getCurrentTime()
  }

  set currentTime(sec) {
    this.pl.seekTo(sec, true)
  }

  get duration() {
    return this.pl.getDuration()
  }

  pause() {
    this.pl.pauseVideo()
  }

  play() {
    this.pl.playVideo()
  }

  addEventListener(name, cb) {
    switch (name) {
      case 'timeupdate': {
      }
      case 'loadedmetadata': {
        this.pl.addEventListener('onready', cb)
      }
    }
  }
}

class Pvp {
  constructor(obj) {
    this.videoId = obj.videoId // not used yet
    this.player = obj.player
    this.container = obj.container
    this.initPvp()
  }

  initPvp() {
    console.log('New video playback page found. Trying to insert the widget...')
    const anchor = this.container
    const mock = new mockVideo(this.player)
    control = generateFullControl(mock, this.videoId)
    anchor.append(control.app)
    anchor.append(control.cutBar)

    console.log(control)
  }
}
