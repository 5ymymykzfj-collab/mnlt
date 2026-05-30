import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const regions = [
  { code: 'spb', name: 'СПБ' },
  { code: 'msk', name: 'МСК' },
  { code: 'krd', name: 'КРД' }
];

const catalog = [
  {
    id: 1,
    name: 'Молоко Простоквашино 3.2% 930 мл',
    category: 'Молочные продукты',
    prices: { spb: 98, msk: 105, krd: 92 }
  },
  {
    id: 2,
    name: 'Молоко Домик в деревне 3.2% 925 мл',
    category: 'Молочные продукты',
    prices: { spb: 92, msk: 99, krd: 88 }
  },
  {
    id: 3,
    name: 'Хлеб Бородинский 350 г',
    category: 'Хлеб и выпечка',
    prices: { spb: 58, msk: 62, krd: 52 }
  },
  {
    id: 4,
    name: 'Батон Нарезной 400 г',
    category: 'Хлеб и выпечка',
    prices: { spb: 46, msk: 50, krd: 42 }
  },
  {
    id: 5,
    name: 'Яблоки Гала 1 кг',
    category: 'Фрукты',
    prices: { spb: 145, msk: 160, krd: 118 }
  },
  {
    id: 6,
    name: 'Бананы 1 кг',
    category: 'Фрукты',
    prices: { spb: 112, msk: 125, krd: 105 }
  },
  {
    id: 7,
    name: 'Куриное филе охлажденное 1 кг',
    category: 'Мясо и птица',
    prices: { spb: 390, msk: 420, krd: 365 }
  },
  {
    id: 8,
    name: 'Фарш говяжий охлажденный 400 г',
    category: 'Мясо и птица',
    prices: { spb: 245, msk: 270, krd: 230 }
  },
  {
    id: 9,
    name: 'Рис круглозерный 900 г',
    category: 'Бакалея',
    prices: { spb: 118, msk: 125, krd: 110 }
  },
  {
    id: 10,
    name: 'Макароны Barilla Spaghetti 450 г',
    category: 'Бакалея',
    prices: { spb: 135, msk: 145, krd: 128 }
  },
  {
    id: 11,
    name: 'Сок Добрый яблочный 1 л',
    category: 'Напитки',
    prices: { spb: 96, msk: 105, krd: 90 }
  },
  {
    id: 12,
    name: 'Вода Святой Источник 1.5 л',
    category: 'Напитки',
    prices: { spb: 54, msk: 59, krd: 48 }
  }
];

const scriptedAnswers = input.isTTY ? null : (await readStdin()).split(/\r?\n/);
let scriptedAnswerIndex = 0;
const rl = input.isTTY ? readline.createInterface({ input, output }) : null;

function formatMoney(value) {
  return `${value.toFixed(2).replace('.', ',')} руб.`;
}

async function readStdin() {
  let data = '';

  for await (const chunk of input) {
    data += chunk;
  }

  return data;
}

function printRegions() {
  console.log('\nВыберите регион:');
  regions.forEach((region, index) => {
    console.log(`${index + 1}. ${region.name}`);
  });
}

function printCatalog(regionCode) {
  console.log('\nКаталог продуктов:');
  catalog.forEach((item) => {
    console.log(
      `${item.id}. ${item.name} | ${item.category} | ${formatMoney(item.prices[regionCode])}`
    );
  });
}

function buildOrder(region, item, price, offer = null) {
  return {
    createdAt: new Date().toISOString(),
    region: region.name,
    item: {
      id: item.id,
      name: item.name,
      category: item.category
    },
    price,
    offer
  };
}

function printOrder(order) {
  console.log('\nВаш заказ:');
  console.log(`Регион: ${order.region}`);
  console.log(`Товар: ${order.item.name}`);
  console.log(`Категория: ${order.item.category}`);
  console.log(`Цена: ${formatMoney(order.price)}`);

  if (order.offer) {
    console.log(`Предложение: ${order.offer.description}`);
    console.log(`Итоговая цена: ${formatMoney(order.offer.finalPrice)}`);
  }
}

async function askNumber(message, min, max) {
  while (true) {
    const answer = (await askLine(message)).trim();
    const value = Number(answer);

    if (Number.isInteger(value) && value >= min && value <= max) {
      return value;
    }

    console.log(`Введите число от ${min} до ${max}.`);
  }
}

async function askConfirmation(message) {
  while (true) {
    const answer = (await askLine(message)).trim().toLowerCase();

    if (answer === 'y' || answer === 'yes' || answer === 'д' || answer === 'да') {
      return true;
    }

    if (answer === 'n' || answer === 'no' || answer === 'н' || answer === 'нет') {
      return false;
    }

    console.log('Введите y или n.');
  }
}

async function askLine(message) {
  if (scriptedAnswers) {
    const answer = scriptedAnswers[scriptedAnswerIndex++] ?? '';
    output.write(message);
    output.write(`${answer}\n`);
    return answer;
  }

  return rl.question(message);
}

function getRetentionOffer(selectedItem, regionCode) {
  const categoryItems = catalog.filter((item) => item.category === selectedItem.category);
  const cheapestItem = categoryItems.reduce((cheapest, item) => {
    return item.prices[regionCode] < cheapest.prices[regionCode] ? item : cheapest;
  });

  const selectedPrice = selectedItem.prices[regionCode];
  const cheapestPrice = cheapestItem.prices[regionCode];

  if (cheapestItem.id === selectedItem.id) {
    const finalPrice = Number((selectedPrice * 0.95).toFixed(2));

    return {
      type: 'discount',
      description: `Вы выбрали самый дешевый товар в группе. Можем предложить скидку 5%: ${formatMoney(finalPrice)}`,
      originalPrice: selectedPrice,
      discountPercent: 5,
      finalPrice
    };
  }

  return {
    type: 'analog',
    description: `Более дешевый аналог в той же группе: ${cheapestItem.name} за ${formatMoney(cheapestPrice)}`,
    item: {
      id: cheapestItem.id,
      name: cheapestItem.name,
      category: cheapestItem.category
    },
    originalPrice: selectedPrice,
    finalPrice: cheapestPrice
  };
}

async function saveOrder(order) {
  const requestsDir = path.resolve('requests');
  await fs.mkdir(requestsDir, { recursive: true });

  const fileName = `request-${Date.now()}.json`;
  const filePath = path.join(requestsDir, fileName);

  await fs.writeFile(filePath, JSON.stringify(order, null, 2), 'utf8');
  return filePath;
}

async function main() {
  console.log('Формирование заявки на продукты питания');

  printRegions();
  const regionIndex = await askNumber('Регион: ', 1, regions.length);
  const region = regions[regionIndex - 1];

  printCatalog(region.code);
  const itemId = await askNumber('Номер товара: ', 1, catalog.length);
  const selectedItem = catalog.find((item) => item.id === itemId);
  const selectedPrice = selectedItem.prices[region.code];
  let order = buildOrder(region, selectedItem, selectedPrice);

  printOrder(order);
  let confirmed = await askConfirmation('\nОформляем заявку? (y/n): ');

  if (!confirmed) {
    const offer = getRetentionOffer(selectedItem, region.code);
    order = buildOrder(region, selectedItem, selectedPrice, offer);

    console.log('\nФинальное предложение:');
    console.log(offer.description);
    confirmed = await askConfirmation('Оформляем заявку с этим предложением? (y/n): ');
  }

  if (confirmed) {
    const filePath = await saveOrder(order);
    console.log(`\nЗаявка создана: ${filePath}`);
  } else {
    console.log('\nЗаявка не создана.');
  }
}

main()
  .catch((error) => {
    console.error(`Ошибка: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl?.close();
  });
