$(document).ready(function() {
    var scrapedData = [];
    var filterD121 = {
        name: '',
        phone: '',
        category: [
            'Hospitals',
            'Bakeries',
            'Restaurant',
            'Printers'
        ],
    };

    $.ajaxSetup({
      timeout: 300000
    });

    $('input[name=country]:radio').change(function() {
        var country = $('input[name=country]:checked').val();

        if (country == 'United Kingdom') {
            loadUkLocations();
            $('#USState').hide();

        } else {
            loadUsStates();
            $('#USState').show();
        }

        loadCrawlers();
    });

    $('#state').change(loadUsCities);
    $('#scrape').click(scrapeThis);
    // $('#download').click(downloadCSV);
    $('#download').click(saveData);
    $('#results > table > tbody > tr > td').bind('click', dataClick);

    function saveData() {
      $.post('/searching', scrapedData, function() {
        alert(`Stored ${scrapedData.lenght} records to the database.`);
      })
      .done(function() {
        alert('All collections saved.');
      })
      .fail(function() {
        alert('Error encountered');
      });
    }

    function dataClick(e) {
        console.log(e);
        if (e.currentTarget.contentEditable != null) {
            $(e.currentTarget).attr('contentEditable', true);

        } else {
            $(e.currentTarget).append('<input type="text">');
        }
    }

    /**
     * Get random item.
     */
    function getRandomItem(options) {
        var items = [];

        options.each(function() {
            items.push($(this).val());
        });

        return items[Math.floor(Math.random() * items.length)];
    }

    /**
     * Loads list of available website crawlers.
     */
    function loadCrawlers(e) {
        var datalist = document.getElementById('website-crawlers');
        var country = $('input[name=country]:checked').val();
        var crawlers = {
            uk: [
                'Yell'
            ],
            us: [
                'Citysearch',
                'Yellowpages',
                'Restaurantdotcom',
                'Tripdavisor',
                'Yelp'
            ]
        }

        var crawler;

        if (country == 'United States') {
            crawler = crawlers['us'];

        } else if (country == 'United Kingdom') {
            crawler = crawlers['uk'];
        }

        if (datalist.hasChildNodes()) {
            while (datalist.firstChild) {
                datalist.removeChild(datalist.firstChild);
            }
        }

        for (var i = 0; i < crawler.length; i++) {
            var option = document.createElement('option');

            option.value = crawler[i];
            datalist.appendChild(option);
        }
    }

    function loadJSON(file, callback) {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType('application/json');
        xobj.open('GET', file, true);
        xobj.onreadystatechange = function() {
            if (xobj.readyState == 4 && xobj.status == '200') {
                callback(xobj.responseText);
            }
        };
        xobj.send(null);
    }

    function loadUsStates() {
        var datalist = document.getElementById('json-states');
        var input = document.getElementById('state');

        if (datalist.hasChildNodes()) {
            while (datalist.firstChild) {
                datalist.removeChild(datalist.firstChild);
            }
        }

        loadJSON('js/usLocations.json', function(res) {
            var json = JSON.parse(res);

            json.forEach(function(item) {
                var option = document.createElement('option');

                option.value = item['region_abbrev'];
                option.text = item['region'];
                if ($(`#json-states option[value='${option.value}']`).length == 0) {
                    datalist.appendChild(option);
                }
            });
        });
    }

    /**
     * Loads list of cities in the United States.
     */
    function loadUsCities() {
        var datalist = document.getElementById('json-cities');
        var input = document.getElementById('city');
        var state = document.getElementById('state');

        if (datalist.hasChildNodes()) {
            while (datalist.firstChild) {
                datalist.removeChild(datalist.firstChild);
            }
        }

        loadJSON('js/usLocations.json', function(res) {
            var json = JSON.parse(res);

            json.forEach(function(item) {
                if (item['region_abbrev'] == state.value) {
                    var option = document.createElement('option');

                    option.value = item['locality'];
                    option.text = item['locality'];
                    if ($(`#json-cities option[value='${option.value}']`).length == 0) {
                        datalist.appendChild(option);
                    }
                }
            });
        });
    }

    /**
     * Loads list of cities in the United Kingdom.
     */
    function loadUkLocations(e) {
        var datalist = document.getElementById('json-cities');
        var input = document.getElementById('city');
        var req = new XMLHttpRequest();

        var jsonUrl = 'https://raw.githubusercontent.com/David-Haim/CountriesToCitiesJSON/master/countriesToCities.json';
        var placeholder = "e.g. Glasgow";

        req.onreadystatechange = function(res) {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    var json = JSON.parse(req.responseText);
                    var jsonOptions = json['United Kingdom'];

                    if (datalist.hasChildNodes()) {
                        while (datalist.firstChild) {
                            datalist.removeChild(datalist.firstChild);
                        }
                    }

                    jsonOptions.forEach(function(item) {
                        var option = document.createElement('option');

                        option.value = item;
                        datalist.appendChild(option);
                    });

                    input.placeholder = placeholder;
                } else {
                    input.placeholder = "Couldn't load datalist options...";
                }
            }
        };
        input.placeholder = "Loading options...";
        req.open('GET', jsonUrl, true);
        req.send();
    }

    /**
     * Start scraper function on button click.
     */
    function scrapeThis() {
        var categories = $('#category').val().split('\n');
        var parameters = {
            country: $('input[name=country]:checked').val(),
            city: $('#city').val(),
            state: $('#state').val(),
            category: ''
        };

        // var source = $("#search-results").html();
        var source = (parameters.country === 'United Kingdom') ? (source = $("#d121-results").html()) : (source = $("#search-results").html())
        var dataTemplate = Handlebars.compile(source);
        var results = $('#results');

        for (var i = 0; i < categories.length; i++) {
            parameters.category = categories[i];

            newAlert("info",
                `Scraping ${parameters.category}(s) from ${parameters.city} ${parameters.state}`);

            var scrape = $.get('/searching', parameters, function(data) {
                    if (data instanceof Object && data.business.length > 0) {
                        results.append(dataTemplate({
                            page: data
                        }));
                    } else {
                        results.append(data);
                    };

                    if (parameters.country == 'United Kingdom') {
                        data.business = filterArray(data.business, filterD121);
                    }

                    scrapedData.push(data);
                })
                .done(function(data) {
                    var type = (data.business.length > 0) ? type = 'success' : type = 'warning';

                    newAlert(type,
                        `Scraped ${data.business.length} ${parameters.category}(s) from ${parameters.city} ${parameters.state}`);

                    if ($('input[type=checkbox]:checked').length > 0) {
                        $('#state').val(getRandomItem($('#json-states > option')));
                        $('#city').val(getRandomItem($('#json-cities > option')));
                        setTimeout(scrapeThis(), 30000);

                    } else {
                        newAlert('success', `Finished scraping session...`);
                    }
                })
                .fail(function(jqXHRm, textStatus) {
                    var error = (textStatus === 'timeout') ? (error = 'Failed from timeout.') : (error = 'Error encountered while scraping.');

                    console.log(error);
                    newAlert('danger', error);
                    scrape.abort();
                    newAlert('info', 'Session Stopped.');
                });
        }
    }

    /**
     * Filter specified array to remove matched values.
     */
    function filterArray(data, filters) {
        var filteredData,
            predicates = [
                function removeNames(data) {
                    for (var i = 0; i < filters.name.length; i++)
                        if (data.name.indexOf(filters.name[i]) != -1)
                            return false;
                    return true;
                },
                function removePhone(data) {
                    for (var i = 0; i < filters.phone.length; i++)
                        if (data.phone.indexOf(filters.phone[i]) != -1)
                            return false;
                    return true;
                },
                function removeCategories(data) {
                    for (var i = 0; i < filters.category.length; i++)
                        if (data.category.indexOf(filters.category[i]) != -1)
                            return false;
                    return true;
                }
            ];

        if (!filters) {
            filteredData = data;

        } else {
            filteredData = $.grep(data, function(el, index) {
                for (var i = 0; i < predicates.length; i++) {
                    if (!predicates[i](el)) return false;
                }
                return true;
            });
        }
        return filteredData;
    }

    /**
     * Add dynamic alert on page.
     */
    function newAlert(type, message) {
        $('#alert-area').append($(`<div class="alert alert-${type} alert-dismissible show" role="alert">` +
            `<button type="button" class="close" data-dismiss="alert" aria-label="Close">` +
            `<span aria-hidden="true">&times;</span></button>` +
            `<strong>${message}</strong></div>`));

        setTimeout(function() {
            $('#alert-area').children('.alert:first-child').fadeTo(1000, 0).slideUp(500, function() {
                $(this).remove();
            });
        }, 3000);
    }

    function downloadCSV() {
        var csv = '';

        csv = Papa.unparse(scrapedData[0].business, {
            quotes: false,
            quoteChar: '"',
            delimiter: ",",
            header: true,
            newline: "\r\n"
        });

        if (scrapedData.length > 0) {
            for (var i = 1; i < scrapedData.length; i++) {
                csv += "\r\n" + Papa.unparse(scrapedData[i].business, {
                    quotes: false,
                    quoteChar: '"',
                    delimiter: ",",
                    header: false,
                    newline: "\r\n"
                });
            }
        }

        scrapedData.length = 0;

        var downloadLink = document.createElement("a");
        var blob = new Blob(["\ufeff", csv]);
        var url = URL.createObjectURL(blob);

        downloadLink.href = url;
        downloadLink.download = "data.csv";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
    ////textarea auto resize
    $('#category').keydown(function(e) {
       var $this = $(this);
       var rows = parseInt($this.attr('rows'));
       var lines;

       // on enter
        if (e.which === 13){
          $this.attr('rows', rows + 1);
        }
        //remove row if empty
        if (e.which === 8 && rows !== 1) {
            lines = $(this).val().split('\n')
            console.log(lines);
            if(!lines[lines.length - 1]) {
                $this.attr('rows', rows - 1);
            }
        }
    });
    //reset row on click
    $('button[type=reset]').on('click',function(){
      $('#category').attr('rows',1);
    });
    //clear alerts from div#alert-area
    $('#clr-alert').click(function(){
      $('#alert-area').empty();
    });
});
