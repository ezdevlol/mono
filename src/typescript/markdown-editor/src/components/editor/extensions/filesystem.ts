import { Extension } from '@tiptap/core'
import { Fs } from '@ezdevlol/codeblock'

export interface FileSystemOptions {
    fs?: Fs
    filepath?: string
    autoSave?: boolean
}

export const FileSystem = Extension.create<FileSystemOptions>({
    name: 'persistence',
    _saveTimeout: null,

    addOptions() {
        return {
            fs: undefined,
            filepath: undefined,
            autoSave: false,
        }
    },

    onCreate() {
        const { fs, filepath } = this.options

        if (fs && filepath) {
            fs.readFile(filepath)
                .then(content => {
                    this.editor.commands.setContent(content)
                })
                .catch(error => {
                    console.warn(`[Filesystem] Failed to load content from ${filepath}:`, error)
                })
        }
    },

    onUpdate() {
        const { fs, filepath, autoSave } = this.options

        if (!fs || !filepath || !autoSave) return

        // Debounced auto-save mechanism
        // @ts-expect-error
        if (this._saveTimeout) clearTimeout(this._saveTimeout)
        // @ts-expect-error
        this._saveTimeout = setTimeout(() => {
            const markdown = this.editor.storage.markdown.getMarkdown()
            fs.writeFile(filepath, markdown).catch(error => {
                console.error(`[Filesystem] Failed to save content to ${filepath}:`, error)
            })
        }, 500) // debounce by 500ms
    },

    onDestroy() {
        // @ts-expect-error
        if (this._saveTimeout) clearTimeout(this._saveTimeout)
    },
})