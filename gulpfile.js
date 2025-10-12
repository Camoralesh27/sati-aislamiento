import path from 'path'
import fs from 'fs'
import { glob } from 'glob'
import fileInclude from 'gulp-file-include'


import { src, dest, watch, series } from 'gulp'
import * as sass from 'sass'  // Directamente importamos 'sass' ahora
import gulpSass from 'gulp-sass'  // Usamos gulp-sass con la nueva API

const sassCompiler = gulpSass(sass)  // Pasamos 'sass' a gulp-sass para usar la nueva API

import terser from 'gulp-terser'
import sharp from 'sharp'

export function js(done) {
    src('src/js/app.js')
        .pipe(terser()) /* terser mimifica el codigo de JS */
        .pipe(dest('build/js'))

    done()
}

export function languages(done) {
    src('src/languages/*.json')
        .pipe(dest('build/languages'))
    done()
}

export function svg(done) {
    src('src/img/*.svg')
        .pipe(dest('build/img'))
    done()
}

export function css(done) {
    src('src/scss/app.scss', { sourcemaps: true })
        .pipe(sassCompiler({ outputStyle: 'compressed' }).on('error', sassCompiler.logError)) 
        .pipe(dest('build/css', { sourcemaps: '.' }))

    done();
}

export function html(done) { //compila el html por componentes 'file-include'
    src(['src/*.html'])
        .pipe(fileInclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(dest('build'))
    done()
}

export function staticFiles(done) {
    src('src/robots.txt').pipe(dest('build'));
    src('src/sitemap.xml').pipe(dest('build'));
    done();
}


export async function crop(done) {
    const inputFolder = 'src/img/gallery/full'
    const outputFolder = 'src/img/gallery/thumb';
    // aquí recorta las imágenes
    const width = 250;
    const height = 180;
    if (!fs.existsSync(outputFolder)) { //verifica que exista thumb sino crea la carpeta 
        fs.mkdirSync(outputFolder, { recursive: true })
    }
    const images = fs.readdirSync(inputFolder).filter(file => {
        return /\.(jpg)$/i.test(path.extname(file)); //revisa que sean imagenes para empezar a procesarlas
    });
    try {
        images.forEach(file => { //empieza a procesar las imagenes 
            const inputFile = path.join(inputFolder, file)
            const outputFile = path.join(outputFolder, file)
            sharp(inputFile)
                .resize(width, height, {
                    position: 'centre'
                })
                .toFile(outputFile) //lo almacena en la carpeta 
        });

        done()
    } catch (error) {
        console.log(error)
    }
}

export async function imagenes(done) {  //webp
    const srcDir = './src/img';
    const buildDir = './build/img';
    const images = await glob('./src/img/**/*.{jpg,png}')

    images.forEach(file => {
        const relativePath = path.relative(srcDir, path.dirname(file));
        const outputSubDir = path.join(buildDir, relativePath);
        procesarImagenes(file, outputSubDir);
    });
    done();
}

function procesarImagenes(file, outputSubDir) {
    if (!fs.existsSync(outputSubDir)) {
        fs.mkdirSync(outputSubDir, { recursive: true });
    }
    const baseName = path.basename(file, path.extname(file));
    const extName = path.extname(file);
    const outputFile = path.join(outputSubDir, `${baseName}${extName}`);
    const outputFileWebp = path.join(outputSubDir, `${baseName}.webp`);
    const outputFileAvif = path.join(outputSubDir, `${baseName}.avif`);

    const options = { quality: 80 };

    // Verifica metadatos de la imagen
    sharp(file)
        .metadata()
        .then((meta) => {
            console.log(`Processing file: ${file}, hasAlpha: ${meta.hasAlpha}`);

            // Si es un PNG, maneja transparencia
            if (extName.toLowerCase() === '.png') {
                sharp(file)
                    .toFormat('png', { compressionLevel: 9, force: true }) // Mantiene transparencia
                    .toFile(outputFile)
                    .then(() => console.log(`Processed PNG: ${file}`))
                    .catch((err) => console.error(`Error processing PNG: ${file}`, err));
            } else {
                // Procesa otros formatos
                sharp(file).jpeg(options).toFile(outputFile);
                sharp(file).webp(options).toFile(outputFileWebp);
                sharp(file).avif().toFile(outputFileAvif);
            }
        })
        .catch((err) => console.error(`Error retrieving metadata: ${file}`, err));
}

export function dev() {
    watch('src/scss/**/*.scss', css)
    watch('src/js/**/*.js', js)
    watch('src/img/**/*.{png,jpg}', imagenes)
    watch('src/img/*.svg', svg)
    watch('src/languages/*.json', languages)
    watch('src/**/*.html', html)
    watch('src/*.{txt,xml,json,ico}', staticFiles)

}

/* export default series (crop, js, css, svg, languages, imagenes, html, dev) */
/* export default series(js, css, svg, languages, imagenes, html, staticFiles, dev) */
export default series(js, css, svg, imagenes, html, staticFiles, dev)
/* export default series(js, css, dev) */
