const fs = require('fs').promises;
const path = require('path');

async function mergeJsFiles() {
    const targetDir = './'; // Текущая папка. Измените, если нужно.
    const outputFile = 'combined.txt';

    try {
        const files = await fs.readdir(targetDir);
        const jsFiles = files.filter(file => file.endsWith('.js') && file !== outputFile && file !== 'merge.js');

        let combinedContent = '';

        for (const file of jsFiles) {
            const filePath = path.join(targetDir, file);
            const content = await fs.readFile(filePath, 'utf-8');

            combinedContent += `//==== ${file}\n${content}\n\n`;
        }

        await fs.writeFile(outputFile, combinedContent, 'utf-8');
        console.log(`Успешно! Все файлы объединены в ${outputFile}`);
    } catch (error) {
        console.error('Ошибка при обработке файлов:', error);
    }
}

mergeJsFiles();
