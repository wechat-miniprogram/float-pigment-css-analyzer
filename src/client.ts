/* eslint-disable class-methods-use-this */

import path from 'node:path'
import * as vscode from 'vscode'
import { StyleSheetResource } from 'float-pigment-css'

type CompilationError = {
  message: string
  startLine: number
  startCol: number
  endLine: number
  endCol: number
}

export const enum EnabledCondition {
  Renderer = 'renderer',
  Always = 'always',
  Never = 'never',
}

export class Client {
  enabledCond = EnabledCondition.Renderer
  renderer: string[] = []
  enabledForCss = false
  collection = vscode.languages.createDiagnosticCollection('float-pigment-css')

  setEnabledCondition(cond: EnabledCondition, renderer: string[]) {
    this.enabledCond = cond
    this.renderer = renderer
  }

  setEnabledForCss(x: boolean) {
    this.enabledForCss = x
  }

  private checkRenderer(content: Uint8Array): boolean {
    try {
      const s = new TextDecoder().decode(content)
      const json = JSON.parse(s) as { renderer?: string }
      return !!(json.renderer && this.renderer.includes(json.renderer))
    } catch {
      return false
    }
  }

  private async checkFile(uri: vscode.Uri): Promise<Uint8Array | null> {
    try {
      return vscode.workspace.fs.readFile(uri)
    } catch {
      return null
    }
  }

  private async checkFileAndRenderer(uri: vscode.Uri): Promise<boolean> {
    const content = await this.checkFile(uri)
    if (!content) return false
    return this.checkRenderer(content)
  }

  private async enabledForDoc(doc: vscode.TextDocument): Promise<boolean> {
    if (this.enabledCond === EnabledCondition.Never) return false
    if (
      doc.languageId.toLowerCase() === 'wxss' ||
      (doc.languageId.toLowerCase() === 'css' && this.enabledForCss)
    ) {
      if (this.enabledCond === EnabledCondition.Always) {
        return true
      }
      const uri = doc.uri
      const compFileName = path.basename(uri.path, path.extname(uri.path))
      const compJson = vscode.Uri.joinPath(uri, '..', `${compFileName}.json`)
      if (await this.checkFileAndRenderer(compJson)) return true
      let parent = vscode.Uri.joinPath(uri, '..', `app.json`)
      for (;;) {
        const content = await this.checkFile(parent)
        if (content) {
          return this.checkRenderer(content)
        }
        const wxss = vscode.Uri.joinPath(parent, '..', `app.wxss`)
        try {
          await vscode.workspace.fs.stat(wxss)
          break
        } catch {
          // empty
        }
        const next = vscode.Uri.joinPath(parent, '..', '..', `app.json`)
        if (next.path === parent.path) {
          break
        }
        parent = next
      }
    }
    return false
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async openOrChange(doc: vscode.TextDocument) {
    if (!(await this.enabledForDoc(doc))) return
    const uri = doc.uri
    const srcPath = uri.fsPath
    if (!srcPath) return
    const res = new StyleSheetResource()
    const src = doc.getText()
    const ret = res.addSource(srcPath, src) as CompilationError[]
    const diagList = ret.map((err) => {
      const range = new vscode.Range(err.startLine, err.startCol - 1, err.endLine, err.endCol - 1)
      const message = err.message
      const severity = vscode.DiagnosticSeverity.Warning
      const diag = new vscode.Diagnostic(range, message, severity)
      diag.source = 'float-pigment-css-analyzer'
      return diag
    })
    res.free()
    this.collection.set(uri, diagList)
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async close(doc: vscode.TextDocument) {
    if (!(await this.enabledForDoc(doc))) return
    const uri = doc.uri
    this.collection.delete(uri)
  }

  async resetAll(docs: readonly vscode.TextDocument[]) {
    this.collection.clear()
    for (const doc of docs) {
      await this.openOrChange(doc)
    }
  }
}
