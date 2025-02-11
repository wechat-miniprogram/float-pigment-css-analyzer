import path from 'node:path'
import * as vscode from 'vscode'
import assert from 'assert'

const EXTENSION_DIR = path.resolve(__dirname, '..', '..')
const TEST_FIXTURE_DIR = path.resolve(EXTENSION_DIR, 'test-fixture')
const DIAGNOSTIC_SOURCE = 'float-pigment-css-analyzer'

const getUri = (rel: string) => {
  const absPath = path.resolve(TEST_FIXTURE_DIR, rel)
  const uri = vscode.Uri.file(absPath)
  return uri
}

// const diagChangeCallbacks: ((uris: readonly vscode.Uri[]) => void)[] = []
// vscode.languages.onDidChangeDiagnostics((e) => {
//   // eslint-disable-next-line @typescript-eslint/no-floating-promises, promise/catch-or-return
//   vscode.window.showInformationMessage('!!!')
//   diagChangeCallbacks.forEach((f) => f(e.uris))
// })
const waitDiagnosticsUpdate = (uri: vscode.Uri, source: string): Promise<void> =>
  new Promise((resolve) => {
    const diag = vscode.languages.getDiagnostics(uri).find((diag) => diag.source === source)
    if (diag) {
      resolve()
      return
    }
    // const cb = (uris: readonly vscode.Uri[]) => {
    //   if (uris.includes(uri)) {
    //     const diag = vscode.languages.getDiagnostics(uri).find((diag) => diag.source === source)
    //     if (diag) {
    //       const index = diagChangeCallbacks.indexOf(cb)
    //       diagChangeCallbacks.splice(index, 1)
    //       resolve()
    //     }
    //   }
    // }
    // diagChangeCallbacks.push(cb)
    const cb = () => {
      const diag = vscode.languages.getDiagnostics(uri).find((diag) => diag.source === source)
      if (diag) {
        resolve()
        return
      }
      setTimeout(cb, 100)
    }
    setTimeout(cb, 100)
  })

suite('common', () => {
  test('diagnostics for CSS', async () => {
    const uri = getUri('components/index.css')
    await vscode.window.showTextDocument(uri)
    await waitDiagnosticsUpdate(uri, DIAGNOSTIC_SOURCE)
    const diagList = vscode.languages
      .getDiagnostics(uri)
      .filter((diag) => diag.source === DIAGNOSTIC_SOURCE)
    assert.equal(diagList.length, 1)
  })
})
