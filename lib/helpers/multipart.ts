/// !doc
/// ## helpers for multiplex readers
///
/// `import { multiplexReader } from 'f-streams'`
import { Reader } from '../reader';

///
/// ----
///
/// * `reader = multiplexReader(reader, fields)`
///   Wraps raw Buffer readers and returns a reader of multiple reader.
export function multiplexReader(readers: Reader<Buffer>[]): Reader<Reader<Buffer>> {
    let readerIndex = 0;
    return new Reader<Reader<Buffer>>(() => {
        if (readerIndex >= readers.length) {
            return;
        }
        const partReader = new Reader<Buffer>(() => {
            return readers[readerIndex].read();
        });
        partReader.headers = readers[readerIndex].headers;
        readerIndex++;
        return partReader;
    });
}

