let scoreElement = document.getElementById('score')
let highScoreElement = document.getElementById('hi-score')
let gamecontainer = document.querySelector('.game-container')
let basket = document.getElementById('basket')
let action = document.getElementById('actions')

let score = 0
let gameMode = "play"

let highScore = localStorage.getItem('high-score') || 0
highScoreElement.innerText = `High-Score : ${highScore}`

function checkgamemode() {
  if (gameMode == "play") {
    gameMode = "pause"
    action.innerText = "Play"
  }
  else if (gameMode == "pause") {
    gameMode = "play"
    action.innerText = "Pause"
  }
}
action.addEventListener('click',checkgamemode)

document.addEventListener('mousemove',(e)=>{
  if (gameMode == "pause") {
    return
  }
  let basketPosition = e.clientX - basket.offsetWidth / 2

  if (basketPosition > 0 && basketPosition <= gamecontainer.clientWidth - basket.offsetWidth) {
    basket.style.left = basketPosition + 'px'
  }
})
if (window.innerWidth <= 370) {
  document.addEventListener('touchstart',(e)=>{
    basket.style.transition = '1s left ease'
    let startX , endX
    if (gameMode == "pause") {
      return
    }
    startX = e.changedTouches[0].clientX
  })
  document.addEventListener('touchend',(e)=>{
    if (gameMode == "pause") {
      return
    }
    endX = e.changedTouches[0].clientX

    let change = startX - endX

    let basketLeft = parseInt(window.getComputedStyle('basket').left , 10) || 0

    let newPosition = basketLeft - change

    if (newPosition < 0) {
      newPosition = 0
    }
    else if (newPosition < gamecontainer.clientWidth - basket.offsetWidth) {
      basket.style.left = newPosition + 'px'
    }
  })
}

function createFallingObject(){
  if (gameMode == "pause") {
    return
  }
  let object = document.createElement('div')
  object.classList.add('falling-object')
  let random = Math.floor(Math.random() * (3-0+1) + 0)
  if (random == 3) {
    object.classList.add('bomb')
  }
  let backgrounds = ["./images/p1.png","./images/p2.png","./images/p4.png","./images/p3.png"]

  object.style.background = `url("${backgrounds[random]}")`
  object.style.left = Math.random() * (gamecontainer.clientWidth - 30) + 'px'
  object.style.top = '0px'
  object.style.backgroundPosition = 'center'
  object.style.backgroundRepeat = 'no-repeat'
  object.style.backgroundSize = 'cover'
  gamecontainer.appendChild(object)

  let falllInterval = setInterval(()=>{
    let objectTop = parseInt(window.getComputedStyle(object).getPropertyValue('top'))

    if (gameMode == "play") {
      if (score >= 100) {
        object.style.top = objectTop + 15 + 'px'
      }
      else if (score >= 50) {
        object.style.top = objectTop + 10 + 'px'
      }
      else if (score <= 50) {
        object.style.top = objectTop + 5 + 'px'
      }
    }

    if (objectTop >= gamecontainer.clientHeight - basket.offsetHeight - object.offsetHeight) {
      let objectLeft = object.offsetLeft
      let objectRight = objectLeft + object.offsetWidth
      let basketLeft = basket.offsetLeft
      let basketRight = basketLeft + basket.offsetWidth
      
      if (objectLeft < basketRight && objectRight > basketLeft) {
        if (object.classList.contains('bomb')) {
          if (score == 0) {
            score = score
          }
          else{
            score--
          }
        }
        else{
          score++
        }
        scoreElement.textContent = `Score : ${score}`
        if (score >= highScore) {
          highScore = score 
          localStorage.setItem('high-score',highScore)
          highScoreElement.innerText = `High-Score : ${highScore}`
        }
        object.remove()
        clearInterval(falllInterval)
      }
      else if(objectTop >= gamecontainer.clientHeight - object.offsetHeight){
        object.remove()
        clearInterval(falllInterval)
      }
    }
  },30)
}
setInterval(createFallingObject, 1000)