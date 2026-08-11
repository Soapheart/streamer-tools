import { app } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { access, mkdir, writeFile, rm } from 'fs/promises';

const APP_AUTOSTART_ID = 'streamer-tools';

function getLinuxAutostartPath(): string {
    return path.join(os.homedir(), '.config', 'autostart', `${APP_AUTOSTART_ID}.desktop`);
}

function getLinuxDesctopEntry(): string {
    const execPath = process.env.APPIMAGE || process.execPath;
    return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Streamer Tools',
    'Comment=Streamer Tools Autostart Entry',
    `Exec=${execPath}`,
    'Terminal=false',
    'Hidden=false',
    'NoDisplay=false',
    'X-GNOME-Autostart-enabled=true',
    '',
    ].join('\n');
}

export async function isStartWithSystemEnabled(): Promise<boolean> {
    if (process.platform === 'linux') {
        try{
            await access(getLinuxAutostartPath());
            return true;
        }catch{
            return false;
        }
    }
    return app.getLoginItemSettings().openAtLogin;
}

export async function setStartWithSystem(enabled: boolean): Promise<void> {
    if (process.platform === 'linux') {
        const autostartPath = getLinuxAutostartPath();

        if (enabled) {
            await mkdir(path.dirname(autostartPath), { recursive: true });
            await writeFile(autostartPath, getLinuxDesctopEntry(), 'utf-8');
        } else {
            await rm(autostartPath, { force: true });
        }
    return;
    }

    if (process.platform === 'win32' || process.platform === 'darwin'){
        app.setLoginItemSettings({
            openAtLogin: enabled,
            path: process.execPath,
            args: app.isPackaged ? [] : [app.getAppPath()],

            // openAsHidden для macOS
            // openAsHidden: false,
        });

        return;
    }
    console.warn(`Autostart is not supported on platform: ${process.platform}`);
}