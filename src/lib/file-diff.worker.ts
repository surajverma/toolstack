import { compareFiles,rawDiffPatch } from './file-diff';
self.onmessage = event => { try { const { before,after,options,action } = event.data; self.postMessage(action === 'patch' ? { patch: rawDiffPatch(before,after) } : { result: compareFiles(before,after,options) }); } catch (error) { self.postMessage({ error: (error as Error).message }); } };
