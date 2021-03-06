import * as fs from 'fs';
import * as fsp from 'path';

const glob: any = typeof global === 'object' ? global : window;
const secret = '_6522f20750bf404ea2fbccd561613115';
const factories = (glob[secret] = glob[secret] || {
    // standard factories
    console: './devices/console',
    http: './devices/http',
    https: './devices/http',
    file: './devices/file',
    string: './devices/string',
});

export interface PackageFactory {
    protocol: string;
    module: string;
}

function scanDirs(dir: string) {
    function tryPackage(pkgPath: string, fromDir?: string) {
        if (!fs.existsSync(pkgPath)) return;
        try {
            // add factories from package.json
            const pk = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pk && pk.f && pk.f.factories) {
                pk.f.factories.forEach((crt: PackageFactory) => {
                    if (crt.protocol && crt.module) {
                        factories[crt.protocol] = fromDir
                            ? crt.module.replace(/^.*([\\\/])/, fromDir + '$1')
                            : crt.module;
                    }
                });
            }
        } catch (e) {
            console.error(e.message);
        }
    }
    const ndir = fsp.join(dir, '../node_modules');
    if (fs.existsSync(ndir)) {
        fs.readdirSync(ndir).forEach(pkg => {
            tryPackage(fsp.join(ndir, pkg, 'package.json'));
        });
    }
    const d = fsp.join(dir, '..');
    // try also package.json inside parent directory - for travis-ci
    tryPackage(fsp.join(d, 'package.json'), d);
    if (d.length < dir.length) scanDirs(d);
}

scanDirs(__dirname);

export default function(url: string) {
    const parts = (url || '').split(':');
    if (parts.length < 2) throw new Error('invalid URL: ' + url);
    const pp = parts[0];
    if (!pp) throw new Error('Missing protocol in url: ' + url);
    if (!factories[pp]) throw new Error('Missing factory for protocol ' + pp);
    //
    return require(factories[pp]).factory(url);
}
