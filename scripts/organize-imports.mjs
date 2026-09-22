import ts from "typescript";
import fs from "node:fs";
const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ".");
const host = {
  getScriptFileNames: () => parsed.fileNames,
  getScriptVersion: () => "0",
  getScriptSnapshot: (f) =>
    fs.existsSync(f)
      ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, "utf8"))
      : undefined,
  getCurrentDirectory: () => process.cwd(),
  getCompilationSettings: () => parsed.options,
  getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
};
const service = ts.createLanguageService(host);
for (const file of parsed.fileNames.filter((f) =>
  f.startsWith("src/features/"),
)) {
  for (const change of service.organizeImports(
    { type: "file", fileName: file },
    {},
    {},
  )) {
    let source = fs.readFileSync(change.fileName, "utf8");
    for (const edit of [...change.textChanges].sort(
      (a, b) => b.span.start - a.span.start,
    ))
      source =
        source.slice(0, edit.span.start) +
        edit.newText +
        source.slice(edit.span.start + edit.span.length);
    fs.writeFileSync(change.fileName, source);
  }
}
