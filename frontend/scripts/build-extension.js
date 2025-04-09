import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import archiver from 'archiver';

const execPromise = promisify(exec);

async function buildExtension() {
  try {
    console.log('Building extension...');
    
    // Run the build command
    await execPromise('npm run build');
    
    console.log('Creating zip file...');
    
    // Create a zip file
    const output = fs.createWriteStream(path.resolve('dist.zip'));
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    output.on('close', () => {
      console.log(`Extension zip created: ${archive.pointer()} total bytes`);
      console.log('The zip file is ready for submission to the Chrome Web Store!');
    });
    
    archive.on('error', (err) => {
      throw err;
    });
    
    archive.pipe(output);
    
    // Add the dist directory contents to the zip
    archive.directory('dist/', false);
    
    await archive.finalize();
    
  } catch (error) {
    console.error('Error building extension:', error);
    process.exit(1);
  }
}

buildExtension(); 