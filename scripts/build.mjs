import { cp, mkdir, rm } from 'node:fs/promises';

// Sitio estático sin dependencias: los módulos y rutas relativas sirven en Pages.
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('src', 'dist/src', { recursive: true });
console.log('Build estático listo en dist/');
