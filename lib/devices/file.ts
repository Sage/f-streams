import { wait } from 'f-promise';
import * as fs from 'fs';
import { Reader } from '../reader';
import { Writer } from '../writer';
import * as generic from './generic';
import * as node from './node';

/// !doc
/// ## File based EZ streams
///
/// `import { textFileReader, textFileWriter, binaryFileReader, binaryFileWriter, directoryReader} from 'f-streams'`
///
export const text = {
    /// * `reader = textFileReader(path, encoding)`
    ///   creates a reader that reads from a text file.
    ///   `encoding` is optional. It defaults to `'utf8'`.
    reader(path: string, encoding?: string) {
        return node.reader<string>(
            fs.createReadStream(path, {
                encoding: encoding || 'utf8',
            }),
            { destroyOnStop: true },
        );
    },
    /// * `writer = textFileWriter(path, encoding)`
    ///   creates a writer that writes to a text file.
    ///   `encoding` is optional. It defaults to `'utf8'`.
    writer(path: string, encoding?: string) {
        return node.writer<string>(
            fs.createWriteStream(path, {
                encoding: encoding || 'utf8',
            }),
        );
    },
};

export const binary = {
    /// * `reader = binaryFileReader(path)`
    ///   creates a reader that reads from a binary file.
    reader(path: string) {
        return node.reader<Buffer>(fs.createReadStream(path), { destroyOnStop: true });
    },
    /// * `writer = binaryFileWriter(path)`
    ///   creates a writer that writes to a binary file.
    writer(path: string) {
        return node.writer<Buffer>(fs.createWriteStream(path));
    },
};

/// * `reader = directoryReader(path, options)`
///   `reader = directoryReader(path, recurse, accept)`
///   creates a reader that enumerates (recursively) directories and files.
///   Returns the entries as `{ path: path, name: name, depth: depth, stat: stat }` objects.
///   Two `options` may be specified: `recurse` and `accept`.
///   If `recurse` is falsy, only the entries immediately under `path` are returned.
///   If `recurse` is truthy, entries at all levels (including the root entry) are returned.
///   If `recurse` is `"postorder"`, directories are returned after their children.
///   `accept` is an optional function which will be called as `accept(entry)` and
///   will control whether files or subdirectories will be included in the stream or not.
export interface ListOptions {
    recurse?: boolean | 'preorder' | 'postorder';
    accept?: (entry: ListEntry) => boolean;
}

export interface ListEntry {
    path: string;
    name: string;
    depth: number;
    stat: fs.Stats;
}

export function list(path: string, options?: ListOptions) {
    let recurse: boolean | 'preorder' | 'postorder', accept: ((entry: ListEntry) => boolean) | undefined;
    if (options && typeof options === 'object') {
        recurse = options.recurse || false;
        accept = options.accept;
    } else {
        recurse = arguments[1];
        accept = arguments[2];
    }
    const postorder = recurse === 'postorder';
    return generic.empty.createReader().transform<ListEntry>((reader, writer) => {
        function process(p: string, name: string, depth: number) {
            const stat = wait(cb => fs.stat(p, cb));
            const entry = {
                path: p,
                name: name,
                depth: depth,
                stat: stat,
            };
            if (accept && !accept(entry)) return;
            if ((recurse || depth === 1) && !postorder) writer.write(entry);
            if ((recurse || depth === 0) && stat.isDirectory()) {
                wait(cb => fs.readdir(p, cb)).forEach((pp: string) => {
                    process(p + '/' + pp, pp, depth + 1);
                });
            }
            if ((recurse || depth === 1) && postorder) writer.write(entry);
        }

        process(path, path.substring(path.lastIndexOf('/') + 1), 0);
    });
}
