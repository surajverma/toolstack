'use client';
import { forwardRef,useEffect,useImperativeHandle,useRef } from 'react';
import { EditorState,Compartment } from '@codemirror/state';
import { EditorView,keymap,lineNumbers,highlightSpecialChars,drawSelection,highlightActiveLine,highlightWhitespace } from '@codemirror/view';
import { defaultKeymap,history,historyKeymap,undo,redo } from '@codemirror/commands';
import { searchKeymap,highlightSelectionMatches } from '@codemirror/search';
import { syntaxHighlighting,HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { MergeView,goToNextChunk,goToPreviousChunk } from '@codemirror/merge';
import { checkDiffInput,type CompareMode } from '@/lib/file-diff-types';

export type DiffEditorHandle = { next: (side?: 'a' | 'b') => void; previous: (side?: 'a' | 'b') => void; undo: (side: 'a' | 'b') => void; redo: (side: 'a' | 'b') => void };
type Props = { left: string; right: string; onChange?: (side: 'a' | 'b',value: string) => void; onError: (message: string) => void; readonly?: boolean; wrap: boolean; collapse: boolean; whitespace: boolean; sync: boolean; direction: 'a-to-b' | 'b-to-a'; mode: CompareMode; syntax?: 'plain' | 'javascript' | 'json'; onStatus?: (count: number,precise: boolean) => void };
const DIFF_HIGHLIGHT = HighlightStyle.define([{ tag: tags.keyword,class: 'diff-code-keyword' },{ tag: [tags.string,tags.regexp],class: 'diff-code-string' },{ tag: [tags.number,tags.bool,tags.null],class: 'diff-code-number' },{ tag: tags.comment,class: 'diff-code-comment' },{ tag: tags.propertyName,class: 'diff-code-property' }]);
const DiffEditors = forwardRef<DiffEditorHandle,Props>(function DiffEditors(props,ref) {
  const { left,right,readonly: readOnly,wrap,collapse,whitespace,direction,mode,syntax = 'plain',onStatus } = props;
  const host = useRef<HTMLDivElement>(null); const instance = useRef<MergeView | null>(null); const current = useRef(props); const updating = useRef(false);
  const compartments = useRef([new Compartment(),new Compartment()]);
  useEffect(() => { current.current = props; });
  useImperativeHandle(ref,() => ({ next: (side = 'a') => { if (instance.current) { goToNextChunk(instance.current[side]); instance.current[side].focus(); } },previous: (side = 'a') => { if (instance.current) { goToPreviousChunk(instance.current[side]); instance.current[side].focus(); } },undo: side => { if (instance.current) undo(instance.current[side]); },redo: side => { if (instance.current) redo(instance.current[side]); } }),[]);
  useEffect(() => {
    const extensions = (side: 'a' | 'b',index: number) => [
      EditorState.lineSeparator.of('\n'),lineNumbers(),highlightSpecialChars(),drawSelection(),highlightActiveLine(),history(),keymap.of([...defaultKeymap,...historyKeymap,...searchKeymap]),highlightSelectionMatches(),syntaxHighlighting(DIFF_HIGHLIGHT),
      EditorView.contentAttributes.of({ 'aria-label': side === 'a' ? 'Original text editor' : 'Changed text editor','spellcheck': 'false' }),
      compartments.current[index].of([]),
      EditorState.transactionFilter.of(transaction => { if (!transaction.docChanged || current.current.readonly) return transaction; try { checkDiffInput(transaction.newDoc.toString()); return transaction; } catch (error) { queueMicrotask(() => current.current.onError((error as Error).message)); return []; } }),
      EditorView.updateListener.of(update => { if (update.docChanged && !updating.current && !current.current.readonly) current.current.onChange?.(side,update.state.doc.toString()); queueMicrotask(() => { const view = instance.current; if (view) current.current.onStatus?.(view.chunks.length,view.chunks.every(chunk => chunk.precise)); }); }),
      EditorView.domEventHandlers({ scroll: (event,view) => { if (updating.current || !current.current.sync || !instance.current) return; const other = instance.current[side === 'a' ? 'b' : 'a']; if (event.target === view.scrollDOM && Math.abs(other.scrollDOM.scrollLeft - view.scrollDOM.scrollLeft) > 1) other.scrollDOM.scrollLeft = view.scrollDOM.scrollLeft; } }),
      EditorView.theme({ '&': { backgroundColor: 'var(--surface)',color: 'var(--ink)',fontSize: '14px',lineHeight: '1.6' },'.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',padding: '10px 0',minHeight: '26rem' },'.cm-scroller': { overflow: 'auto' },'.cm-gutters': { backgroundColor: 'var(--page)',color: 'var(--diff-muted)',borderColor: 'var(--line)' },'.cm-activeLine': { backgroundColor: 'var(--diff-active)' },'.cm-activeLineGutter': { backgroundColor: 'var(--diff-active)' },'.cm-cursor': { borderLeftColor: 'var(--ink)' },'.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--diff-selection) !important' },'.cm-panels': { backgroundColor: 'var(--page)',color: 'var(--ink)' },'.cm-searchMatch': { backgroundColor: '#d9770640',outline: '1px solid #d97706' } }),
    ];
    const view = new MergeView({ a: { doc: current.current.left,extensions: extensions('a',0) },b: { doc: current.current.right,extensions: extensions('b',1) },parent: host.current!,highlightChanges: true,gutter: true,revertControls: current.current.readonly ? undefined : current.current.direction,diffConfig: { scanLimit: 1000,timeout: 75 } });
    instance.current = view;
    return () => { instance.current = null; view.destroy(); };
  },[]);
  useEffect(() => {
    const view = instance.current; if (!view) return;
    updating.current = true;
    try {
      for (const [index,side] of (['a','b'] as const).entries()) {
        const editor = view[side]; const text = side === 'a' ? left : right;
        if (editor.state.doc.toString() !== text) editor.dispatch({ changes: { from: 0,to: editor.state.doc.length,insert: text } });
        editor.dispatch({ effects: compartments.current[index].reconfigure([EditorState.readOnly.of(!!readOnly),EditorView.editable.of(!readOnly),...(wrap ? [EditorView.lineWrapping] : []),...(whitespace ? [highlightWhitespace()] : []),...(mode === 'json' || syntax === 'json' ? [json()] : syntax === 'javascript' ? [javascript({ typescript: true,jsx: true })] : [])]) });
      }
      view.reconfigure({ revertControls: readOnly ? undefined : direction,renderRevertControl: () => { const button = document.createElement('button'); button.type = 'button'; button.textContent = direction === 'a-to-b' ? '→' : '←'; button.title = direction === 'a-to-b' ? 'Copy this change to right' : 'Copy this change to left'; button.setAttribute('aria-label',button.title); return button; },collapseUnchanged: collapse ? { margin: 3,minSize: 8 } : undefined });
    } finally { updating.current = false; }
    onStatus?.(view.chunks.length,view.chunks.every(chunk => chunk.precise));
  },[left,right,readOnly,wrap,collapse,whitespace,direction,mode,syntax,onStatus]);
  return <div ref={host} className={`diff-editors ${props.readonly ? 'diff-readonly' : ''}`}/>;
});
export default DiffEditors;
