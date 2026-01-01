// Script to push project files to GitHub
import { createMultipleFiles, getRepository, getAuthenticatedUser } from './github';
import * as fs from 'fs';
import * as path from 'path';

const OWNER = 'agclickon';
const REPO = 'forgeai';
const BRANCH = 'main';

// Files and directories to include
const includePatterns = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'drizzle.config.ts',
  'postcss.config.js',
  'components.json',
  '.replit',
  'replit.nix',
  'replit.md',
  'design_guidelines.md',
  'client/index.html',
  'client/src/**/*.ts',
  'client/src/**/*.tsx',
  'client/src/**/*.css',
  'server/**/*.ts',
  'shared/**/*.ts',
];

// Files and directories to exclude
const excludePatterns = [
  'node_modules',
  '.git',
  '.cache',
  'dist',
  '.replit',
];

function shouldExclude(filePath: string): boolean {
  return excludePatterns.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dir: string, baseDir: string = ''): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(baseDir, entry.name);
      
      if (shouldExclude(relativePath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath, relativePath));
      } else if (entry.isFile()) {
        // Only include relevant file types
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.json', '.css', '.md', '.html', '.nix'].includes(ext) || 
            entry.name === '.replit') {
          files.push(relativePath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

export async function pushToGitHub() {
  try {
    console.log('Authenticating with GitHub...');
    const user = await getAuthenticatedUser();
    console.log(`Authenticated as: ${user.login}`);
    
    console.log(`\nChecking repository: ${OWNER}/${REPO}`);
    try {
      const repo = await getRepository(OWNER, REPO);
      console.log(`Repository found: ${repo.full_name}`);
    } catch (error: any) {
      if (error.status === 404) {
        console.error(`Repository ${OWNER}/${REPO} not found. Please create it first on GitHub.`);
        return { success: false, error: 'Repository not found' };
      }
      throw error;
    }
    
    console.log('\nCollecting project files...');
    const workspaceDir = '/home/runner/workspace';
    const allFiles = getAllFiles(workspaceDir);
    
    console.log(`Found ${allFiles.length} files to upload`);
    
    // Read file contents
    const filesToUpload: Array<{ path: string; content: string }> = [];
    
    for (const filePath of allFiles) {
      try {
        const fullPath = path.join(workspaceDir, filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        filesToUpload.push({ path: filePath, content });
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
      }
    }
    
    console.log(`\nUploading ${filesToUpload.length} files to ${OWNER}/${REPO}...`);
    
    // Split into batches of 100 files (GitHub API limit)
    const batchSize = 100;
    for (let i = 0; i < filesToUpload.length; i += batchSize) {
      const batch = filesToUpload.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(filesToUpload.length / batchSize);
      
      console.log(`Uploading batch ${batchNum}/${totalBatches} (${batch.length} files)...`);
      
      await createMultipleFiles(
        OWNER,
        REPO,
        batch,
        `ForgeAI: Upload batch ${batchNum}/${totalBatches} - ${new Date().toISOString()}`,
        BRANCH
      );
    }
    
    console.log('\nAll files uploaded successfully!');
    console.log(`View repository: https://github.com/${OWNER}/${REPO}`);
    
    return { 
      success: true, 
      filesUploaded: filesToUpload.length,
      repository: `https://github.com/${OWNER}/${REPO}`
    };
    
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    return { success: false, error: String(error) };
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('push-to-github.ts');
if (isMainModule) {
  pushToGitHub().then(result => {
    console.log('\nResult:', result);
    process.exit(result.success ? 0 : 1);
  });
}
