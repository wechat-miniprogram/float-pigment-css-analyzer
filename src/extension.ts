import * as vscode from 'vscode'
import { Client } from './client'

let languageServer: Client | null = null

export async function activate(context: vscode.ExtensionContext) {
  let enabled = vscode.workspace
    .getConfiguration('float-pigment-css-analyzer')
    .get('enabled') as boolean
  let enabledForCSS = vscode.workspace
    .getConfiguration('float-pigment-css-analyzer')
    .get('enabledForCSS') as boolean
  languageServer = new Client()
  languageServer.setEnabledForCss(enabledForCSS)

  // commands
  const disposable = vscode.commands.registerCommand(
    'float-pigment-css-analyzer.restart',
    async () => {
      if (!languageServer) return
      await languageServer.resetAll(vscode.workspace.textDocuments)
    },
  )
  context.subscriptions.push(disposable)

  // events
  const disposable2 = vscode.workspace.onDidChangeConfiguration(async (ev) => {
    const changed =
      ev.affectsConfiguration('float-pigment-css-analyzer.enabled') ||
      ev.affectsConfiguration('float-pigment-css-analyzer.enabledForCSS')
    if (changed) {
      enabled = vscode.workspace
        .getConfiguration('float-pigment-css-analyzer')
        .get('enabled') as boolean
      enabledForCSS = vscode.workspace
        .getConfiguration('float-pigment-css-analyzer')
        .get('enabledForCSS') as boolean
      languageServer?.setEnabledForCss(enabledForCSS)
      if (!enabled) {
        await languageServer?.resetAll([])
      } else {
        await languageServer?.resetAll(vscode.workspace.textDocuments)
      }
    }
  })
  context.subscriptions.push(disposable2)

  // open file
  const openFile = vscode.workspace.onDidOpenTextDocument(async (ev) => {
    if (!enabled) return
    await languageServer?.openOrChange(ev)
  })
  context.subscriptions.push(openFile)

  // change file
  const changeFile = vscode.workspace.onDidChangeTextDocument(async (ev) => {
    if (!enabled) return
    await languageServer?.openOrChange(ev.document)
  })
  context.subscriptions.push(changeFile)

  // open file
  const closeFile = vscode.workspace.onDidCloseTextDocument(async (ev) => {
    if (!enabled) return
    await languageServer?.close(ev)
  })
  context.subscriptions.push(closeFile)

  await languageServer.resetAll(vscode.workspace.textDocuments)
}

export async function deactivate() {
  await languageServer?.resetAll([])
  languageServer = null
}
