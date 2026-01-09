// gulpfile.js (ESM)

// --- Módulos de Node ---
import path from 'path';
import fs from 'fs';

// --- Dependencias externas ---
import { glob } from 'glob';
import sharp from 'sharp';

// --- Gulp y plugins ---
import { src, dest, watch, series } from 'gulp';
import * as sass from 'sass';
import gulpSass from 'gulp-sass';
import fileInclude from 'gulp-file-include';
import terser from 'gulp-terser';
import plumber from 'gulp-plumber'; // para que no se rompa el watch en errores

const sassCompiler = gulpSass(sass);

// ============================
//  JS
// ============================
export function js() {
  return src('src/js/**/*.js') // <-- ahora compila todos los JS
    .pipe(plumber())
    .pipe(terser()) // minifica JS
    .pipe(dest('build/js'));
}


// ============================
//  LENGUAJES / JSON
// ============================
export function languages() {
  return src('src/languages/*.json')
    .pipe(plumber())
    .pipe(dest('build/languages'));
}

// ============================
//  SVG
// ============================
export function svg() {
  return src('src/img/*.svg')
    .pipe(plumber())
    .pipe(dest('build/img'));
}

// ============================
//  SCSS → CSS
// ============================
export function css() {
  return src('src/scss/app.scss', { sourcemaps: true })
    .pipe(plumber())
    .pipe(
      sassCompiler({ outputStyle: 'compressed' })
        .on('error', sassCompiler.logError)
    )
    .pipe(dest('build/css', { sourcemaps: '.' }));
}

// ============================
//  HTML con file-include
// ============================
export function html() {
  return src('src/*.html')
    .pipe(plumber())
    .pipe(
      fileInclude({
        prefix: '@@',
        basepath: '@file',
      })
    )
    .pipe(dest('build'));
}

// ============================
//  Archivos estáticos (robots, sitemap…)
// ============================
export function staticFiles() {
  return src(['src/robots.txt', 'src/sitemap.xml'])
    .pipe(plumber())
    .pipe(dest('build'));
}

// ============================
//  Recorte de imágenes (thumbnails)
// ============================
export function crop() {
  const inputFolder = 'src/img/gallery/full';
  const outputFolder = 'src/img/gallery/thumb';

  const width = 250;
  const height = 180;

  if (!fs.existsSync(inputFolder)) {
    // Si no existe la carpeta de origen, no hay nada que hacer
    return Promise.resolve();
  }

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const images = fs
    .readdirSync(inputFolder)
    .filter((file) => /\.(jpg)$/i.test(path.extname(file)));

  const tasks = images.map((file) => {
    const inputFile = path.join(inputFolder, file);
    const outputFile = path.join(outputFolder, file);

    return sharp(inputFile)
      .resize(width, height, {
        position: 'centre',
      })
      .toFile(outputFile);
  });

  return Promise.all(tasks);
}

// ============================
//  Procesar imágenes → jpg/png + webp + avif
// ============================

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

  // Devolvemos una Promesa para que Gulp pueda esperar a que termine
  return sharp(file)
    .metadata()
    .then((meta) => {
      console.log(`Processing file: ${file}, hasAlpha: ${meta.hasAlpha}`);

      if (extName.toLowerCase() === '.png') {
        // Mantener transparencia en PNG
        return sharp(file)
          .toFormat('png', { compressionLevel: 9, force: true })
          .toFile(outputFile);
      } else {
        // JPG u otros: generamos jpg (o mantiene ext), webp y avif
        const tareas = [
          sharp(file).jpeg(options).toFile(outputFile),
          sharp(file).webp(options).toFile(outputFileWebp),
          sharp(file).avif().toFile(outputFileAvif),
        ];
        return Promise.all(tareas);
      }
    });
}

export async function imagenes() {
  const srcDir = './src/img';
  const buildDir = './build/img';

  const images = await glob('./src/img/**/*.{jpg,png}');

  if (!images.length) {
    return;
  }

  const tasks = images.map((file) => {
    const relativePath = path.relative(srcDir, path.dirname(file));
    const outputSubDir = path.join(buildDir, relativePath);
    return procesarImagenes(file, outputSubDir);
  });

  return Promise.all(tasks);
}

// ============================
//  DEV: watch
// ============================
export function dev() {
  watch('src/scss/**/*.scss', css);
  watch('src/js/**/*.js', js);
  watch('src/img/**/*.{png,jpg}', imagenes);
  watch('src/img/*.svg', svg);
  watch('src/languages/*.json', languages);
  watch('src/**/*.html', html);
  watch('src/*.{txt,xml,json,ico}', staticFiles);
}

// ============================
//  Tarea por defecto
// ============================
export default series(
  crop,        // genera thumbnails
  js,
  css,
  svg,
  languages,
  imagenes,    // procesa imágenes al inicio
  html,
  staticFiles,
  dev          // se queda escuchando cambios
);
