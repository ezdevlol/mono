import * as Comlink from "comlink";
import { watchOptionsTransferHandler, asyncGeneratorTransferHandler } from '../rpc/serde';
import { MountArgs, MountResult } from "../types";
import { SnapshotNode } from 'memfs/snapshot';
import { CborUint8Array } from "@jsonjoy.com/json-pack/lib/cbor/types";
import { Snapshot } from "../utils";

Comlink.transferHandlers.set('asyncGenerator', asyncGeneratorTransferHandler)
Comlink.transferHandlers.set('watchOptions', watchOptionsTransferHandler)

let filesystems = [];

export const mount = async ({ buffer, mountPoint = '/' }: MountArgs): Promise<MountResult> => {
    let filesystem;

    try {
        const { fs } = await import('memfs');

        try {
            if (buffer) {
                console.log(`Mounting filesystem snapshot at [${mountPoint}]...`, buffer);
                // Convert Node Buffer to ArrayBuffer if needed
                const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
                const aligned = uint8.byteOffset === 0 && uint8.byteLength === uint8.buffer.byteLength
                    ? uint8.buffer
                    : uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
                console.log('Aligned ArrayBuffer:', aligned);

                await Snapshot.mount(aligned as CborUint8Array<SnapshotNode>, {
                    // @ts-ignore
                    fs,
                });
            } else {
                console.log('Getting storage directory...');
                // const handle = await navigator.storage.getDirectory();
                console.log('Got storage directory');

                console.log('Attempting to remove directory...');
                try {
                    // TODO: clear storage button
                    // @ts-ignore
                    // await handle.remove({ recursive: true });
                    console.log('Successfully removed directory');
                } catch (removeErr) {
                    console.error('Error removing directory:', removeErr);
                    // Continue anyway, this might not be critical
                }
            }
            console.log('Returning proxy from worker', fs);
            filesystem = Comlink.proxy({ fs });
            filesystems.push(filesystem);
        } catch (e) {
            console.error('Worker initialization failed with error:', e);
            throw e; // Make sure error propagates
        }
    } catch (e) {
        console.error('Error importing memfs:', e);
    }
    console.log('mounting fs', { buffer, mountPoint });
    return filesystem;
}

onconnect = async function (event) {
    const [port] = event.ports;
    console.log('workers/fs connected on port: ', port);
    port.addEventListener('close', () => {
        console.log('fs port closed')
    });
    Comlink.expose({ mount }, port);
}
