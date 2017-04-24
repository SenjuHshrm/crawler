const Xray = require('x-ray');
const async = require('async');
const osmosis = require('osmosis');
const _ = require('lodash');

const Business = require('../models/Business');

var x = Xray({
        filters: {
            trim: function(value) {
                return typeof value === 'string' ? value.trim() : value
            },
            formatString: function(value) {
                value = value.replace(/,\s*$/, '');
                return value.replace(/\w\S*/g, function(s) {
                    return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
                });
            },
            formatPhoneUK: function(value) {
                if (typeof value === 'string') {
                    value = value.trim().split(' ').join('');
                    return value.replace(/^0/, '44');
                } else {
                    return value;
                }
            },
            formatNumber: function(value) {
                return typeof value === 'string' ? value.trim().replace(/[^0-9.]/g, '') : value
            },
            formatStreet: function(value) {
                return value;
            },
            formatCity: function(value) {
                return value;
            },
            formatState: function(value) {
                return value;
            },
            formatPostal: function(value) {
                return value;
            }
        }
    })
    .timeout(600000);

/**
 * GET /crawler/crawler
 * Renders the crawler page.
 */
exports.getCrawler = (req, res) => {
    res.render('US/US-page', {
        title: 'US Crawler'
    });
};

/**
 * POST
 *
 */
exports.postData = (req, res, next) => {
    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/signup');
    }

    const data = req.body;
    const business = new Business({
        name: data.name,
        password: data.phone,
        street_address: data.street_address,
        address_locality: data.address_locality,
        address_region: data.address_region,
        postal_code: data.postal_code,
        category: data.category,
        price_range: data.price_range,
        star_rating: data.star_rating,
        review_count: data.review_count,
        website: data.website,
        email: data.email,
        contact_person: data.contact_person,
        contact_title: data.contact_title,
        page_url: data.page_url,
        scraper: data.scraper,
    });

    console.log(data);
    // Business.insertMany(req)
    //     .then(function(mongooseDocuments) {
    //         req.flash('success', {
    //             msg: 'Data has been saved.'
    //         });
    //         res.redirect('/crawler');
    //     })
    //     .catch(function(err) {
    //         req.flash('errors', {
    //             msg: 'Encountered an error.'
    //         });
    //         return res.redirect('/crawler');
    //     });
};

/**
 * GET
 * Passess a json object to #results.
 */
exports.getData = (req, res) => {
    var parameters = {
        city: req.query.city,
        state: req.query.state,
        category: req.query.category
    };

    async.parallel([
            function(callback) {
                scrapeYelp(parameters, function(data) {
                    if (data.business || data.business.length > 0) {
                        console.log(`Yelp: ${data.business.length} records ready for merging...`);
                        callback(null, data.business);
                        return;
                    }
                    callback();
                    return;;
                });
            },
            function(callback) {
                scrapeYellowpages(parameters, function(data) {
                    if (data.business || data.business.length > 0) {
                        console.log(`Yellowpages: ${data.business.length} records ready for merging...`);
                        callback(null, data.business);
                        return;
                    }
                    return;
                });
            },
            function(callback) {
                scrapeCitysearch(parameters, function(data) {
                    if (data.business || data.business.length > 0) {
                        console.log(`Yellowpages: ${data.business.length} records ready for merging...`);
                        callback(null, data.business);
                        return;
                    }
                    callback();
                    return;
                });
            }

        ],
        function(err, results) {
            if (err) {
                console.log(`Error: ${err}.`);
                res.json(results);
                return;
            }

            var page = {
                business: []
            };

            console.log(`Merging ${results.length} results...`);
            for (var i = 0; i < results.length; i++) {
                console.log(`Appending ${results[i].length} records to object...`);
                page.business = page.business.concat(results[i]);
            }

            console.log(`Parsing ${page.business.length} records to page...`);
            res.json(page);
        });
};

function scrapeYellowpages(params, callback) {
    var category = params.category.split(' ').join('+')
    var state = params.state.split(' ').join('+');
    var city = params.city.split(' ').join('+');
    var url = `https://www.yellowpages.com/search?search_terms=${category}&geo_location_terms=${city}%2C+${state}`;
    console.log(`Scraping ${url}`);

    x(url, {
        business: x('.v-card', [{
                name: '.n a',
                phone: '.phones.phone.primary | formatNumber',
                street_address: '.street-address | formatString',
                address_locality: '.locality | formatString',
                address_region: '.adr span:nth-child(3) | trim',
                postal_code: '.adr span:nth-child(4) | formatString',
                category: '.categories a | trim',
                price_range: x('.n a@href', 'dd:contains("$")'),
                star_rating: null,
                review_count: '.primary-info section a span',
                website: '.track-visit-website@href',
                email: null,
                page_url: '.n a@href',
                scraper: null
            }])
            .paginate('.next@href')
    })(function(err, data) {
        if (err) {
            console.log(`Error: ${err}.`);
            callback();
            return;
        }

        for (var i = 0; i < data.business.length; i++) {
            _.assign(data.business[i], {
                scraper: 'Yellowpages.com'
            });
        }

        if (data.business.length > 0) {
            console.log(`Yellowpages: ${data.business.length} ${params.category}(s) scraped from ${params.city} ${params.state}`);
        } else {
            console.log(`Yell: No ${params.category}(s) scraped from ${params.city} ${params.state}`);
        }
        callback(data);
    })
}

function scrapeYelp(params, callback) {
    var category = params.category.split(' ').join('+');
    var state = params.state.split(' ').join('+');
    var city = params.city.split(' ').join('+');
    var url = `https://www.yelp.com/search?find_desc=${category}&find_loc=${city}%2C+${state}`;
    console.log(`Scraping ${url}`);

    x(url, {
        business: x('.regular-search-result', [{
                name: '.biz-name span',
                phone: '.biz-phone | formatNumber',
                street_address: x('.biz-name@href', 'span[itemprop="streetAddress"]'),
                address_locality: x('.biz-name@href', 'span[itemprop="addressLocality"]'),
                address_region: x('.biz-name@href', 'span[itemprop="addressRegion"]'),
                postal_code: x('.biz-name@href', 'span[itemprop="postalCode"]'),
                category: '.category-str-list | trim',
                price_range: '.price-range',
                star_rating: 'img.offscreen@alt | formatNumber',
                review_count: '.review-count | formatNumber',
                website: x('.biz-name@href', 'span.biz-website a'),
                email: null,
                contact_person: x('.biz-name@href', '.user-display-name'),
                contact_title: x('.biz-name@href', '.business-owner-role'),
                page_url: '.biz-name@href',
                scraper: null
            }])
            .paginate('div.pagination-links a@href')
    })(function(err, data) {
        if (err) {
            console.log(`Error: ${err}.`);
            callback();
            return;
        }

        for (var i = 0; i < data.business.length; i++) {
            _.assign(data.business[i], {
                scraper: 'Yelp.com'
            });
        }

        if (data.business.length > 0) {
            console.log(`Yelp: ${data.business.length} ${params.category}(s) scraped from ${params.city} ${params.state}`);
        } else {
            console.log(`Yelp: No ${params.category}(s) scraped from ${params.city} ${params.state}`);
        }
        callback(data);
    })
}

function scrapeCitysearch(params, callback) {
    var category = params.category.split(' ').join('+');
    var state = params.state.split(' ').join('+');
    var city = params.city.split(' ').join('+');
    var url = `http://www.citysearch.com/search?what=${category}&where=${city}%2C+${state}`;
    console.log(`Scraping ${url}`);

    x(url, {
            links: x('li.naturalResult', [{
                link: 'a.clip.url@href'
            }])
        })
        (function(err, results) {
            results.forEach(function(links, link) {
                console.log(links.link)
            });
        });
}
