import type { Request, Response, NextFunction } from "express"

export function Logger() {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(req.method, req.path)
    next()
  }
}
