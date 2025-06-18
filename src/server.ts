import path from "node:path"
import express from "express"
import cookieParser from "cookie-parser"
import jsonwebtoken from "jsonwebtoken"
import { Serve, Save } from "./api"
import { Logger } from "./logger"

const port = parseInt(process.env.PORT ?? "3000")
const publicDir = path.join(__dirname, "../public")
const sdkDir = path.join(__dirname, "../sdk")
const ONE_YEAR = 1000 * 60 * 60 * 24 * 365

const app = express()

app.use(Logger())
app.use(express.text())
app.use(express.static(publicDir))
app.use(cookieParser())

app.use("/sdk", express.static(sdkDir, {
  maxAge: ONE_YEAR
}))

app.get("/ping", (req, res) => res.status(200).send("pong"))
app.get("/serve/:sid/:name?", Serve)
app.post("/save/:sid/:name", Save)

app.get("/idme", async (req, res) => {
  const jwt = req.cookies["void-cloud-identity"]
  const secret = process.env.IDENTITY_COOKIE_SECRET
  if (jwt && secret) {
    const buffer = Buffer.from(secret, "base64")
    const payload = await jsonwebtoken.verify(jwt, buffer, {
      algorithms: ["HS512"],
    })
    res.status(200).send(payload)
  } else {
    res.status(404).send("you the invisible man?")
  }
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
