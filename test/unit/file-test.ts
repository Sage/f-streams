import { assert } from 'chai';
import { setup } from 'f-mocha';
import { wait } from 'f-promise';
import { lsof } from 'list-open-files';
import * as fs from 'mz/fs';
import { binaryFileReader, binaryFileWriter, genericReader, textFileReader, textFileWriter } from '../..';

setup();

describe(module.id, () => {
    let tmpDir: string;
    let tmpFilePath: string;
    before(() => {
        tmpDir = wait(cb => fs.mkdtemp('/tmp/f-streams-test-', cb));
        tmpFilePath = tmpDir + '/file.data';
    });

    after(() => {
        wait(fs.rmdir(tmpDir));
    });

    function writeBinaryFile(filePath: string, nbChunk32k: number) {
        let chunkIndex = 0;
        const writer = binaryFileWriter(filePath);
        genericReader<Buffer>(() => {
            if (chunkIndex === nbChunk32k) {
                return;
            }
            chunkIndex++;
            return Buffer.alloc(32 * 1024);
        }).pipe(writer);
    }

    function writeTextFile(filePath: string, nbChunk32k: number) {
        let chunkIndex = 0;
        const writer = textFileWriter(filePath);
        genericReader<string>(() => {
            if (chunkIndex === nbChunk32k) {
                return;
            }
            chunkIndex++;
            return Buffer.alloc(32 * 1024).toString();
        }).pipe(writer);
    }

    function assertTmpFileNotOpen() {
        const openFiles = wait(lsof())[0].files;
        const tmpFileOpen = openFiles.find(file => file.name === tmpFilePath);
        assert.isUndefined(tmpFileOpen, `Temporary file ${tmpFilePath} is still open`);
    }

    describe('binaryFileWriter', () => {

        afterEach(() => {
            wait(fs.unlink(tmpFilePath));
        });

        it('end() should close fd', () => {
            writeBinaryFile(tmpFilePath, 4);

            assertTmpFileNotOpen();
        });

        it('stop() should close fd', () => {
            let chunkIndex = 0;

            const writer = binaryFileWriter(tmpFilePath);
            try {
                genericReader<Buffer>(() => {
                    if (chunkIndex === 3) {
                        throw new Error('file troncated');
                    }
                    chunkIndex++;
                    return Buffer.alloc(32 * 1024);
                }).pipe(writer);
            } catch (e) {
                writer.stop(e);
            }

            assertTmpFileNotOpen();
        });
    });

    describe('binaryFileReader', () => {
        before(() => {
            writeBinaryFile(tmpFilePath, 4);
        });

        after(() => {
            wait(fs.unlink(tmpFilePath));
        });

        it('end() should close fd', () => {
            binaryFileReader(tmpFilePath).readAll();

            assertTmpFileNotOpen();
        });

        it('stop() should close fd', () => {
            const reader = binaryFileReader(tmpFilePath);
            assert.throws(() => {
                reader.forEach((chunk: Buffer, index: number) => {
                    if (index === 1) {
                        reader.stop(new Error('read stream error'));
                        return;
                    }
                });
            }, /read stream error/);

            assertTmpFileNotOpen();
        });
    });

    describe('textFileWriter', () => {

        afterEach(() => {
            wait(fs.unlink(tmpFilePath));
        });

        it('end() should close fd', () => {
            writeTextFile(tmpFilePath, 4);

            assertTmpFileNotOpen();
        });

        it('stop() should close fd', () => {
            let chunkIndex = 0;

            const writer = textFileWriter(tmpFilePath);
            try {
                genericReader<string>(() => {
                    if (chunkIndex === 3) {
                        throw new Error('file troncated');
                    }
                    chunkIndex++;
                    return Buffer.alloc(32 * 1024).toString();
                }).pipe(writer);
            } catch (e) {
                writer.stop(e);
            }

            assertTmpFileNotOpen();
        });
    });

    describe('textFileReader', () => {
        before(() => {
            writeTextFile(tmpFilePath, 4);
        });

        after(() => {
            wait(fs.unlink(tmpFilePath));
        });

        it('end() should close fd', () => {
            textFileReader(tmpFilePath).readAll();

            assertTmpFileNotOpen();
        });

        it('stop() should close fd', () => {
            const reader = textFileReader(tmpFilePath);
            assert.throws(() => {
                reader.forEach((chunk: string, index: number) => {
                    if (index === 1) {
                        reader.stop(new Error('read stream error'));
                        return;
                    }
                });
            }, /read stream error/);

            assertTmpFileNotOpen();
        });
    });
});
