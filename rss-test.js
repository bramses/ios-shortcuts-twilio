let Parser = require('rss-parser');
let parser = new Parser(
    {
        customFields: {
          item: ['media:content'],
        }
      }
);

(async () => {

  let feed = await parser.parseURL('https://www.bramadams.dev/blog/rss/');
  console.log(feed.title);

  feed.items.forEach(item => {
    console.log(item.title + ':' + item.link)
    console.log(item)
  });

})();