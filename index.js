const { Command } = require('commander');
const http = require('http');
const fs = require('fs');
const path = require('path');
const superagent = require('superagent');

const program = new Command();

program
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера', parseInt)
  .requiredOption('-c, --cache <path>', 'шлях до директорії для кешування')
  .parse(process.argv);

const { host, port, cache } = program.opts();


if (!fs.existsSync(cache)) {
  fs.mkdirSync(cache, { recursive: true });
}


const getImage = async (statusCode) => {
  try {
    const response = await superagent.get(`https://http.cat/${statusCode}`);
    return response.body;
  } catch (error) {
    return null; // Повертаємо null у разі помилки
  }
};


const server = http.createServer(async (req, res) => {
  const statusCode = req.url.slice(1); // Отримуємо код статусу з URL
  const imagePath = path.join(cache, `${statusCode}.jpg`); // Шлях до кешу

  switch (req.method) {
    case 'GET':
      
      if (fs.existsSync(imagePath)) {
        const image = await fs.promises.readFile(imagePath);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(image);
      } else {

        const image = await getImage(statusCode);
        if (image) {
          await fs.promises.writeFile(imagePath, image); // Зберігаємо в кеш
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(image);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Картинку не знайдено.');
        }
      }
      break;

    case 'PUT':
     
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', async () => {
        const imageBuffer = Buffer.concat(chunks);
        await fs.promises.writeFile(imagePath, imageBuffer);
        res.writeHead(201, { 'Content-Type': 'text/plain' });
        res.end('Картинку успішно збережено.');
      });
      break;

    case 'DELETE':

      if (fs.existsSync(imagePath)) {
        await fs.promises.unlink(imagePath);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Картинку успішно видалено.');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Картинку не знайдено для видалення.');
      }
      break;

    default:
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Метод не дозволений.');
      break;
  }
});

server.listen(port, host, () => {
  console.log(`Сервер запущено на http://${host}:${port}`);
});
