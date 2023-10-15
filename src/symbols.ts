// module name
import * as vscode from 'vscode';
import { DocumentSymbol } from 'vscode';

//
export async function getDocumentSymbol(uri: vscode.Uri) {
  const documentSymbol: DocumentSymbol[] = [];
  await updateDocumentTree(uri, documentSymbol);
  return documentSymbol;
}

//
export async function updateDocumentTree(uri: vscode.Uri, documentSymbol: DocumentSymbol[]) {
  // if is supported file type?
  const supportExtensions = 'mdx';
  const supportExtensionArray = supportExtensions.split(',').map((l) => l.toLowerCase());
  const fileSplitByDot = uri.fsPath.split('.');
  const targetFileType = fileSplitByDot.length > 1 ? fileSplitByDot.pop()?.toLowerCase() : '';
  if (!supportExtensionArray.includes(targetFileType ?? '')) {
    return;
  }


  const hierarchyIndexes = new Map<number, DocumentSymbol>();

  type Options = { inCode: boolean; indexingReg: RegExp; codeReg: RegExp; isHierarchy: boolean };

  // main
  await parseFile(uri, documentSymbol);

  async function parseFile(uri: vscode.Uri, documentSymbol: DocumentSymbol[]) {
    let textDocument: vscode.TextDocument | undefined;
    await vscode.workspace.openTextDocument(uri).then((document) => {
      textDocument = document;
    });

    if (!textDocument) {
      return;
    }

    const status: Options = {
      inCode: false,
      indexingReg: RegExp('^(#+)\\s*(.*)', 'i'),
      codeReg: RegExp('^```.*'),
      isHierarchy: true,
    };

    try {
      for (let line = 0; line < textDocument.lineCount; line++) {
        parseLine(textDocument, line, status, documentSymbol);
      }
    } catch (e) {
      console.log(e);
    }
  }

  function parseLine(
    document: vscode.TextDocument,
    line: number,
    status: Options,
    documentSymbol: DocumentSymbol[]
  ) {
    const textLine = document.lineAt(line);
    const codeMatches = textLine.text.match(status.codeReg);

    if (codeMatches){
      status.inCode = !status.inCode;
    }

    if (status.inCode){
      return;
    }

    const headingMatches = textLine.text.match(status.indexingReg);
    if (headingMatches && headingMatches[2]) {
      const symbol = new DocumentSymbol(
        headingMatches[2],
        '',
        vscode.SymbolKind.String,
        textLine.range,
        textLine.range
      );

      let hierarchyIndex = headingMatches[1].toString().length;
      const maxIndex = 5;
      hierarchyIndex > maxIndex && (hierarchyIndex = maxIndex);
      hierarchyIndexes.set(hierarchyIndex, symbol);

      let parentSymbol;
      for (let i = 1; i < hierarchyIndex; i++) {
        hierarchyIndexes.get(i) && (parentSymbol = hierarchyIndexes.get(i));
      }
      // add to root collections or parent
      if (parentSymbol && status.isHierarchy) {
        parentSymbol.children.push(symbol);
      } else {
        documentSymbol.push(symbol);
      }
    }
  }
}
