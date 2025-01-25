/* eslint-disable class-methods-use-this */

import * as vscode from 'vscode'
import { StyleSheetResource } from 'float-pigment-css'

type CompilationError = {
  message: string
  startLine: number
  startCol: number
  endLine: number
  endCol: number
}

export class Client {
  enabledForCss = false
  collection = vscode.languages.createDiagnosticCollection('float-pigment-css')

  setEnabledForCss(x: boolean) {
    this.enabledForCss = x
  }

  private enabledForDoc(doc: vscode.TextDocument): boolean {
    if (doc.languageId.toLowerCase() === 'wxss') return true
    if (doc.languageId.toLowerCase() === 'css' && this.enabledForCss) return true
    return false
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async openOrChange(doc: vscode.TextDocument) {
    if (!this.enabledForDoc(doc)) return
    const uri = doc.uri
    const srcPath = uri.fsPath
    if (!srcPath) return
    const res = new StyleSheetResource()
    const src = doc.getText()
    const ret = res.addSource(srcPath, src) as CompilationError[]
    const diagList = ret.map((err) => {
      const range = new vscode.Range(err.startLine, err.startCol, err.endLine, err.endCol)
      const message = err.message
      const severity = vscode.DiagnosticSeverity.Warning
      return new vscode.Diagnostic(range, message, severity)
    })
    this.collection.set(uri, diagList)
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async close(doc: vscode.TextDocument) {
    if (!this.enabledForDoc(doc)) return
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
