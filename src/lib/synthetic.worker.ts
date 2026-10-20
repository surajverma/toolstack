import { generateSynthetic } from './synthetic-data';
self.onmessage = event => { try { self.postMessage({ result: generateSynthetic(event.data.tables,event.data.seed) }); } catch (error) { self.postMessage({ error: (error as Error).message }); } };
