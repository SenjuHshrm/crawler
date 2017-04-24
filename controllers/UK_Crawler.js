const async = require('async');
const osmosis = require('osmosis');
const _ = require('lodash');

const Business = require('../models/Business');

/**
 * GET /crawler/crawler
 * Renders the crawler page.
 */
exports.getCrawler = (req, res) => {
    res.render('UK/UK-page', {
        title: 'UK Crawler'
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
    let parameters = {
        city: req.query.city,
        category: req.query.category
    };

    async.parallel([
            function(callback) {
                scrapeYell(parameters, function(data) {
                    if (data.length > 0) {
                        console.log(`Yell: ${data.length} records ready for merging...`);
                        callback(null, data);
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
                return;
            }

            let page = {
                business: []
            };

            console.log(`Merging ${results.length} results...`);
            for (let i = 0; i < results.length; i++) {
                console.log(`Appending ${results[i].length} records to object...`);
                page.business = page.business.concat(results[i]);
            }

            console.log(`Parsing ${page.business.length} records to page...`);
            res.json(page);
        });
};

function scrapeYell(params, callback) {
    let category = params.category.split(' ').join('+')
    let city = params.city.split(' ').join('+');
    let url = `https://www.yell.com/ucs/UcsSearchAction.do?keywords=${category}&location=${city}`;
    console.log(`Scraping ${url}`);

    let results = [];
    let scraper = osmosis
        // .proxy([
        //     '104.128.120.187:1080',
        //     '173.255.143.184:80',
        //     '75.66.83.12:80',
        //     '216.173.157.159:10000',
        //     '166.62.97.243:18628'
        // ])
        .get(url)
        // .paginate('a.pagination--next')
        .find('div.row.businessCapsule--title div a')
        .delay(5000)
        .follow('@href')
        .delay(5000)
        .set({
            'name': 'h1.businessCapsule--title',
            'phone': 'strong.business-telephone',
            'street_address': 'span[itemprop="streetAddress"]',
            'address_locality': 'span[itemprop="addressLocality"]',
            'address_region': 'span[itemprop="addressRegion"]',
            'postal_code': 'span[itemprop="postalCode"]',
            'category': 'span[itemprop="name"]',
            'website': 'div.businessCapsule--callToAction a@href',
            'page_url': 'meta[name="og:url"]@content'
        })
        .data(function(listing) {
            // if (listing.name != undefined) {
            //     console.log(`Saving ${listing.name}...`);
            //     listing.scraper = 'Yell';
            //     listing.phone = formatPhoneUK(listing.phone);
            // }
        })
        .then(function(context, data, next) {
            if (data.name != undefined) {
                data.scraper = 'Yell';
                data.phone = formatPhoneUK(data.phone);

                let parameters = {
                    name: data.name,
                    location: data.address_locality
                };

                scrapeKompass(parameters, function(info) {
                    let merge = _.merge(data, info[0]);
                    results.push(merge);
                })

                next(context, data);
            }
        })
        .log(console.log)
        .error(console.log)
        .debug(console.log)
        .done(function() {
            callback(results);
            console.log(`Scraped ${results.length} ${category}(s) from ${city}...`)
        })
}

function scrapeKompass(params, callback) {
    name = params.name.split(' ').join('+');
    location = (params.location != undefined) ? params.location.split(' ').join('+') : '';

    let url = `http://gb.kompass.com/searchCompanies?acClassif=&localizationCode=${location}&localizationLabel=${location}&localizationType=townName&text=${name}&searchType=COMPANYNAME`;
    let results = [];

    let scraper = osmosis
        .get(url)
        .find('div.details h2 a:nth-child(1)')
        .delay(1000)
        .follow('@href')
        .set({
            'contact_person': 'p.name',
            'contact_title': 'p.fonction',
            'employee_size': 'p:contains("Company") + p',
            'business_type': 'p:contains("Type of company") + p',
        })
        .then(function(context, data) {
            results.push(data);
        })
        .log(console.log)
        .error(console.log)
        .debug(console.log)
        .done(function() {
            callback(results);
        })
}

function formatPhoneUK(value) {
    if (typeof value === 'string') {
        value === 'string' ? value.trim().replace(/[^0-9.]/g, '') : value
        value = value.split(' ').join('');
        return value.replace(/^0/, '44');

    } else {
        return value;
    }
}
