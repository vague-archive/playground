import path from "node:path"
import type { Request, Response } from "express"
import { dedent } from "ts-dedent"

//=================================================================================================
// CONSTANTS
//=================================================================================================

// NOTE: change this when you upgrade the version in package.json
const SDK_VERSION = "0.3.173"

//-------------------------------------------------------------------------------------------------

// NOTE: we have 2 options for transpiling, use esbuild, or use typescript directly
const TRANSPILER: "es" | "ts" = "ts"

//=================================================================================================
// SERVE A LAYOUT OR SCRIPT FILE
//=================================================================================================

export async function Serve(req: Request, res: Response) {
  const sid = req.params.sid
  const name = req.params.name
  if (name) {
    const content = await get(sid, name)
    if (content) {
      res.type("text/javascript").send(content)
    } else {
      res.status(404).send("not found")
    }
  } else {
    const content = await get(sid, "index.html")
    res.type("text/html").send(content)
  }
}

//=================================================================================================
// SAVE A (TRANSPILED) SCRIPT FILE
//=================================================================================================

export function Save(req: Request, res: Response) {
  const sid = req.params.sid
  const name = req.params.name
  const key = cacheKey(sid, name)
  const source = req.body
  transpile(sid, name, source)
    .then((contents) => {
      cache.set(key, contents)
      res.status(200).send("ok")
    })
    .catch(err => {
      if (err instanceof Error) {
        res.status(400).send(err.message)
      } else if (err instanceof String)  {
        res.status(400).send(err)
      } else {
        throw err
      }
    })
}

//=================================================================================================
// TRANSPILING
//=================================================================================================

async function transpile(sid: string, name: string, contents: string) {
  // fixup sdk imports to point to our bundles
  contents = contents
    .replace("@vaguevoid/sdk/browser", `/sdk/${SDK_VERSION}/browser.js`)
    .replace("@vaguevoid/sdk",         `/sdk/${SDK_VERSION}/sdk.js`)

  if (TRANSPILER === "ts") {
    return await tsTranspile(sid, name, contents)
  } else {
    return await esTranspile(sid, name, contents)
  }
}

//-------------------------------------------------------------------------------------------------

import esbuild from "esbuild"

async function esTranspile(sid: string, name: string, contents: string) {
  const result = await esbuild.build({
    stdin: {
      contents,
      sourcefile: `${name}.ts`,
      loader: "ts",
      resolveDir: process.cwd(),
    },
    platform: "browser",
    bundle: false,
    minify: false,
    write: false,
    format: "esm",
    logLevel: "silent",
  })
  return result.outputFiles[0].text
}

//-------------------------------------------------------------------------------------------------

import ts from "typescript"

async function tsTranspile(sid: string, name: string, contents: string) {

  const result = ts.transpileModule(contents, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      strict: true,
    },
    fileName: name,
    reportDiagnostics: true,
  });
  if (result.diagnostics && result.diagnostics.length > 0) {
    const diagnostic = result.diagnostics[0]
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    let errorMessage = `Error ${diagnostic.code}: ${message}`;
    if (diagnostic.file && diagnostic.start != null) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      const fileName = diagnostic.file.fileName;
      errorMessage += ` in ${fileName} at line ${line + 1}, character ${character + 1}`;
    }
    throw new Error(errorMessage)
  }
  return result.outputText
}

//=================================================================================================
// CACHE MANAGEMENT
//=================================================================================================

const cache = new Map<string, string>()

async function get(sid: string, name: string) {
  const key = cacheKey(sid, name)
  const content = cache.get(key) ?? (await defaultContent(sid, name))
  if (content) {
    cache.set(key, content)
  }
  return content
}

function cacheKey(sid: string, name: string) {
  return `${sid}:${path.basename(name, path.extname(name))}` // strip extension from cache key (if present)
}

//-------------------------------------------------------------------------------------------------

async function defaultContent(sid: string, name: string) {
  switch (name) {
    case "index.html":
      return defaultLayout(sid)
    case "main.ts":
      return await transpile(sid, "main.ts", defaultMain())
  }
}

function defaultLayout(sid: string) {
  return dedent`
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        padding: 0;
        margin: 0;
        overflow: hidden;
      }
    </style>
    <script type="module" src="/serve/${sid}/main.ts"></script>
  </head>
  <body>
  </body>
  </html>
  <html>
  `
}

function defaultMain() {
  return dedent`
    import { Game, hex } from "@vaguevoid/sdk"
    import { entrypoint } from "@vaguevoid/sdk/browser"
    entrypoint(new Game({}, [
      {
        paint: (painter, { screen }) => {
          painter.rect({
            x: screen.center.x,
            y: screen.center.y,
            width: screen.width/2,
            height: screen.height/2,
            color: hex("#FF0000"),
          })
        }
      },
    ]))
    console.log("no main.ts found, providing default implementation")
  `
}

//-------------------------------------------------------------------------------------------------
