import dedent from "https://esm.sh/dedent@1.5.3"
import debounce from "https://esm.sh/debounce@2.0.0"
import { nanoid } from "https://esm.sh/nanoid@5.0.7"

const sid = nanoid()

const preview = document.getElementById("preview")
const errorsMain = document.getElementById("errors-main")
const errorsOther = document.getElementById("errors-other")

const CHANGE_DEBOUNCE = 200 // milliseconds

//=================================================================================================
// SETUP EDITORS
//=================================================================================================

const editorMain = CodeMirror.fromTextArea(document.getElementById("editor-main"), {
  lineNumbers: true,
  mode: "javascript"
})

const editorOther = CodeMirror.fromTextArea(document.getElementById("editor-other"), {
  lineNumbers: true,
  mode: "javascript"
})

editorMain.setValue(dedent`
  import { Game, hex } from "@vaguevoid/sdk"
  import { entrypoint } from "@vaguevoid/sdk/browser"

  import { Ball, updateBall, randomBall } from "./ball"

  const state = {
    count: 10,                  // CHANGE ME
    speed: 10,                  // CHANGE ME
    background: hex("#8D89A6"), // CHANGE ME
    balls: [] as Ball[]
  }

  entrypoint(new Game(state, [
    {
      start: (state, { screen }) => {
        for (let n = 0 ; n < state.count ; n++)
          state.balls.push(randomBall(screen))

        state.balls.push(randomBall(screen, {
          radius: 50,            // CHANGE ME
          color: hex("#FF0000"), // CHANGE ME
        }))
      },

      update: (state, { screen }) => {
        state.balls.forEach((b) => updateBall(b, state.speed, screen))
      },

      paint: (painter, { state, screen }) => {
        painter.rect({...screen, color: state.background })
        state.balls.forEach((b) => painter.circle(b))
      }
    },
  ]))`
)

editorOther.setValue(dedent`
  import { Color, Random, Rect, hex } from "@vaguevoid/sdk"

  export interface Ball {
    x: number
    y: number
    dx: number
    dy: number
    radius: 0
    color: Color
  }

  const colors = [
    hex("#EAC8CA"),
    hex("#F2D5F8"),
    hex("#E6C0E9"),
    hex("#BFABCB"),
  ]

  export function randomBall(screen: Rect, options?: Partial<Ball>) {
    const point = screen.width/1000
    const radius = options?.radius ?? (point * Random.int(20, 60))
    return {
      radius,
      x: options?.x ?? Random.int(screen.left + radius, screen.right - radius),
      y: options?.y ?? Random.int(screen.top + radius, screen.bottom - radius),
      dx: options?.dx ?? Random.number(-point, point),
      dy: options?.dy ?? Random.number(-point, point),
      color: options?.color ?? Random.pickOne(colors),
    }
  }

  export function updateBall(ball: Ball, speed: number, screen: Rect) {
    ball.x = ball.x + (speed * ball.dx)
    ball.y = ball.y + (speed * ball.dy)
    if ((ball.dx > 0 && (ball.x + ball.radius > screen.right)) ||
        (ball.dx < 0 && (ball.x - ball.radius < screen.left))) {
      ball.dx = -ball.dx
    }
    if ((ball.dy > 0 && (ball.y + ball.radius > screen.bottom)) ||
        (ball.dy < 0 && (ball.y - ball.radius < screen.top))) {
      ball.dy = -ball.dy
    }
  }
`)

//=================================================================================================
// SAVE HANDLERS
//=================================================================================================

async function save(name, editor, errors) {
  const result = await fetch(`/save/${sid}/${name}`, {
    method: "POST",
    body: editor.getValue(),
  })
  if (result.status === 200) {
    preview.contentWindow.location.reload()
    errors.style.display = "none"
  } else if (result.status === 400) {
    errors.style.display = "block"
    errors.innerText = await result.text()
  }
}

async function saveMain() {
  await save("main.ts", editorMain, errorsMain)
}

async function saveOther() {
  await save("ball.ts", editorOther, errorsOther)
}

//=================================================================================================
// FIRST TIME SAVE
//=================================================================================================

await saveMain()
await saveOther()

editorMain.on("change", debounce(saveMain, CHANGE_DEBOUNCE))
editorOther.on("change", debounce(saveOther, CHANGE_DEBOUNCE))

//=================================================================================================
// LOAD IFRAME AFTER INITIAL SAVE
//=================================================================================================

preview.src = `/serve/${sid}`

