import { editorViewCtx, editorViewOptionsCtx, parserCtx } from '@milkdown/kit/core';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import { ClientMessage } from './utils/client-message';
import { Crepe } from '@milkdown/crepe';
import type { Editor } from '@milkdown/kit/core';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import { ResourceManager } from './utils/resource-manager';
import { Slice } from '@milkdown/kit/prose/model';
import { useListener } from './editor-config/listener';
import { useUploader } from './editor-config/uploader';
import { vscode } from './utils/api';
import { withMermaidPreview } from '@milkdown/plugin-mermaid-pele';

function usesDarkTheme() {
    const { classList } = document.body;
    if (classList.contains('vscode-light') || classList.contains('vscode-high-contrast-light')) {
        return false;
    }
    return classList.contains('vscode-dark') || classList.contains('vscode-high-contrast');
}

export class EditorManager {
    private editor: Editor | null = null;
    constructor(
        private message: ClientMessage,
        private readonly plugins: MilkdownPlugin | MilkdownPlugin[] = [],
    ) {}

    create = async () => {
        const state = vscode.getState();
        const crepe = new Crepe({
            root: '#app',
            defaultValue: state?.text || '',
            featureConfigs: {
                [Crepe.Feature.CodeMirror]: {
                    theme: usesDarkTheme() ? vscodeDark : vscodeLight,
                    renderPreview: withMermaidPreview(),
                    previewOnlyByDefault: true,
                },
                [Crepe.Feature.ImageBlock]: {
                    proxyDomURL: (originalUrl) => {
                        if (originalUrl.length === 0) {
                            return '';
                        }
                        const promise = ResourceManager.Instance.add(originalUrl);
                        ClientMessage.Instance.getResource(originalUrl);
                        return promise;
                    },
                    onUpload: async (file) => {
                        const readImageAsBase64 = (file: File): Promise<{ alt: string; src: string }> => {
                            return new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.addEventListener(
                                    'load',
                                    () => {
                                        resolve({
                                            alt: file.name,
                                            src: reader.result?.toString().split(',')[1] as string,
                                        });
                                    },
                                    false,
                                );
                                reader.readAsDataURL(file);
                            });
                        };
                        const { src: base64 } = await readImageAsBase64(file);
                        const url = file.name;
                        this.message.upload(url, base64);
                        return url;
                    },
                },
            },
        });
        useListener(crepe, this.message);
        const { editor } = crepe;
        editor.use(this.plugins);
        useUploader(editor, this.message);

        await crepe.create();

        this.editor = editor;

        return editor;
    };

    update = (markdown: string): boolean => {
        if (!this.editor) return false;
        const text = vscode.getState()?.text;
        if (typeof markdown !== 'string' || text === markdown) return false;

        return this.editor.action((ctx) => {
            const view = ctx.get(editorViewCtx);
            const parser = ctx.get(parserCtx);

            const doc = parser(markdown);
            if (!doc) {
                return false;
            }
            const state = view.state;
            view.dispatch(state.tr.replace(0, state.doc.content.size, new Slice(doc.content, 0, 0)));
            vscode.setState({ text: markdown });
            return true;
        });
    };
}
