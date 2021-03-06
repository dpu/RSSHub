const axios = require('../../utils/axios');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const response = await axios.get('http://www.dongqiudi.com/special/48');

    const $ = cheerio.load(response.data);

    const host = 'http://www.dongqiudi.com';

    const list = $('.detail.special ul li h3')
        .slice(0, 10)
        .get();

    const proList = [];

    const out = await Promise.all(
        list.map(async (item) => {
            const $ = cheerio.load(item);
            const title = $('a').text();
            const itemUrl = host + $('a').attr('href');
            const cache = await ctx.cache.get(itemUrl);
            if (cache) {
                return Promise.resolve(JSON.parse(cache));
            }
            const single = {
                title,
                link: itemUrl,
                guid: itemUrl,
            };

            try {
                const es = axios.get(itemUrl);
                proList.push(es);
                return Promise.resolve(single);
            } catch (err) {
                console.log(`${title}: ${itemUrl} -- ${err.response.status}: ${err.response.statusText}`);
            }
        })
    );

    const responses = await axios.all(proList);
    for (let i = 0; i < responses.length; i++) {
        const $ = cheerio.load(responses[i].data);
        const full = $('div.detail');

        out[i].description = full.find('div:nth-of-type(1)').html();
        out[i].author = full.find('span.name').text();
        out[i].pubDate = new Date(full.find('span.time').text()).toUTCString();
        ctx.cache.set(out[i].link, JSON.stringify(out[i]), 24 * 60 * 60);
    }
    ctx.state.data = {
        title: '懂球帝早报',
        link: 'http://www.dongqiudi.com/special/48',
        item: out,
    };
};
