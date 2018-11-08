/// !doc
/// ## helpers for multipart streams
///
/// `import { multipartReader } from 'f-streams'`
import { Reader } from '../reader';

///
/// ----
///
/// * `reader = multipartReader(reader, fields)`
///   Wraps a raw Buffer reader and returns a reader of multipart element reader.
///   Headers like content-disposition should be passed through headers arguments.
export function reader(reader: Reader<Buffer>, headers: { [key: string]: string }): Reader<Reader<Buffer>> {
    let passed = false;
    return new Reader<Reader<Buffer>>(() => {
        if (passed) {
            return;
        }
        const partReader = new Reader<Buffer>(() => {
            return reader.read();
        });
        partReader.headers = headers;
        passed = true;
        return partReader;
    });
}
