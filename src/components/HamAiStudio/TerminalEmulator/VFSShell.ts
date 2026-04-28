 
import { vfs } from '../../../services/vfsService';

export const resolvePath = (cwd: string, path: string) => {
    if (path.startsWith('/')) return path;
    if (path === '.') return cwd;
    if (path === '..') {
        const parts = cwd.split('/').filter(Boolean);
        parts.pop();
        return '/' + parts.join('/');
    }
    return (cwd === '/' ? '/' : cwd + '/') + path;
};

export const processVFSCommand = async (
    cmd: string, 
    cwd: string, 
    term: any, 
    setCwd: (path: string) => void
) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    
    const args = trimmed.split(/\s+/);
    const command = args[0].toLowerCase();
    const param = args[1];
    
    try {
        switch (command) {
            case 'help':
                term.writeln('Available VFS Commands:');
                term.writeln('  ls [dir]    - List files');
                term.writeln('  cd [dir]    - Change directory');
                term.writeln('  pwd         - Print working directory');
                term.writeln('  cat [file]  - Read file content');
                term.writeln('  mkdir [dir] - Create directory');
                term.writeln('  rm [file]   - Remove file');
                term.writeln('  npm [args]  - Mock package manager');
                term.writeln('  grep [pat]  - Search in files');
                term.writeln('  clear       - Clear terminal');
                break;
            case 'npm':
                if (param === 'install' || param === 'i') {
                    term.writeln('\x1b[32mInstalling dependencies...\x1b[0m');
                    setTimeout(() => {
                        term.writeln('added 42 packages in 2s');
                        term.write(`\r\n${cwd} $ `);
                    }, 2000);
                    return true; // Indicates async operation
                }
                term.writeln('npm: command not fully implemented in VFS mode');
                break;
            case 'grep': {
                if (!param) {
                    term.writeln('usage: grep [pattern] [file]');
                    break;
                }
                const pattern = param;
                const fileParam = args[2];
                if (!fileParam) {
                    term.writeln('grep: missing file operand');
                    break;
                }
                const targetPath = resolvePath(cwd, fileParam);
                try {
                    const content = await vfs.readFile(targetPath);
                    const lines = content.split('\n');
                    const matches = lines.filter(line => line.includes(pattern));
                    matches.forEach(match => term.writeln(match));
                } catch (e) {
                    term.writeln(`grep: ${targetPath}: No such file or directory`);
                }
                break;
            }
            case 'clear':
                term.clear();
                break;
            case 'pwd':
                term.writeln(cwd);
                break;
            case 'ls': {
                const targetPath = resolvePath(cwd, param || '.');
                try {
                    const files = await vfs.readdir(targetPath);
                    term.writeln(files.join('  '));
                } catch (e) {
                    term.writeln(`ls: cannot access '${targetPath}': No such file or directory`);
                }
                break;
            }
            case 'cd': {
                const targetPath = resolvePath(cwd, param || '/');
                if (await vfs.exists(targetPath)) {
                    setCwd(targetPath);
                } else {
                    term.writeln(`cd: ${targetPath}: No such file or directory`);
                }
                break;
            }
            case 'cat': {
                if (!param) {
                    term.writeln('usage: cat [file]');
                    break;
                }
                const targetPath = resolvePath(cwd, param);
                try {
                    const content = await vfs.readFile(targetPath);
                    term.writeln(content);
                } catch (e) {
                    term.writeln(`cat: ${targetPath}: No such file or directory`);
                }
                break;
            }
            case 'mkdir': {
                if (!param) {
                    term.writeln('usage: mkdir [dir]');
                    break;
                }
                const targetPath = resolvePath(cwd, param);
                await vfs.mkdir(targetPath);
                term.writeln(`Created directory: ${targetPath}`);
                break;
            }
            case 'rm': {
                if (!param) {
                    term.writeln('usage: rm [file]');
                    break;
                }
                const targetPath = resolvePath(cwd, param);
                await vfs.deleteFile(targetPath);
                term.writeln(`Removed: ${targetPath}`);
                break;
            }
            default:
                term.writeln(`Command not found: ${command}`);
        }
    } catch (e: any) {
        term.writeln(`Error: ${e.message}`);
    }
    return false;
};
