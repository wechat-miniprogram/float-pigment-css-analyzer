import path from 'node:path'
import * as vscode from 'vscode'
import assert from 'assert'

const EXTENSION_DIR = path.resolve(__dirname, '..', '..')
const TEST_FIXTURE_DIR = path.resolve(EXTENSION_DIR, 'test-fixture')

const getUri = (rel: string) => {
  const absPath = path.resolve(TEST_FIXTURE_DIR, rel)
  const uri = vscode.Uri.file(absPath)
  return uri
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

suite('common', () => {
  test('diagnostics for CSS', async () => {
    const uri = getUri('components/index.css')
    await vscode.window.showTextDocument(uri)
    await sleep(1000)
    const diagList = vscode.languages
      .getDiagnostics(uri)
      .filter((diag) => diag.source === 'float-pigment-css-analyzer')
    assert.equal(diagList.length, 1)
  })
})
